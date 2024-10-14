import { Body, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PlayerDto } from './dto/player-dto';
import { PokemonTypeEntity } from './enums/pokemon-entity-enum';
import { PokemonTeamDto } from './dto/pokemon-team-dto';
import { PokemonDto } from './dto/pokemon-dto';
import { StatsDto } from './dto/stats-dto';
import * as bcrypt from 'bcrypt';
import { HashService } from './hash/hash.service';
import { jwtConstants } from './hash/constants';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';



@Injectable()
export class PokemonApiService {
  [x: string]: any;

  constructor(private prismaService: PrismaService,
    private hashService: HashService,
    private jwtService: JwtService,
  ) { }
  async createPlayer(playerDto: PlayerDto) {
    if (!playerDto.password || playerDto.password === null || playerDto.password === '' || playerDto.password.length < 8
      || !playerDto.email || playerDto.email === null || playerDto.email === ''
      || !playerDto.nickName || playerDto.nickName === null || playerDto.nickName === '' || playerDto.nickName.length < 4) {
      throw new HttpException('Password must be at least 8 characters long, email should be a valid email and nickName must be at least 4 characters long',
        HttpStatus.BAD_REQUEST);
    }
    try {
      const hashedPassword = await this.hashService.getPasswordHash(playerDto.password);
      playerDto.password = hashedPassword
      if (playerDto.wins === undefined) {
        playerDto.wins = 0
      }
      if (playerDto.losses === undefined) {
        playerDto.losses = 0
      }
      if (playerDto.draws === undefined) {
        playerDto.draws = 0
      }
      const createdPlayers = await this.prismaService.player.findMany();
      createdPlayers.forEach(player => {
        if (player.email === playerDto.email) {
          throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
        }
      })
      await this.prismaService.player.create({ data: playerDto })
      return HttpStatus.CREATED
    } catch (error) {
      console.log(error)
    }
  }
  async createTeam(pokemonTeamDto: PokemonTeamDto, auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const player = await this.prismaService.player.findMany({ where: { user_id: userId } });
      if (!player) return
      const data = { ...pokemonTeamDto, user_id: player[0].user_id, playerId: player[0].id }
      const response = await this.prismaService.pokemonTeam.create({ data })
      return { id: response.id, status: HttpStatus.CREATED, message: "New team has been created successfully" }
    } catch (error) {
      console.log(error)
    }
  }
  async createPokemonAndStats(pokemonData: any, auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    const statsDto: StatsDto = pokemonData[1];
    const pokemonDto: PokemonDto = pokemonData[0];
    let createdPokemon: PokemonDto;
    let createdStats: StatsDto;
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { id: pokemonDto.teamId } });
      const dataPokemon = { ...pokemonDto, user_id: teams[0].user_id }
      const dataStats = { ...statsDto, user_id: teams[0].user_id }
      teams.map(team => {
        if (team.user_id !== userId) throw new HttpException('Invalid teamId', HttpStatus.BAD_REQUEST)
      })
      await this.prismaService.$transaction(async (prisma) => {
        const pokemons = await prisma.pokemon.findMany({ where: { teamId: pokemonData[0].teamId } });
        if (pokemons.length >= 5) throw new HttpException('Maximum number of pokemons reached', HttpStatus.BAD_REQUEST)
        createdStats = await prisma.stats.create({ data: dataStats });
        dataPokemon.statsId = createdStats.id;
        createdPokemon = await prisma.pokemon.create({ data: dataPokemon });
      });
    } catch (error) {
      console.log(error);
      return error
    }
    return { pokemonId: createdPokemon.id, statsId: createdStats.id, status: HttpStatus.CREATED, message: "New pokemon has been created successfully" }
  }
  async findAll(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const players = await this.prismaService.player.findMany({ where: { user_id: userId } });
      const data = []
      for (let i = 0; i < players.length; i++) {
        data.push(await this.findOne(players[i].id))
      }
      return { data, status: HttpStatus.OK, message: "Player has been found successfully" }
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

  }

  async findTeamsByUserId(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { user_id: userId } });
      return { teams, status: HttpStatus.OK, message: "Teams has been found successfully" }
    } catch (error) {
      console.log(error)
    }
  }
  async findPokemonsAndHisStatsByUserId(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const pokemons = await this.prismaService.pokemon.findMany({ where: { user_id: userId } });
      const stats = await Promise.all(pokemons.map(async (pokemon) => await this.prismaService.stats.findUnique({ where: { id: pokemon.statsId } })));
      const pokemonsAndStats = pokemons.map((pokemon, index) => ({
        ...pokemon,
        stats: stats[index]
      }));
      return { pokemonsAndStats, status: HttpStatus.OK, message: "Pokemons has been found successfully" }
    } catch (error) {
      console.log(error)
    }
  }

  async findOne(id: number) {
    try {
      const playerData = await this.prismaService.player.findUnique({ where: { id: id } });
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { playerId: id } });
      const pokemonsArray = await Promise.all(teams.map(async (team) => await this.prismaService.pokemon.findMany({ where: { teamId: team.id } })));
      const pokemonsData = pokemonsArray.flat(); // Aplanar el array de arrays
      const stats = await Promise.all(pokemonsData.map(async (pokemon) => await this.prismaService.stats.findUnique({ where: { id: pokemon.statsId } })));
      if (!playerData) {
        throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      }
      const pokemon = pokemonsData.map((poke, index) => ({
        ...poke,
        stats: stats[index]
      }));
      const teamsPokemon = teams.map(team => ({
        ...team,
        pokemons: pokemon.filter(poke => poke.teamId === team.id)
      }));
      const player = [];
      const { password, email, ...playerDataWithoutPassword } = playerData;
      player.push({
        ...playerDataWithoutPassword,
        teams: teamsPokemon
      })
      return { player };
    } catch (error) {
      console.log(error);
      if (error.status === 404) {
        throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async findOneByEmail(email: string, password: string) {
    try {
      const playerData = await this.prismaService.player.findUnique({ where: { email } });
      const isMatch = await bcrypt.compare(password, playerData.password);
      if (isMatch) {
        return playerData;
      }
      return
    }
    catch (error) { return error }
  }

  async updateAll(id: number, playerDto: any, pokemonEntity: PokemonTypeEntity, auth: string, res: Response) {
    const userId = await this.extractUserIdFromToken(auth);
    try {
      switch (pokemonEntity) {
        case 'player': {
          const player = await this.prismaService.player.findMany({ where: { user_id: userId } });
          if (!player) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not Found' });
          if (player[0].id !== id) return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Invalid id' });
          await this.prismaService.player.update({ where: { id: id }, data: playerDto });
          return res.status(HttpStatus.OK).json({ message: "Updated successfully" });
        }
        case 'team': {
          const teams = await this.prismaService.pokemonTeam.findMany({ where: { user_id: userId } });
          if (!teams) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not Found' });
          for (const team of teams) {
            if (team.id === id) {
              await this.prismaService.pokemonTeam.update({ where: { id: id }, data: playerDto });
              return res.status(HttpStatus.OK).json({ message: "Updated successfully" });
            }
          }
          return res.status(HttpStatus.NOT_FOUND).json({ message: 'Team not found' });
        }
        case 'pokemon': {
          const pokemons = await this.prismaService.pokemon.findMany({ where: { user_id: userId } });
          if (!pokemons) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not Found' });
          for (const pokemon of pokemons) {
            if (pokemon.id === id) {
              await this.prismaService.pokemon.update({ where: { id: id }, data: playerDto });
              return res.status(HttpStatus.OK).json({ message: "Updated successfully" });
            }
          }
          return res.status(HttpStatus.NOT_FOUND).json({ message: 'Pokemon not found' });
        }
        case 'stats': {
          const stats = await this.prismaService.stats.findMany({ where: { user_id: userId } });
          if (!stats) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not Found' });
          for (const stat of stats) {
            if (stat.id === id) {
              await this.prismaService.stats.update({ where: { id: id }, data: playerDto });
              return res.status(HttpStatus.OK).json({ message: "Updated successfully" });
            }
          }
          return res.status(HttpStatus.NOT_FOUND).json({ message: 'Stats not found' });
        }
        default:
          return res.status(HttpStatus.BAD_REQUEST).json({ message: "Invalid pokemonEntity. Possible values are: 'player', 'team', 'pokemon', or 'stats'" });
      }
    } catch (error) {
      console.log(error);
      if (error.message.includes("Invalid pokemonEntity")) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
      }
      if (error.name === "PrismaClientValidationError") {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({ message: 'Invalid data' });
      }
      if (error.name === "PrismaClientKnownRequestError") {
        return res.status(HttpStatus.NOT_FOUND).json({ message: 'Record to update not found.' });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
    }
  }

  async removePokemonTeam(id: number, auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      await this.prismaService.$transaction(async (prisma) => {
        // Eliminar todos los Pokémon del equipo
        const pokemons = await prisma.pokemon.findMany({
          where: {
            teamId: id,
            user_id: userId
          },
        });
        // Eliminar los Pokémon primero
        await prisma.pokemon.deleteMany({
          where: {
            teamId: id,
            user_id: userId
          },
        });
        // Luego eliminar las estadísticas asociadas
        await Promise.all(pokemons.map(async (pokemon) => {
          await prisma.stats.delete({
            where: {
              id: pokemon.statsId,
              user_id: userId
            },
          });
        }));
        // Finalmente, eliminar el equipo de Pokémon
        await prisma.pokemonTeam.delete({
          where: {
            id: id,
          },
        });
      });
    } catch (error) {
      console.log(error);
      if (error.code === 'P2003') {
        throw new HttpException('Foreign key constraint failed', HttpStatus.BAD_REQUEST);
      } else if (error.name === "PrismaClientKnownRequestError") {
        throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async removePlayer(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({
        where: {
          user_id: userId,
        },
      });
      await Promise.all(teams.map(async (team) => {
        await this.removePokemonTeam(team.id, auth);
      }));
      await this.prismaService.player.deleteMany({
        where: {
          user_id: userId
        },
      });
      return { status: HttpStatus.OK, message: "Player has been deleted successfully" }
    } catch (error) {
      console.log(error)
      if (error.code === 'P2003') throw new HttpException('Foreign key constraint failed', HttpStatus.BAD_REQUEST);
      if (error.name === "PrismaClientKnownRequestError") throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      return error
    }

  }

  async removePokemon(id: number, auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    await this.prismaService.$transaction(async (prisma) => {
      const pokemon = await prisma.pokemon.delete({
        where: {
          id: id,
          user_id: userId
        },
      });
      await prisma.stats.delete({
        where: {
          id: pokemon.statsId,
          user_id: userId
        },
      });
    });
  }

  async extractUserIdFromToken(token: string): Promise<string> {
    const authToken = token.split(' ')[1]
    try {
      const payload = await this.jwtService.verifyAsync(
        authToken,
        {
          secret: jwtConstants.secret
        }
      );
      return payload.sub2
    } catch {
      throw new UnauthorizedException();
    }

  }

}

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
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



@Injectable()
export class PokemonApiService {
  [x: string]: any;

  constructor(private prismaService: PrismaService,
    private hashService: HashService,
    private jwtService: JwtService,
  ) { }
  async createPlayer(playerDto: PlayerDto) {
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
    } catch (error) {
      console.log(error)
    }
  }
  async createTeam(pokemonTeamDto: PokemonTeamDto) {
    try {
      const player = await this.prismaService.player.findUnique({ where: { id: pokemonTeamDto.playerId } });
      if (!player) return
      const data = { ...pokemonTeamDto, user_id: player.user_id }
      await this.prismaService.pokemonTeam.create({ data })
    } catch (error) {
      console.log(error)
    }
  }
  async createPokemonAndStats(pokemonData: any) {
    const statsDto: StatsDto = pokemonData[1];
    const pokemonDto: PokemonDto = pokemonData[0];
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { playerId: pokemonDto.id } });
      const dataPokemon = { ...pokemonDto, user_id: teams[0].user_id }
      const dataStats = { ...statsDto, user_id: teams[0].user_id }
      await this.prismaService.$transaction(async (prisma) => {
        const pokemons = await prisma.pokemon.findMany({ where: { teamId: pokemonData[0].teamId } });
        if (pokemons.length >= 5) throw new HttpException('Maximum number of pokemons reached', HttpStatus.BAD_REQUEST)
        const createdStats = await prisma.stats.create({ data: dataStats });
        dataPokemon.statsId = createdStats.id;
        await prisma.pokemon.create({ data: dataPokemon });
      });
    } catch (error) {
      console.log(error);
    }
  }
  async findAll(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const players = await this.prismaService.player.findMany({ where: { user_id: userId } });
      const data = []
      for (let i = 0; i < players.length; i++) {
        data.push(await this.findOne(players[i].id))
      }
      return data
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

  }

  async findTeamsByUserId(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { user_id: userId } });
      return teams
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
      return pokemonsAndStats
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
  async updateAll(id: number, playerDto: any, pokemonEntity: PokemonTypeEntity) {
    try {
      switch (pokemonEntity) {
        case 'player': {
          await this.prismaService.player.update({ where: { id: id }, data: playerDto });
          break;
        }
        case 'team': {
          await this.prismaService.pokemonTeam.update({ where: { id: id }, data: playerDto });
          break;
        }
        case 'pokemon': {
          await this.prismaService.pokemon.update({ where: { id: id }, data: playerDto });
          break;
        }
        case 'stats': {
          await this.prismaService.stats.update({ where: { id: id }, data: playerDto });
          break;
        }
        default:
          throw new Error("Invalid pokemonEntity. Possible values are: 'player', 'team', 'pokemon', or 'stats'");
      }
    } catch (error) {
      console.log(error);
      if (error.message.includes("Invalid pokemonEntity")) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      if (error.name === "PrismaClientValidationError") {
        throw new HttpException('Invalid data', HttpStatus.UNPROCESSABLE_ENTITY);
      }
      if (error.name === "PrismaClientKnownRequestError") {
        throw new HttpException('Record to update not found.', HttpStatus.NOT_FOUND);
      }
      return error;
    }
  }

  async removePokemonTeam(id: number) {
    try {
      await this.prismaService.$transaction(async (prisma) => {
        // Eliminar todos los Pokémon del equipo
        const pokemons = await prisma.pokemon.findMany({
          where: {
            teamId: id,
          },
        });
        // Eliminar los Pokémon primero
        await prisma.pokemon.deleteMany({
          where: {
            teamId: id,
          },
        });
        // Luego eliminar las estadísticas asociadas
        await Promise.all(pokemons.map(async (pokemon) => {
          await prisma.stats.delete({
            where: {
              id: pokemon.statsId,
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

  async removePlayer(id: number) {
    try {
      const teams = await this.prismaService.pokemonTeam.findMany({
        where: {
          playerId: id,
        },
      });
      await Promise.all(teams.map(async (team) => {
        await this.removePokemonTeam(team.id);
      }));

      await this.prismaService.player.delete({
        where: {
          id: id,
        },
      });
    } catch (error) {
      console.log(error)
      if (error.code === 'P2003') throw new HttpException('Foreign key constraint failed', HttpStatus.BAD_REQUEST);
      if (error.name === "PrismaClientKnownRequestError") throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      return error
    }

  }

  async removePokemon(id: number) {
    await this.prismaService.$transaction(async (prisma) => {
      const pokemon = await prisma.pokemon.delete({
        where: {
          id: id,
        },
      });
      await prisma.stats.delete({
        where: {
          id: pokemon.statsId,
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
      //console.log(payload)
      return payload.sub2
    } catch {
      throw new UnauthorizedException();
    }

  }

}

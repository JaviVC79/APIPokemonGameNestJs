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
import { ResponseBodyPlayerData } from './dto/player-data-response';
import { AuthService } from './authUser.service';
import { Player } from '@prisma/client';
import { SendMailService } from './send-mail.service';


@Injectable()
export class PokemonApiService {
  [x: string]: any;

  constructor(private prismaService: PrismaService,
    private hashService: HashService,
    private jwtService: JwtService,
    private authService: AuthService,
    private sendMailService: SendMailService,
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
      const newPlayer = await this.prismaService.player.create({ data: playerDto });
      if (newPlayer.user_id) {
        await this.sendMailService.sendEmail(playerDto.email, newPlayer.user_id, newPlayer.nickName)
      } else { throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR); };
      return newPlayer;
    } catch (error) {
      console.log(error)
    }
  }

  async createTeam(pokemonTeamDto: PokemonTeamDto, auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const player = await this.prismaService.player.findMany({ where: { user_id: userId } });
      if (!player) return
      const data = { ...pokemonTeamDto, user_id: player[0].user_id, playerId: player[0].id };
      const newTeam = await this.prismaService.pokemonTeam.create({ data });
      return newTeam;
    } catch (error) {
      console.log(error)
      return error;
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
    if (userId != "33316be8-790c-47fd-b8c5-f6aafa7bb00a") throw new UnauthorizedException();
    try {
      const players = await this.prismaService.player.findMany();
      const data = []
      for (let i = 0; i < players.length; i++) {
        data.push(await this.findAllPlayersData(players[i].user_id))
      }
      return { data, status: HttpStatus.OK, message: "Player has been found successfully" }
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }

  }

  async findAllPlayersData(userId: string) {
    try {
      const playerData = await this.prismaService.player.findMany({ where: { user_id: userId } });
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { user_id: userId } });
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
      const player: ResponseBodyPlayerData[] = [];
      const playerModificated: any = playerData;
      const { password, email, ...playerDataWithoutPassword } = playerModificated;
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

  async findOne(auth: string) {
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const playerData = await this.prismaService.player.findMany({ where: { user_id: userId } });
      const teams = await this.prismaService.pokemonTeam.findMany({ where: { user_id: userId } });
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
      const player: ResponseBodyPlayerData[] = [];
      const playerModificated: any = playerData;
      const { password, email, ...playerDataWithoutPassword } = playerModificated;
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
      if (!playerData) return
      const isMatch = await bcrypt.compare(password, playerData.password);
      if (isMatch) {
        return playerData;
      }
      return
    }
    catch (error) {
      return error
    }
  }

  async findOneByUserId(user_id: string) {
    try {
      const playerData = await this.prismaService.player.findFirst({ where: { user_id } });
      if (!playerData) return
      return playerData;
    }
    catch (error) {
      return error
    }
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
        //Modificar o Eliminar el registro en la tabla Games
        const gamesInFirst = await this.prismaService.game.findMany({
          where: { player1TeamId: id }
        });
        const gamesInSecond = await this.prismaService.game.findMany({
          where: { player2TeamId: id }
        });
        if (gamesInFirst.length > 0) {
          await this.prismaService.game.delete({
            where: { id: gamesInFirst[0].id }
          });

          await this.prismaService.game.create({
            data: { player1TeamId: gamesInFirst[0].player2TeamId, user_id1: gamesInFirst[0].user_id2, player2TeamId: null, user_id2: null, turn_user_id: gamesInFirst[0].user_id2 }
          });
        }
        if (gamesInSecond.length > 0) {
          await this.prismaService.game.update({
            where: { id: gamesInSecond[0].id },
            data: { player2TeamId: null, user_id2: null }
          });
        }


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

  private async extractUserIdFromToken(token: string): Promise<string> {
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

  async emailVerificationByUserId(user_id: string) {
    const player: Player = await this.prismaService.player.findFirst({ where: { user_id } });
    if (!player) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    const verifiedPlayer = await this.prismaService.player.update({ where: { id: player.id }, data: { verify_email: true } });
    if (!verifiedPlayer) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    await this.sendMailService.sendEmailVerificationOK(verifiedPlayer.email, verifiedPlayer.nickName);
    return verifiedPlayer;
  }

  async login(user: any) {
    try {
      const userJwt = await this.authService.signIn(user);
      const SearchUser = await this.findOneByEmail(user.email, user.password);
      const user_id = SearchUser.user_id;
      const loginResponse = { access_token: userJwt.access_token, user_id: user_id, email: user.email };
      return loginResponse;
    } catch (e) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  /*async newPassword(email: string) {
    const password = this.generatePassword(12);
    try {
      const hashedPassword = await this.hashService.getPasswordHash(password);
      //return hashedPassword
      await this.prismaService.player.update({ where: { email }, data: { password: hashedPassword } });
      await this.sendMailService.sendNewPassword(email, password)
    } catch (error) {
      return error
    }
  }*/

  /*private generatePassword(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      const index = Math.floor(Math.random() * characters.length);
      password += characters[index];
    }
    return password;
  }*/

  async getNewPassword(userData: { email: string, password: string }) {
    try {
      const registeredUser = await this.prismaService.player.findFirst({ where: { email: userData.email } });
      if (!registeredUser) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
      if (registeredUser.verify_email === false) throw new HttpException('Email not verified', HttpStatus.BAD_REQUEST);
      await this.sendMailService.sendNewPassword(userData.email, userData.password, registeredUser.user_id)
      return { status: HttpStatus.OK, message: "Verification email sent successfully" }
    } catch (error) {
      return error
    }
  }

  async confirmNewPassword(user_id: string, newPassword: string) {
    try {
      const hashedPassword = await this.hashService.getPasswordHash(newPassword);
      await this.prismaService.player.updateMany({ where: { user_id }, data: { password: hashedPassword } });
      const user = await this.prismaService.player.findFirst({ where: { user_id } });
      await this.sendMailService.sendChangePasswordVerification(user);
      return { status: HttpStatus.OK, message: "Password updated successfully" }
    } catch (error) {
      return error
    }
  }



  /*async findPokemonsAndHisStatsByUserIdAndTeams(auth:string, team:string){
    const userId = await this.extractUserIdFromToken(auth)
    try {
      const pokemons = await this.prismaService.pokemon.findMany({ where: { user_id: userId, teamId: parseInt(team) } });
      const stats = await Promise.all(pokemons.map(async (pokemon) => await this.prismaService.stats.findUnique({ where: { id: pokemon.statsId } })));
      const pokemonsAndStats = pokemons.map((pokemon, index) => ({
        ...pokemon,
        stats: stats[index]
      }));
      return { pokemonsAndStats, status: HttpStatus.OK, message: "Pokemons has been found successfully" }
    } catch (error) {
      console.log(error)
    }
  }*/

}

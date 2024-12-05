import { HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from './prisma.service';
import { HashService } from "./hash/hash.service";
import { JwtService } from "@nestjs/jwt";
import { Game } from "@prisma/client";
import { jwtConstants } from "./hash/constants";
import { UUIDTypes, v4 as uuidv4 } from 'uuid';
import { log } from "console";


export interface GameState {
    id: number;
    player1TeamId: number | null;
    player2TeamId: number | null;
    winnerId: number | null;
    user_id1: string | null;
    user_id2: string | null;
}

@Injectable()
export class GameService {

    constructor(private prismaService: PrismaService,
        private hashService: HashService,
        private jwtService: JwtService,
    ) { }

    async extractUserIdFromEmail(email: string) {
        const user = await this.prismaService.player.findFirst({ where: { email: email } })
        return user.user_id
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

    async startGame(playersId: Partial<Game>, auth: string) {
        //console.log("En gameservice",playersId)
        const userId = await this.extractUserIdFromToken(auth)
        //console.log(userId)
        try {
            const players = await this.prismaService.game.findMany();
            const awaitingPlayers = players.filter((file) => file.player2TeamId == null)
            const firtsFile = awaitingPlayers[0]
            const playerGames = await this.prismaService.game.findMany({ where: { OR: [{ user_id1: userId }, { user_id2: userId }] } });
            //console.log(playerGames)
            if (playerGames.length > 0) {
                //console.log("you already have a started game")
                return { status: HttpStatus.BAD_REQUEST, message: "you already have a started game", gameId: playerGames[0].id }
            }
            if (awaitingPlayers.length == 0 || firtsFile.user_id1 == userId) {
                const newGame = await this.prismaService.game.create({ data: { player1TeamId: playersId.player1TeamId, user_id1: userId, turn_user_id: userId } });
                return { status: HttpStatus.CREATED, message: "waiting for another player, check later please", gameId: newGame.id }
            }


            const data = await this.prismaService.game.update({
                where: { id: awaitingPlayers[0].id }, data: {
                    player1TeamId: awaitingPlayers[0].player1TeamId,
                    player2TeamId: playersId.player1TeamId,
                    user_id1: awaitingPlayers[0].user_id1,
                    user_id2: userId,
                }
            })
            //const newTurn = await this.prismaService.turn.create({ data: { gameId: awaitingPlayers[0].id, playerId: awaitingPlayers[0].player1TeamId, action: "start", turnNumber: 1 } })
            return { status: HttpStatus.CREATED, message: "game started", gameId: data.id }
        } catch (error) {
            console.log(error)
            return error
        }
    }

    async getGamesByUser(auth: string) {
        try {
            const userId = await this.extractUserIdFromToken(auth)
            const gamesOnUserIsUser1 = await this.prismaService.game.findMany({ where: { user_id1: userId } });
            const gamesOnUserIsUser2 = await this.prismaService.game.findMany({ where: { user_id2: userId } });
            const games = gamesOnUserIsUser1.concat(gamesOnUserIsUser2)
            return games
        } catch (error) {
            console.log(error)
            return error
        }

    }
    isValidUUID(uuid: UUIDTypes): boolean { const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; return regex.test(uuid.toString()); }
    async findGameByUser(userId: UUIDTypes) {
        // Verificar que el userId sea un UUID válido 
        //console.log(userId)
        if (!this.isValidUUID(userId)) { throw new Error('Invalid UUID format'); }
        return await this.prismaService.game.findFirst({ where: { OR: [{ user_id1: userId.toString() }, { user_id2: userId.toString() }] } });
    }

    private games: Map<string, GameState> = new Map();
    private waitingPlayers: string[] = [];

    saveGameState(room: string, state: GameState) {
        this.games.set(room, state);
    }

    getGameState(room: string): GameState | undefined {
        return this.games.get(room);
    }

    addWaitingPlayer(playerId: string) {
        this.waitingPlayers.push(playerId);
    }

    getWaitingPlayer(): string | undefined {
        return this.waitingPlayers.shift();
    }
    async attack(gameId: any, pokemon: any) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        if (turn !== pokemon.user_id) {
            console.log("It's not your turn")
            return "It's not your turn"
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })
        const probabilityPokemon = this.probabilisticEvent(playerPokemonStats.speed + playerPokemonStats.attack - opponentPokemonStats.defense - opponentPokemonStats.speed);
        if (!probabilityPokemon) {
            console.log("Your opponent has attacked you, but you you have dodged the attack.")
            return { message: "Your opponent has attacked you, but you you have dodged the attack." }
        }
        const newHpPokemonAttacked = Math.round(opponentPokemonStats.hp - (playerPokemonStats.attack - (opponentPokemonStats.defense / 2)))
        if (newHpPokemonAttacked >= opponentPokemonStats.hp) {
            console.log("Your opponent has attacked you, but you have not taken any damage.")
            return { message: "Your opponent has attacked you, but you have not taken any damage." }
        }
        if (newHpPokemonAttacked < opponentPokemonStats.hp) {
            const updatedStats = await this.prismaService.stats.update({ where: { id: opponentPokemon.statsId }, data: { hp: newHpPokemonAttacked } })
            if (updatedStats.hp > 0) {
                console.log({
                    message: `Your opponent has attacked you, and you take ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage. 
                    Your remaining HP is ${updatedStats.hp}`,
                    damage: Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2)),
                    hp: updatedStats.hp,
                    pokemon: { pokemon: opponentPokemon, stats: updatedStats }
                })
                return {
                    message: `Your opponent has attacked you, and you take ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage. 
                    Your remaining HP is ${updatedStats.hp}`,
                    damage: Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2)),
                    hp: updatedStats.hp,
                    pokemon: { pokemon: opponentPokemon, stats: updatedStats }
                }
            } else {
                await this.prismaService.$transaction(async (prisma) => {
                    await prisma.pokemon.delete({ where: { id: opponentPokemon.id } })
                    await prisma.stats.delete({ where: { id: opponentPokemon.statsId } })
                })
            }
            const pokemonsTeamAttacked = await this.prismaService.pokemon.findMany({ where: { teamId: opponentPokemon.teamId } })
            if (pokemonsTeamAttacked.length === 0) {
                await this.prismaService.pokemonTeam.delete({ where: { id: opponentPokemon.teamId } })
                await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { winnerId: playerPokemon.teamId } })
                console.log({ message: "Your last pokemon has been defeated, you have lost the game" })
                return { message: "Your last pokemon has been defeated, you have lost the game" }
            } else {
                console.log({ message: "Your pokemon has been defeated" })
                return { message: "Your pokemon has been defeated" }
            }
        }
    }

    private async getPokemonsCombatData(gameId: any, pokemon: any) {
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } });
        const user_id_player = pokemon.user_id
        const user_id_opponent = user_id_player == game.user_id1 ? game.user_id2 : game.user_id1;
        const team_opponent = user_id_player == game.user_id1 ? game.player2TeamId : game.player1TeamId;
        const opponentPokemon = await this.prismaService.pokemon.findFirst({ where: { user_id: user_id_opponent, teamId: team_opponent } });
        const opponentPokemonStats = await this.prismaService.stats.findFirst({ where: { id: opponentPokemon.statsId } });
        const playerPokemonStats = await this.prismaService.stats.findFirst({ where: { id: pokemon.statsId } });
        return { opponentPokemon, opponentPokemonStats, playerPokemon: pokemon, playerPokemonStats }
    }

    private probabilisticEvent(probability: number): boolean {
        const randomValue = Math.random();
        return randomValue < Math.abs(probability);
    }

    async defense(gameId: any, pokemon: any) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        if (turn !== pokemon.user_id) {
            console.log("It's not your turn")
            return { playerMessage: { message: "It's not your turn" } }
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })
        const probabilityPokemon = this.probabilisticEvent(playerPokemonStats.speed + playerPokemonStats.defense - opponentPokemonStats.attack - opponentPokemonStats.speed);
        if (!probabilityPokemon) {
            console.log("Your opponent is tired; he cannot defend himself effectively against your Pokémon.")
            return {
                opponentMessage: { message: "Your opponent is tired; he cannot defend himself effectively against your Pokémon." }
                ,
                playerMessage: {
                    message: "You are too tired, your defense is not effective."
                }
            }
        }
        const newHpPokemonDefended = Math.round(playerPokemonStats.hp + (playerPokemonStats.defense / 2))
        const updatedStats = await this.prismaService.stats.update({ where: { id: playerPokemon.statsId }, data: { hp: newHpPokemonDefended } })
        return {
            opponentMessage: {
                message: `Your opponent defense is already effective. 
        His remaining HP is ${updatedStats.hp}`
            }
            ,
            playerMessage: {
                message: `Your defense is already effective. 
        Your remaining HP is ${updatedStats.hp}`
            }
        }
    }
}

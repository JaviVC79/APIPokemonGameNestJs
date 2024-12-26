import { HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from './prisma.service';
import { HashService } from "./hash/hash.service";
import { JwtService } from "@nestjs/jwt";
import { Game, Pokemon } from "@prisma/client";
import { jwtConstants } from "./hash/constants";
import { UUIDTypes, v4 as uuidv4 } from 'uuid';

type PokemonType =
    'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' |
    'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

const typeEffectiveness: { [key in PokemonType]: { [key in PokemonType]?: number } } = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

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

    async startGame(playersId: Partial<Game>, auth: string) {
        const userId = await this.extractUserIdFromToken(auth)
        try {
            const players = await this.prismaService.game.findMany();
            const awaitingPlayers = players.filter((file) => file.player2TeamId == null)
            const firtsFile = awaitingPlayers[0]
            const playerGames = await this.prismaService.game.findMany({ where: { OR: [{ user_id1: userId }, { user_id2: userId }], winnerId: null } });
            if (playerGames.length > 0) {
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
            return { status: HttpStatus.CREATED, message: "game started", gameId: data.id }
        } catch (error) {
            console.log(error)
            return error
        }
    }

    async getGamesByUser(auth: string) {
        try {
            const userId = await this.extractUserIdFromToken(auth)
            const gamesOnUserIsUser1 = await this.prismaService.game.findMany({ where: { user_id1: userId, winnerId: null } });
            const gamesOnUserIsUser2 = await this.prismaService.game.findMany({ where: { user_id2: userId, winnerId: null } });
            const games = gamesOnUserIsUser1.concat(gamesOnUserIsUser2)
            return games
        } catch (error) {
            console.log(error)
            return error
        }

    }

    isValidUUID(uuid: UUIDTypes): boolean { const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; return regex.test(uuid.toString()); }

    async findGameByUser(userId: UUIDTypes) {
        if (!this.isValidUUID(userId)) { throw new Error('Invalid UUID format'); }
        return await this.prismaService.game.findFirst({ where: { OR: [{ user_id1: userId.toString() }, { user_id2: userId.toString() }], winnerId: null } });
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

    getEffectiveness(playerPokemonType: PokemonType, opponentPokemonType: PokemonType): number {
        return typeEffectiveness[playerPokemonType][opponentPokemonType] ?? 1;
    }

    getPokemonTypes(pokemon: Pokemon): PokemonType[] {
        return pokemon.types.split(",") as PokemonType[]
    }

    getTotalEffectiveness(playerPokemon: Pokemon, opponentPokemon: Pokemon) {
        const playerPokemonTypes = this.getPokemonTypes(playerPokemon);
        const opponentPokemonTypes = this.getPokemonTypes(opponentPokemon);
        let effectiveness = 0;
        let unitaryEffectiveness: number;
        for (let i = 0; i < playerPokemonTypes.length; i++) {
            for (let j = 0; j < opponentPokemonTypes.length; j++) {
                unitaryEffectiveness = this.getEffectiveness(playerPokemonTypes[i], opponentPokemonTypes[j]);
            }
            if (unitaryEffectiveness > effectiveness) {
                effectiveness = unitaryEffectiveness
            }
            return effectiveness;
        }
    }
    async specialPoints(auth: string) {
        try {
            const userId = await this.extractUserIdFromToken(auth)
            const specialPoints = await this.prismaService.specialPoints.findFirst({ where: { user_id: userId } })
            return specialPoints
        } catch (error) {
            console.log(error)
            return error
        }
    }

    async attack(gameId: any, pokemon: any) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const specialPoints = await this.prismaService.specialPoints.findFirst({ where: { user_id: pokemon.user_id } })
        if (!specialPoints) {
            await this.prismaService.specialPoints.create({ data: { user_id: pokemon.user_id, specialDefensePoints: 0, specialAttackPoints: 0 } })
        }
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        if (turn !== pokemon.user_id) {
            return { playerMessage: { message: "It's not your turn" } }
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })
        const probabilityPokemon = this.probabilisticEvent(playerPokemonStats.speed + playerPokemonStats.attack - opponentPokemonStats.defense - opponentPokemonStats.speed);
        if (!probabilityPokemon) {
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: "Your opponent has attacked you, but you have dodged the attack." }
                ,
                playerMessage: {
                    message: "Your attack is not effective."
                }
            }
        }
        const attackEffectiveness = this.getTotalEffectiveness(playerPokemon, opponentPokemon)
        const newHpPokemonAttacked = Math.round(attackEffectiveness * (opponentPokemonStats.hp - (playerPokemonStats.attack - (opponentPokemonStats.defense / 2))))
        if (!probabilityPokemon) {
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: "Your opponent has attacked you, but you have not taken any damage." }
                ,
                playerMessage: {
                    message: "Your attack is not effective."
                }
            }
        }
        if (opponentPokemonStats.hp > 0) {
            const updatedStats = await this.prismaService.stats.update({ where: { id: opponentPokemon.statsId }, data: { hp: newHpPokemonAttacked } })
            if (updatedStats.hp > 0) {
                await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialAttackPoints: { increment: 1 } } })
                return {
                    pokemon: playerPokemon,
                    opponentMessage: {
                        message: `Your opponent has attacked you, and you take ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage. 
                    Your remaining HP is ${updatedStats.hp}`,
                        damage: Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2)),
                        hp: updatedStats.hp,
                        pokemon: { pokemon: opponentPokemon, stats: updatedStats }
                    }
                    ,
                    playerMessage: {
                        message: `Your attacked is effective, and you caused ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage`
                    }
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
                await this.prismaService.player.updateMany({ where: { user_id: playerPokemon.user_id }, data: { wins: { increment: 1 } } })
                const winnerData = await this.prismaService.player.findFirst({ where: { user_id: playerPokemon.user_id } })
                await this.prismaService.player.updateMany({ where: { user_id: opponentPokemon.user_id }, data: { losses: { increment: 1 } } })
                await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { winnerId: winnerData.id } })
                return {
                    pokemon: playerPokemon,
                    opponentMessage: { message: "Your last pokemon has been defeated, you have lost the game" }
                    ,
                    playerMessage: {
                        message: "You have been defeated last opponent pokemon, you have win the game"
                    }
                }
            } else {
                return {
                    pokemon: playerPokemon,
                    opponentMessage: { message: "Your pokemon has been defeated" }
                    ,
                    playerMessage: {
                        message: "You have been defeated opponent pokemon"
                    }
                }
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
        const absoluteProbability = Math.abs(probability)
        let finalProbability: number;
        if (absoluteProbability < 0) {
            finalProbability = absoluteProbability / Math.pow(10, absoluteProbability.toString().split('.')[1].length)
        } else {
            finalProbability = absoluteProbability / Math.pow(10, absoluteProbability.toString().length)
        }
        if (finalProbability < 0.4) return true;
        return randomValue < finalProbability;
    }

    async defense(gameId: any, pokemon: any) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const specialPoints = await this.prismaService.specialPoints.findFirst({ where: { user_id: pokemon.user_id } })
        if (!specialPoints) {
            await this.prismaService.specialPoints.create({ data: { user_id: pokemon.user_id, specialDefensePoints: 0, specialAttackPoints: 0 } })
        }
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        console.log(turn)
        if (turn !== pokemon.user_id) {
            console.log("It's not your turn")
            return { playerMessage: { message: "It's not your turn" } }
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })
        const probabilityPokemon = this.probabilisticEvent(playerPokemonStats.speed + playerPokemonStats.defense - opponentPokemonStats.attack - opponentPokemonStats.speed);
        if (!probabilityPokemon) {
            console.log("Your opponent is tired; he cannot defend himself effectively against your Pokémon.")
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: "Your opponent is tired; he cannot defend himself effectively against your Pokémon." }
                ,
                playerMessage: {
                    message: "You are too tired, your defense is not effective."
                }
            }
        }
        const newHpPokemonDefended = Math.round(playerPokemonStats.hp + (playerPokemonStats.defense / 2))
        const updatedStats = await this.prismaService.stats.update({ where: { id: playerPokemon.statsId }, data: { hp: newHpPokemonDefended } })
        await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialDefensePoints: { increment: 1 } } })
        const specialPointsPlayer = await this.prismaService.specialPoints.findFirst({ where: { user_id: pokemon.user_id } })
        return {
            pokemon: playerPokemon,
            opponentMessage: {
                message: `Your opponent defense is already effective. 
        His remaining HP is ${updatedStats.hp}`
            }
            ,
            playerMessage: {
                specialPointsPlayer: specialPointsPlayer,
                message: `Your defense is already effective. 
        Your remaining HP is ${updatedStats.hp}`
            }
        }
    }

    async attackAllYourEnemies(gameId: string, pokemon: Pokemon) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        if (turn !== pokemon.user_id) {
            return { playerMessage: { message: "It's not your turn" } }
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })

        const attackedPokemons = await this.prismaService.pokemon.findMany({ where: { teamId: opponentPokemon.teamId } })

        const updatedStats = await Promise.all(attackedPokemons.map(async (enemyPokemon) => {
            const enemyActualStats = await this.prismaService.stats.findFirst({ where: { id: enemyPokemon.statsId } })
            const newHpPokemonAttacked = Math.round(enemyActualStats.hp - (playerPokemonStats.specialAttack))
            return await this.prismaService.stats.update({ where: { id: enemyPokemon.statsId }, data: { hp: newHpPokemonAttacked } })
        }))
        await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialAttackPoints: { decrement: 10 } } })

        for (const enemyPokemonStats of updatedStats) {
            if (enemyPokemonStats.hp < 0) {
                await this.prismaService.$transaction(async (prisma) => {
                    for (const attackedPokemon of attackedPokemons) {
                        if (attackedPokemon.statsId === enemyPokemonStats.id) {
                            await prisma.pokemon.delete({ where: { id: attackedPokemon.id } });
                            await prisma.stats.delete({ where: { id: enemyPokemonStats.id } });
                        }
                    }
                });
            }
        }

        const pokemonsTeamAttacked = await this.prismaService.pokemon.findMany({ where: { teamId: opponentPokemon.teamId } })
        if (pokemonsTeamAttacked.length === 0) {
            await this.prismaService.specialPoints.deleteMany({ where: { user_id: opponentPokemon.user_id } })
            await this.prismaService.pokemonTeam.delete({ where: { id: opponentPokemon.teamId } })
            await this.prismaService.player.updateMany({ where: { user_id: playerPokemon.user_id }, data: { wins: { increment: 1 } } })
            const winnerData = await this.prismaService.player.findFirst({ where: { user_id: playerPokemon.user_id } })
            await this.prismaService.player.updateMany({ where: { user_id: opponentPokemon.user_id }, data: { losses: { increment: 1 } } })
            await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { winnerId: winnerData.id } })
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: "Your last pokemon has been defeated, you have lost the game" }
                ,
                playerMessage: {
                    message: "You have been defeated last opponent pokemon, you have win the game"
                }
            }
        } else if (pokemonsTeamAttacked.length < attackedPokemons.length) {
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: `Your enemy has been defeated ${attackedPokemons.length - pokemonsTeamAttacked.length} pokemon` }
                ,
                playerMessage: {
                    message: `You have been defeated ${attackedPokemons.length - pokemonsTeamAttacked.length} opponent pokemon`
                }
            }
        } else {
            return {
                pokemon: playerPokemon,
                opponentMessage: { message: "Your pokemons have been attacked" }
                ,
                playerMessage: {
                    message: "Your attack have been effective"
                }
            }
        }
    }

    async specialAttack(gameId: string, pokemon: Pokemon) {
        const {
            opponentPokemon,
            opponentPokemonStats,
            playerPokemon,
            playerPokemonStats
        } = await this.getPokemonsCombatData(gameId, pokemon);
        const game = await this.prismaService.game.findUnique({ where: { id: parseInt(gameId) } })
        const turn = game.turn_user_id
        if (turn !== pokemon.user_id) {
            return { playerMessage: { message: "It's not your turn" } }
        }
        await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { turn_user_id: opponentPokemon.user_id } })
        const newHpPokemonAttacked = Math.round(opponentPokemonStats.hp - (playerPokemonStats.attack * 2))
        await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialAttackPoints: { decrement: 10 } } })
        if (opponentPokemonStats.hp > 0) {
            const updatedStats = await this.prismaService.stats.update({ where: { id: opponentPokemon.statsId }, data: { hp: newHpPokemonAttacked } })
            if (updatedStats.hp > 0) {
                return {
                    pokemon: playerPokemon,
                    opponentMessage: {
                        message: `Your opponent has attacked you, and you take ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage. 
                    Your remaining HP is ${updatedStats.hp}`,
                        damage: Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2)),
                        hp: updatedStats.hp,
                        pokemon: { pokemon: opponentPokemon, stats: updatedStats }
                    }
                    ,
                    playerMessage: {
                        message: `Your attacked is effective, and you caused ${Math.round(playerPokemonStats.attack - (opponentPokemonStats.defense / 2))} damage`
                    }
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
                await this.prismaService.player.updateMany({ where: { user_id: playerPokemon.user_id }, data: { wins: { increment: 1 } } })
                const winnerData = await this.prismaService.player.findFirst({ where: { user_id: playerPokemon.user_id } })
                await this.prismaService.player.updateMany({ where: { user_id: opponentPokemon.user_id }, data: { losses: { increment: 1 } } })
                await this.prismaService.game.update({ where: { id: parseInt(gameId) }, data: { winnerId: winnerData.id } })
                return {
                    pokemon: playerPokemon,
                    opponentMessage: { message: "Your last pokemon has been defeated, you have lost the game" }
                    ,
                    playerMessage: {
                        message: "You have been defeated last opponent pokemon, you have win the game"
                    }
                }
            } else {
                return {
                    pokemon: playerPokemon,
                    opponentMessage: { message: "Your pokemon has been defeated" }
                    ,
                    playerMessage: {
                        message: "You have been defeated opponent pokemon"
                    }
                }
            }
        }
    }

    async defendAllYourPokemons(gameId: string, pokemon: Pokemon) {
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
        const defendedPokemons = await this.prismaService.pokemon.findMany({ where: { teamId: pokemon.teamId } })

        await Promise.all(defendedPokemons.map(async (pokemon) => {
            const pokemonsActualStats = await this.prismaService.stats.findFirst({ where: { id: pokemon.statsId } })
            const newHpPokemonDefended = Math.round(pokemonsActualStats.hp + (playerPokemonStats.defense))
            await this.prismaService.stats.update({ where: { id: pokemon.statsId }, data: { hp: newHpPokemonDefended } })
        }))
        await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialDefensePoints: { decrement: 10 } } })
        const specialPointsPlayer = await this.prismaService.specialPoints.findFirst({ where: { user_id: pokemon.user_id } })
        return {
            pokemon: playerPokemon,
            opponentMessage: {
                message: `Your opponent defense is already effective.`
            }
            ,
            playerMessage: {
                specialPointsPlayer: specialPointsPlayer,
                message: `Your defense is already effective.`
            }
        }
    }

    async specialDefense(gameId: any, pokemon: any) {
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
        const newHpPokemonDefended = Math.round(playerPokemonStats.hp + (playerPokemonStats.defense * 2))
        const updatedStats = await this.prismaService.stats.update({ where: { id: playerPokemon.statsId }, data: { hp: newHpPokemonDefended } })
        await this.prismaService.specialPoints.updateMany({ where: { user_id: pokemon.user_id }, data: { specialDefensePoints: { decrement: 10 } } })
        const specialPointsPlayer = await this.prismaService.specialPoints.findFirst({ where: { user_id: pokemon.user_id } })
        return {
            pokemon: playerPokemon,
            opponentMessage: {
                message: `Your opponent defense is already effective. 
        His remaining HP is ${updatedStats.hp}`
            }
            ,
            playerMessage: {
                specialPointsPlayer: specialPointsPlayer,
                message: `Your defense is already effective. 
        Your remaining HP is ${updatedStats.hp}`
            }
        }
    }
}

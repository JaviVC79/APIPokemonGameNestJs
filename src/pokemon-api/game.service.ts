import { HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from './prisma.service';
import { HashService } from "./hash/hash.service";
import { JwtService } from "@nestjs/jwt";
import { Game } from "@prisma/client";
import { jwtConstants } from "./hash/constants";
import { UUIDTypes, v4 as uuidv4 } from 'uuid';

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
        const userId = await this.extractUserIdFromToken(auth)
        //console.log(userId)
        try {
            const players = await this.prismaService.game.findMany();
            const awaitingPlayers = players.filter((file) => file.player2TeamId == null)
            const firtsFile = awaitingPlayers[0]
            const playerGames = await this.prismaService.game.findMany({ where: { OR: [{ user_id1: userId }, { user_id2: userId }] } });
            //console.log(playerGames)
            if (playerGames.length > 0) {
                console.log("you already have a started game")
                return { status: HttpStatus.BAD_REQUEST, message: "you already have a started game", gameId: playerGames[0].id  }
            }
            if (awaitingPlayers.length == 0 || firtsFile.user_id1 == userId) {
                const newGame = await this.prismaService.game.create({ data: { player1TeamId: playersId.player1TeamId, user_id1: userId } });
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
        console.log(userId)
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

}

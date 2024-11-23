import { Injectable } from "@nestjs/common";
import { PrismaService } from './prisma.service';
import { HashService } from "./hash/hash.service";
import { JwtService } from "@nestjs/jwt";
import { Game } from "@prisma/client";

@Injectable()
export class GameService {

    constructor(private prismaService: PrismaService,
        private hashService: HashService,
        private jwtService: JwtService,
    ) { }

    async startGame(playersId: Game, auth: string) {
        //try {
            await this.prismaService.game.create({ data: playersId })
        /*} catch (error) {
            console.log(error)
        }*/

    }



}
import { Module } from '@nestjs/common';
import { GameSocketService } from './game-socket.service';
import { GameSocketGateway } from './game-socket.gateway';
import { GameService } from 'src/pokemon-api/game.service';
import { PrismaService } from 'src/pokemon-api/prisma.service';
import { HashService } from 'src/pokemon-api/hash/hash.service';

@Module({
  providers: [GameSocketGateway, GameSocketService, GameService, PrismaService, HashService],
})
export class GameSocketModule { }

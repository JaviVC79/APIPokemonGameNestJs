import { Module } from '@nestjs/common';
import { GameSocketService } from './game-socket.service';
import { GameSocketGateway } from './game-socket.gateway';

@Module({
  providers: [GameSocketGateway, GameSocketService],
})
export class GameSocketModule {}

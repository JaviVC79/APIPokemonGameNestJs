import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PokemonApiModule } from './pokemon-api/pokemon-api.module';
import { ConfigModule } from '@nestjs/config';
import { GameSocketModule } from './game-socket/game-socket.module';

@Module({
  imports: [PokemonApiModule, ConfigModule.forRoot({ isGlobal: true }), GameSocketModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

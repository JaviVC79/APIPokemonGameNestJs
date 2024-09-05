import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PokemonApiModule } from './pokemon-api/pokemon-api.module';

@Module({
  imports: [PokemonApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

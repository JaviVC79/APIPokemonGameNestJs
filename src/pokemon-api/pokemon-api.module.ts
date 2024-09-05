import { Module } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { PokemonApiController } from './pokemon-api.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PokemonApiController],
  providers: [PokemonApiService, PrismaService],
})
export class PokemonApiModule {}

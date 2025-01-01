import { Module } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { PokemonApiController } from './pokemon-api.controller';
import { PrismaService } from './prisma.service';
import { AuthService } from './authUser.service';
import { HashService } from './hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './hash/constants';
import { GameService } from './game.service';
import { SendMailService } from './send-mail.service';


@Module({
  controllers: [PokemonApiController],
  providers: [PokemonApiService, PrismaService, AuthService, HashService, GameService, SendMailService],
  imports: [JwtModule.register({
    global: true,
    secret: jwtConstants.secret,
    signOptions: { expiresIn: '2h' },
  }),
  ],

  exports: [AuthService],
})
export class PokemonApiModule { }

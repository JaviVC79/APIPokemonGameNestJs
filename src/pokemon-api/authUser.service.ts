import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PokemonApiService } from './pokemon-api.service';
import { Player } from '@prisma/client'; 
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: PokemonApiService,
    private jwtService: JwtService
  ) {}

  async signIn(
    userdata: any
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOneByEmail(userdata.email, userdata.password);
    console.log(user)
    if (user === undefined) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
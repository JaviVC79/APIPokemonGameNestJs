import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: PokemonApiService,
    private jwtService: JwtService
  ) { }

  async signIn(
    userdata: { email: string, password: string }
  ): Promise<{ access_token: string }> {
    if (Object.keys(userdata).length === 0 || Object.values(userdata).length === 0) throw new UnauthorizedException();
    const user = await this.usersService.findOneByEmail(userdata.email, userdata.password);
    if (user === undefined) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.email, sub2: user.user_id };
    if (user.email === undefined || user.user_id === undefined) throw new UnauthorizedException()
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
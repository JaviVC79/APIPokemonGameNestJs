import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { jwtConstants } from './pokemon-api/hash/constants';

JwtModule.register({
  secret: jwtConstants.secret,
  signOptions: { algorithm: jwtConstants.signOptions.algorithm, expiresIn: '1d' },
});
console.log(jwtConstants.signOptions.algorithm)
const configService = new ConfigService();

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return false;
    }
    try {
      const decoded = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
        algorithms: [jwtConstants.signOptions.algorithm]
      });
      request.user = decoded;
      //console.log(decoded)
      //console.log(request.user)
      return true;
    } catch (error) {
      return false;
    }
  }
}

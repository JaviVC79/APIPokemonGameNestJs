import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

JwtModule.register({
  secret: 'yourSecretKey',
  signOptions: { algorithm: 'HS256' },
});
const configService = new ConfigService();

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
 
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      return false;
    }
    try {
      const decoded = this.jwtService.verify(token, { secret: configService.get<string>('JWT_SECRET'),
      algorithms: ['HS256'] });
      request.user = decoded;
      console.log(decoded)
      console.log(request.user)
      return true;
    } catch (error) {
      return false;
    }
  }
}

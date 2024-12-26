import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

const configService = new ConfigService

export const jwtConstants: JwtModuleOptions = {
  secret: configService.get<string>('JWT_SECRET'),
  signOptions: { algorithm: 'HS256' },
};
export const saltOrRounds = configService.get('SALTORROUNDS');
export const baseUrl = process.env.PORT ?? configService.get('BASE_URL');


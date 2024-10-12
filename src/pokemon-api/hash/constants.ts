import { ConfigService } from '@nestjs/config';

const configService = new ConfigService

export const jwtConstants = {
    secret:  configService.get<string>('JWT_SECRET'),
  };
export const saltOrRounds = configService.get('SALTORROUNDS');
export const baseUrl = configService.get('BASE_URL');


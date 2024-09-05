import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  app.enableCors({
    origin: ['4200-idx-angular-app-1721758154447.cluster-23wp6v3w4jhzmwncf7crloq3kw.cloudworkstations.dev'],
    credentials: true,
  });

}
bootstrap();

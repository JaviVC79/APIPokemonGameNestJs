import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['https://4200-idx-angular-app-1721758154447.cluster-23wp6v3w4jhzmwncf7crloq3kw.cloudworkstations.dev', 'https://3000-idx-pokemongameapi-1725292582953.cluster-rcyheetymngt4qx5fpswua3ry4.cloudworkstations.dev/api-documentation', `${process.env.PORT}`],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
  .setTitle('Pokemon-API')
  .setDescription('PokemonGame API')
  .setVersion('1.0')
  .addTag('Pokemons')
  .addBearerAuth()
  .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-documentation', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();


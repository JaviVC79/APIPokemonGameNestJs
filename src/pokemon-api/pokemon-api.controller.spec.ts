import { Test, TestingModule } from '@nestjs/testing';
import { PokemonApiController } from './pokemon-api.controller';
import { PokemonApiService } from './pokemon-api.service';
import { AuthService } from './authUser.service';
import { HashService } from './hash/hash.service';
import { PrismaService } from './prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './hash/constants';
import * as request from 'supertest';
import { HttpException } from '@nestjs/common';

describe('PokemonApiController', () => {
  let controller: PokemonApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonApiController],
      providers: [PokemonApiService, PrismaService, AuthService, HashService],
      imports: [JwtModule.register({
        global: true,
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '2h' },
      }),
      ],
    }).compile();

    controller = module.get<PokemonApiController>(PokemonApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a new Player and return a 201 status', async () => {
    const newPlayer: any = { email: "test@gmail.com", password: "123456789", nickName: "test" };
    const res: any = await controller.createPlayer(newPlayer);
    expect(res).toBe(201)
  });

  it('should fail to create a new Player that is already created or create data is not correct in any way', async () => {
    const newPlayer: any = { email: "test@gmail.com", password: "123456789", nickName: "test" };
    try {
      await controller.createPlayer(newPlayer);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.response).toBeDefined();
      expect(error.response.statusCode).toBe(400);
      expect(error.response.message).toBe('Email already exists');
    }
    const newPlayer2: any = { password: "123456789", nickName: "test" };
    try {
      await controller.createPlayer(newPlayer2);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.response).toBeDefined();
      expect(error.response).toBe('Password must be at least 8 characters long, email should be a valid email and nickName must be at least 4 characters long');
      expect(error.status).toBe(400);
    }
  });

  it('should retorn an 401 Unauthorized if password is wrong', async () => {
    const response = await request('http://localhost:3000/pokemon-api').post('/login')
      .send({ email: "test@gmail.com", password: "not-valid-password" })
    expect(response.status).toBe(401);
  });

  let token: any;
  it('should retorn an object with access_token defined if password is correct', async () => {
    const response = await request('http://localhost:3000/pokemon-api').post('/login')
      .send({ email: "test@gmail.com", password: "123456789" })
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(Object.keys(response.body).length).toBeGreaterThan(0);
    expect(Object.keys(response.body).length).toBeLessThan(2);
    expect(response.body).toHaveProperty('access_token');
    expect(typeof response.body.access_token).toBe('string');
    token = response.body.access_token
  });

  it('should fail to try delete a Player and retorn a 401 Unauthorized status', async () => {
    const response: any = await request('http://localhost:3000/pokemon-api').delete('/player').set('Authorization', `Bearer ${'invalid-token'}`);
    expect(response.status).toBe(401)
    const response2: any = await request('http://localhost:3000/pokemon-api').delete('/player');
    expect(response2.status).toBe(401)
  });

  it('should delete a Player and retorn a 200 status', async () => {
    const response: any = await request('http://localhost:3000/pokemon-api').delete('/player').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200)
  });


  it('should return an array of data', async () => {
    const result = ['test'];
    jest.spyOn(controller, 'findAll').mockImplementation(async () => result);

    expect(await controller.findAll('valid-token')).toEqual(['test']);
  });

});

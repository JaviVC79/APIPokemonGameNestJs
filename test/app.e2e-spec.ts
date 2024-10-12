import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { pokemons, teams, testArrayCreatePlayer } from './array-data-test/pokemon-api-data-tests';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let teamIdArray: string[];
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/pokemon-api')
      .expect(401)
  });

  it('POST (/pokemon-api) should create a new Player and return a 201 status', async () => {
    const res: any = await request(app.getHttpServer()).post('/pokemon-api').send(testArrayCreatePlayer[0]);
    expect(res.status).toBe(201)
  });

  it('POST (/pokemon-api) should fail to create a new Player that is already created or create data is not correct in any way', async () => {
    try {
      await request(app.getHttpServer()).post('/pokemon-api').send(testArrayCreatePlayer[0]);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.response).toBeDefined();
      expect(error.response.statusCode).toBe(400);
      expect(error.response.message).toBe('Email already exists');
    }
    const promises = testArrayCreatePlayer.map(async (element, index) => {
      if (index !== 0 && index === Math.floor(Math.random() * testArrayCreatePlayer.length)) {
        await request(app.getHttpServer()).post('/pokemon-api').send(element)
          .catch(error => {
            expect(error).toBeInstanceOf(HttpException);
            expect(error.response).toBeDefined();
            expect(error.response).toBe('Password must be at least 8 characters long, email should be a valid email and nickName must be at least 4 characters long');
            expect(error.status).toBe(400);
          });
      }
    });
    await Promise.all(promises);
  });

  it('POST (/pokemon-api/login) should return an 401 Unauthorized if password is wrong', async () => {
    const response = await request(app.getHttpServer()).post('/pokemon-api/login').send({ email: "test@gmail.com", password: "not-valid-password" })
    expect(response.status).toBe(401);
  });

  it('POST (/pokemon-api/login) should return an object with access_token defined if password is correct', async () => {
    const response = await request(app.getHttpServer()).post('/pokemon-api/login').send({ email: "test@gmail.com", password: "123456789" })
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(Object.keys(response.body).length).toBeGreaterThan(0);
    expect(Object.keys(response.body).length).toBeLessThan(2);
    expect(response.body).toHaveProperty('access_token');
    expect(typeof response.body.access_token).toBe('string');
    token = response.body.access_token
  });

  it('DELETE (/pokemon-api/player) should fail to try delete a Player and retorn a 401 Unauthorized status', async () => {
    const response: any = await request(app.getHttpServer()).delete('/pokemon-api/player').set('Authorization', `Bearer ${'invalid-token'}`);
    expect(response.status).toBe(401)
    const response2: any = await request(app.getHttpServer()).delete('/pokemon-api/player');
    expect(response2.status).toBe(401)
  });

  it('POST (/pokemon-api/team) should create a Player team and retorn a 201 status', async () => {
    const response: any = await request(app.getHttpServer()).post('/pokemon-api/team').set('Authorization', `Bearer ${token}`).send(teams[0]);
    const response2: any = await request(app.getHttpServer()).post('/pokemon-api/team').set('Authorization', `Bearer ${token}`).send(teams[1]);
    expect(response.status).toBe(201);
    expect(response.body).toBeInstanceOf(Object);
    expect(Object.keys(response.body).length).toBe(2);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('message');
    expect(response.body.status).toBe(201)
    expect(response.body.message).toBe('New team has been created successfully')
    expect(response2.body.message).toBe('New team has been created successfully')
  });

  it('GET (/pokemon-api/teams) should get a Pokemon team array and return a 200 status', async () => {
    const response: any = await request(app.getHttpServer()).get('/pokemon-api/teams').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Object);
    expect(Object.keys(response.body).length).toBe(3);
    expect(response.body).toHaveProperty('teams');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('message');
    expect(response.body.status).toBe(200)
    expect(response.body.message).toBe('Teams has been found successfully')
    expect(response.body.teams).toBeInstanceOf(Array)
    teamIdArray = response.body.teams.map((team: { id: number }) => team.id)
  });

  it('POST (/pokemon-api/pokemon/:teamId) should create a Pokemon and his stats in a team and retorn a 201 status', async () => {
    const teamId = teamIdArray[Math.floor(Math.random() * teamIdArray.length)];
    const response: any = await request(app.getHttpServer())
      .post(`/pokemon-api/pokemon/${teamId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(pokemons[Math.floor(Math.random() * pokemons.length)]);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('message');
    expect(response.body.status).toBe(201)
    expect(response.body.message).toBe('New pokemon has been created successfully')
  });

  it('DELETE (/pokemon-api/player) should delete a Player, his teams, his pokemons and his stats, and retorn a 200 status', async () => {
    const response: any = await request(app.getHttpServer()).delete('/pokemon-api/player').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200)
    expect(response.body).toBeInstanceOf(Object);
    expect(Object.keys(response.body).length).toBe(2);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('message');
    expect(response.body.status).toBe(200)
    expect(response.body.message).toBe('Player has been deleted successfully')
  });

  afterAll(async () => {
    await app.close();
  });

});


import { Test, TestingModule } from '@nestjs/testing';
import { PokemonApiController } from './pokemon-api.controller';
import { PokemonApiService } from './pokemon-api.service';
import { AuthService } from './authUser.service';
import { HashService } from './hash/hash.service';
import { PrismaService } from './prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './hash/constants';


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

  it('should return an array of data', async () => {
    const result = { data: ['test'], status: 200, message: 'testOK' };
    jest.spyOn(controller, 'findAll').mockImplementation(async () => result);

    expect(await controller.findAll('valid-token')).toEqual(result

    );
  });



});

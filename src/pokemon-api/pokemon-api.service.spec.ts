import { Test, TestingModule } from '@nestjs/testing';
import { PokemonApiService } from './pokemon-api.service';
import { PrismaService } from './prisma.service';
import { AuthService } from './authUser.service';
import { HashService } from './hash/hash.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './hash/constants';

describe('PokemonApiService', () => {
  let service: PokemonApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonApiService, PrismaService, AuthService, HashService],
      imports: [JwtModule.register({
        global: true,
        secret: jwtConstants.secret,
        signOptions: { expiresIn: '2h' },
      }),
      ],
    }).compile();

    service = module.get<PokemonApiService>(PokemonApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

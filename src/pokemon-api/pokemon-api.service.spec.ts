import { Test, TestingModule } from '@nestjs/testing';
import { PokemonApiService } from './pokemon-api.service';

describe('PokemonApiService', () => {
  let service: PokemonApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PokemonApiService],
    }).compile();

    service = module.get<PokemonApiService>(PokemonApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

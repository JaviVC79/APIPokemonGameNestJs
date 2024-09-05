import { Test, TestingModule } from '@nestjs/testing';
import { PokemonApiController } from './pokemon-api.controller';
import { PokemonApiService } from './pokemon-api.service';

describe('PokemonApiController', () => {
  let controller: PokemonApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PokemonApiController],
      providers: [PokemonApiService],
    }).compile();

    controller = module.get<PokemonApiController>(PokemonApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GameSocketService } from './game-socket.service';

describe('GameSocketService', () => {
  let service: GameSocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSocketService],
    }).compile();

    service = module.get<GameSocketService>(GameSocketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GameSocketGateway } from './game-socket.gateway';
import { GameSocketService } from './game-socket.service';

describe('GameSocketGateway', () => {
  let gateway: GameSocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSocketGateway, GameSocketService],
    }).compile();

    gateway = module.get<GameSocketGateway>(GameSocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});

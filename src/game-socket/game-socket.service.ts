import { Injectable } from '@nestjs/common';
import { CreateGameSocketDto } from './dto/create-game-socket.dto';
import { UpdateGameSocketDto } from './dto/update-game-socket.dto';

@Injectable()
export class GameSocketService {
  create(createGameSocketDto: CreateGameSocketDto) {
    return 'This action adds a new gameSocket';
  }

  findAll() {
    return `This action returns all gameSocket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gameSocket`;
  }

  update(id: number, updateGameSocketDto: UpdateGameSocketDto) {
    return `This action updates a #${id} gameSocket`;
  }

  remove(id: number) {
    return `This action removes a #${id} gameSocket`;
  }
}

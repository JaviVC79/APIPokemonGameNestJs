import { PartialType } from '@nestjs/mapped-types';
import { CreateGameSocketDto } from './create-game-socket.dto';

export class UpdateGameSocketDto extends PartialType(CreateGameSocketDto) {
  id: number;
}

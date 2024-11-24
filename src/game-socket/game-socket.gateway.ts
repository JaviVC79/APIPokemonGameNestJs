import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { GameSocketService } from './game-socket.service';
import { CreateGameSocketDto } from './dto/create-game-socket.dto';
import { UpdateGameSocketDto } from './dto/update-game-socket.dto';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class GameSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly gameSocketService: GameSocketService) { }

  @WebSocketServer()
  server: Server

  handleConnection(client: Socket) {
    console.log(`Cliente con id: ${client.id} conectado`)
   }



  handleDisconnect(client: Socket) {
    console.log(`Cliente con id: ${client.id} desconectado`);
  }

 /* @SubscribeMessage('createGameSocket')
  create(@MessageBody() createGameSocketDto: CreateGameSocketDto) {
    return this.gameSocketService.create(createGameSocketDto);
  }

  @SubscribeMessage('findAllGameSocket')
  findAll() {
    return this.gameSocketService.findAll();
  }

  @SubscribeMessage('findOneGameSocket')
  findOne(@MessageBody() id: number) {
    return this.gameSocketService.findOne(id);
  }

  @SubscribeMessage('updateGameSocket')
  update(@MessageBody() updateGameSocketDto: UpdateGameSocketDto) {
    return this.gameSocketService.update(updateGameSocketDto.id, updateGameSocketDto);
  }

  @SubscribeMessage('removeGameSocket')
  remove(@MessageBody() id: number) {
    return this.gameSocketService.remove(id);
  }*/
}

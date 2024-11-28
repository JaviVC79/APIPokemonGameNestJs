import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from '../pokemon-api/game.service';

@WebSocketGateway({
  cors: {
    origin: 'https://4200-idx-angular-app-1721758154447.cluster-23wp6v3w4jhzmwncf7crloq3kw.cloudworkstations.dev',
    methods: ['GET', 'POST'],
    credentials: true
  }
})
export class GameSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private gameService: GameService) { }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const user_id = client.handshake.headers.user_id
    if (!user_id || user_id === "" || user_id.length === 0) {
      console.log("1")
      this.handleDisconnect(client)
      return
    }
    if (Array.isArray(user_id)) {
      console.log("2")
      this.handleDisconnect(client)
      return
    }
    const games = await this.gameService.findGameByUser(user_id)
    if(!games){
      console.log("3")
      this.handleDisconnect(client)
      return
    }
    const room= games.id.toString();
    client.join(room);
    console.log("joined " + "client: " + client.id + " room: " + room)
    this.server.to(client.id).emit('joinRoom', room);
  }

  handleDisconnect(client: Socket) {
    // Obtener la room del cliente
    const rooms = Array.from(client.rooms);
    rooms.forEach(room => {
      client.leave(room);
      // Notificar a los demás usuarios en la room
      this.server.to(room).emit('userDisconnected', client.id);
    });
    console.log(`Client disconnected: ${client.id}`);
  }

  /*@SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    console.log("joined " + "client: " + client.id + " room: " + room)
    client.join(room);
    const gameState = this.gameService.getGameState(room);
    if (gameState) {
      client.emit('restoreGame', gameState);
    }
  }*/

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    if (!client.rooms.has(room)) {
      console.log(`joined client: ${client.id} room: ${room}`);
      client.join(room);
      const gameState = this.gameService.getGameState(room);
      if (gameState) {
        client.emit('restoreGame', gameState);
      }
    } else {
      console.log(`Client ${client.id} is already in room ${room}`);
    }
  }

  @SubscribeMessage('saveGame')
  handleSaveGame(client: Socket, payload: { room: string, state: any }) {
    this.gameService.saveGameState(payload.room, payload.state);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: { room: string, message: string }) {
    this.server.to(payload.room).emit('sendMessage', payload.message);
  }
}





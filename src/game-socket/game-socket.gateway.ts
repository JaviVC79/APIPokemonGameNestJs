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

  constructor(private gameService: GameService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    const cookies = client.handshake.headers.user_id
    console.log(cookies)
    /*const waitingPlayer = this.gameService.getWaitingPlayer();
    if (waitingPlayer) {
      const room = `room-${waitingPlayer}-${client.id}`;
      client.join(room);
      this.server.to(waitingPlayer).emit('joinRoom', room);
      this.server.to(client.id).emit('joinRoom', room);
    } else {
      this.gameService.addWaitingPlayer(client.id);
    }*/
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Manejar la desconexión del jugador
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    console.log("joined")
    client.join(room);
    const gameState = this.gameService.getGameState(room);
    if (gameState) {
      client.emit('restoreGame', gameState);
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




/*import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { GameSocketService } from './game-socket.service';
import { CreateGameSocketDto } from './dto/create-game-socket.dto';
import { UpdateGameSocketDto } from './dto/update-game-socket.dto';
import { Server, Socket } from 'socket.io';
import { GameService } from '../pokemon-api/game.service';

function parseCookies(cookieString) {
  const cookies = {};
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    cookies[name] = decodeURIComponent(value);
  });
  return cookies;
}

interface Cookie {
  [key: string]: string;
}

@WebSocketGateway({
  cors: {
    origin: 'https://4200-idx-angular-app-1721758154447.cluster-23wp6v3w4jhzmwncf7crloq3kw.cloudworkstations.dev',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly gameSocketService: GameSocketService, private readonly gameService: GameService) { }

  @WebSocketServer()
  server: Server

  async handleConnection(client: Socket) {
    console.log(`Cliente con id: ${client.id} conectado`);
  }



  handleDisconnect(client: Socket) {
    console.log(`Cliente con id: ${client.id} desconectado`);
  }

  @SubscribeMessage('message')
  message(@MessageBody() msg: string) {
    console.log(msg)
    return this.server.emit('message', 'Hello from NestJS');
  }

  @SubscribeMessage('start-game')
  startGame(@MessageBody() msg: any, @ConnectedSocket() client: Socket) {
    console.log('start-game', msg)
    return client.emit('start-game', msg);
  }

  @SubscribeMessage('game-resume')
  async gameResume(@MessageBody() msg: any, @ConnectedSocket() client: Socket) {
    //console.log('game-resume', msg)

    if (!msg) return
    const userId = msg[0].user_id

    const game = await this.gameService.findGameByUser(userId);
    console.log("games",game)
    if (game) {
      const otherUserId = game.user_id1 === userId ? game.user_id2 : game.user_id1;
      const otherClient = Array.from(this.server.sockets.sockets.values()).find(
        (socket) => socket.handshake.query.userId === otherUserId,
      );
      client.emit('game-resume', { message: 'You have an ongoing game!' });
      console.log("otherUserId",otherUserId)
      console.log("otherClient",otherClient)
      if (otherClient) {
        client.emit('game-resume', { message: 'You have an ongoing game!' });
        otherClient.emit('game-resume', { message: 'Your opponent has reconnected!' });
      }

    }
  }*/


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
   }
}*/

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
    const user_id = client.handshake.headers.user_id
    //Validar que el cliente esté identificado
    if (!user_id || user_id === "" || user_id.length === 0) {
      this.handleDisconnect(client)
      return
    }
    if (Array.isArray(user_id)) {
      this.handleDisconnect(client)
      return
    }
    //Validar si el cliente tiene un juego iniciado
    const games = await this.gameService.findGameByUser(user_id)
    if (!games) {
      this.handleDisconnect(client)
      return
    }
    const room = games.id.toString();
    client.user_id = user_id;

    // Validar si el cliente ya está en la room
    const clientsInRoom = this.server.sockets.adapter.rooms.get(room);
    if (clientsInRoom) {
      for (const clientId of clientsInRoom) {
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket && socket.user_id === user_id) {
          console.log(`Client with user_id ${user_id} is already in room ${room}`);
          return;
        }
      }
    }
    if (room == "") {
      this.handleDisconnect(client)
      return
    }
    client.join(room);
    console.log("handleConnection joined " + "client: " + client.id + " room: " + room)
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

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    if (!client.rooms.has(room)) {
      console.log(`handleJoinRoom joined client: ${client.id} room: ${room}`);
      client.join(room);
      const gameState = this.gameService.getGameState(room);
      if (gameState) {
        client.emit('restoreGame', gameState);
      }
    } else {
      //console.log(`Client ${client.id} is already in room ${room}`);
    }
  }

  @SubscribeMessage('saveGame')
  handleSaveGame(client: Socket, payload: { room: string, state: any }) {
    this.gameService.saveGameState(payload.room, payload.state);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: { room: string, message: string }) {
    console.log("en sendMessage", payload)
    //client.broadcast.to(payload.room).emit('sendMessage', payload.message);
    client.broadcast.in(payload.room).to(payload.room).emit('sendMessage', payload.message);
  }

  @SubscribeMessage('attack')
  async attack(client: Socket, payload: { room: string, message: any }) {
    const numberOfConnectedClients = this.getNumberOfClientsInRoom(payload.room)
    if (numberOfConnectedClients !== 2) {
      client.emit('attack', { message: "Your opponent is not connected" });
      return
    }
    const attackResponse = await this.gameService.attack(Array.from(client.rooms)[1], payload.message)
    console.log("ataque")
    // Enviar mensaje al emisor 
    client.emit('attack', { message: attackResponse.playerMessage, pokemon: attackResponse.pokemon });
    // Enviar mensaje a los demás clientes en la sala 
    client.broadcast.to(payload.room).emit('attack', { message: attackResponse.opponentMessage, pokemon: attackResponse.pokemon })
  }

  private getNumberOfClientsInRoom(room: string) {
    const roomInfo = this.server.sockets.adapter.rooms.get(room);
    const numberOfClients = roomInfo ? roomInfo.size : 0;
    console.log(`Number of clients in room ${room}: ${numberOfClients}`);
    return numberOfClients;
  }

  @SubscribeMessage('defense')
  async defense(client: Socket, payload: { room: string, message: any }) {
    const numberOfConnectedClients = this.getNumberOfClientsInRoom(payload.room)
    if (numberOfConnectedClients !== 2) {
      client.emit('attack', { message: "Your opponent is not connected" });
      return
    }
    //const clientsInRoom = this.getClients(payload.room, client.user_id)
    const defenseResponse = await this.gameService.defense(Array.from(client.rooms)[1], payload.message)
    console.log("defensa")
    // Enviar mensaje al emisor 
    client.emit('defense', { message: defenseResponse.playerMessage, pokemon: defenseResponse.pokemon });
    // Enviar mensaje a los demás clientes en la sala 
    client.broadcast.to(payload.room).emit('defense', { message: defenseResponse.opponentMessage, pokemon: defenseResponse.pokemon })
  }
  /*private getClients(room: string, user_id: string) {
    let users_id_room: any[] = [];
    const clientsInRoom = this.server.sockets.adapter.rooms.get(room);
    if (clientsInRoom) {
      for (const clientId of clientsInRoom) {
        const socket = this.server.sockets.sockets.get(clientId);
        if (socket && socket.user_id === user_id) {
          users_id_room.push({ emisor: socket.id });
        } else if (socket && socket.user_id !== user_id) {
          users_id_room.push({ receptor: socket.id });
        }
      }
      return ({ emisor: users_id_room[0], receptor: users_id_room[1] })
    }
  }*/

}





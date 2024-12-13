import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from '../pokemon-api/game.service';
import { isArray } from 'class-validator';

interface CustomSocket extends Socket {
  client_id: string;
}

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
  activeConnections = new Map<string, string>();

  async handleConnection(client: Socket) {
    const clientId = client.handshake.headers['client-id'];
    if (isArray(clientId) || !clientId) {
      this.handleDisconnect(client);
      return;
    }
    // Verificar si el client_id ya tiene una conexión activa
    if (this.activeConnections.has(clientId)) {
      const oldClientId = this.activeConnections.get(clientId);
      const oldClient = this.server.sockets.sockets.get(oldClientId);

      if (oldClient) {
        // Transferir las salas del cliente anterior al nuevo cliente
        const rooms = Array.from(oldClient.rooms);
        rooms.forEach(room => {
          if (room !== oldClient.id) { // No transferir la sala propia del cliente
            client.join(room);
          }
        });

        // Desconectar al cliente anterior
        oldClient.disconnect();
        console.log(`Cliente anterior ${oldClientId} desconectado y salas transferidas a ${client.id}`);
      }
    }

    // Registrar la nueva conexión
    this.activeConnections.set(clientId, client.id);
    console.log(`Cliente: ${client.id} conectado con client_id: ${clientId}`);

    const connectedSockets = Array.from(this.server.sockets.sockets.values());
    connectedSockets.forEach(socket => {
      console.log(`Socket ID: ${Array.from(socket.rooms.values())}`);
    });

    // Manejar la desconexión del cliente
    client.on('disconnect', () => {
      console.log(`Cliente desconectado: ${client.id}`);
      this.activeConnections.delete(clientId);
    });
  }

  handleDisconnect(client: Socket) {
    const clientId = client.handshake.headers['client-id'];
    if (isArray(clientId)) return;
    console.log(`Cliente desconectado: ${client.id}`);
    this.activeConnections.delete(clientId);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: CustomSocket, room: string) {
    console.log('joinRoom');
    const numberOfConnectedClients = this.getNumberOfClientsInRoom(room);
    if (numberOfConnectedClients >= 2) {
      client.disconnect();
      return;
    }

    const clientId = client.handshake.headers['client-id'];
    if (Array.isArray(clientId)) {
      client.disconnect();
      return;
    }
    client.client_id = clientId;

    // Validar si el cliente ya está en la room
    const clientsInRoom = this.server.sockets.adapter.rooms.get(room);
    if (clientsInRoom) {
      for (const clientId of clientsInRoom) {
        const socket = this.server.sockets.sockets.get(clientId) as CustomSocket;
        if (socket && socket.client_id === clientId) {
          console.log(`Client with client_id ${clientId} is already in room ${room}`);
          return;
        }
      }
    }

    if (!client.rooms.has(room)) {
      console.log(`handleJoinRoom joined client: ${client.id} room: ${room}`);
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
    console.log("en sendMessage", payload)
    //client.broadcast.to(payload.room).emit('sendMessage', payload.message);
    client.broadcast.in(payload.room).to(payload.room).emit('sendMessage', payload.message);
  }

  @SubscribeMessage('attack')
  async attack(client: Socket, payload: { room: string, message: any }) {
    console.log("attack")
    const numberOfConnectedClients = this.getNumberOfClientsInRoom(payload.room)
    console.log("numberOfConnectedClients", numberOfConnectedClients)
    if (numberOfConnectedClients < 2) {
      client.emit('attack', { message: "Your opponent is not connected" });
      return
    } else if (numberOfConnectedClients > 2) {
      client.emit('attack', { message: "To many clients connected on this room" });
      return
    }
    console.log("client.rooms)[1]", (Array.from(client.rooms)[1]))
    const attackResponse = await this.gameService.attack(payload.room, payload.message)
    console.log("ataque")
    // Enviar mensaje al emisor 
    client.emit('attack', { message: attackResponse.playerMessage, pokemon: attackResponse.pokemon });
    // Enviar mensaje a los demás clientes en la sala 
    client.broadcast.to(payload.room).emit('attack', { message: attackResponse.opponentMessage, pokemon: attackResponse.pokemon })
  }

  private getNumberOfClientsInRoom(room: string) {
    const roomInfo = this.server.sockets.adapter.rooms.get(room);
    const numberOfClients = roomInfo ? roomInfo.size : 0;
    //console.log(`Number of clients in room ${room}: ${numberOfClients}`);
    return numberOfClients;
  }

  @SubscribeMessage('defense')
  async defense(client: Socket, payload: { room: string, message: any }) {
    if (!(Array.from(client.rooms)[1])) return;
    const numberOfConnectedClients = this.getNumberOfClientsInRoom(payload.room)
    if (numberOfConnectedClients < 2) {
      client.emit('attack', { message: "Your opponent is not connected" });
      return
    } else if (numberOfConnectedClients > 2) {
      client.emit('attack', { message: "To many clients connected on this room" });
      return
    }
    const defenseResponse = await this.gameService.defense(Array.from(client.rooms)[1], payload.message)
    console.log("defensa")
    // Enviar mensaje al emisor 
    client.emit('defense', { message: defenseResponse.playerMessage, pokemon: defenseResponse.pokemon });
    // Enviar mensaje a los demás clientes en la sala 
    client.broadcast.to(payload.room).emit('defense', { message: defenseResponse.opponentMessage, pokemon: defenseResponse.pokemon })
  }

}





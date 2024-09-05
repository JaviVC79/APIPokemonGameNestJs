import { Player } from '@prisma/client'; 

export type PlayerDto = Omit<Player, 'id'>;


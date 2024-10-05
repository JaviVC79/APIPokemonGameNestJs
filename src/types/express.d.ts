// src/types/express.d.ts
import { User } from './user.entity'; // Importa tu entidad de usuario si tienes una

declare global {
  namespace Express {
    interface Request {
      user?: User; // Ajusta el tipo según tu implementación
    }
  }
}

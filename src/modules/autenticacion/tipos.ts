import type { Rol } from "@/generated/prisma/enums";

/**
 * CONTRATO: el usuario de la sesión, tal como lo reciben los demás módulos.
 * Solo lleva lo necesario para autorizar y mostrar; nunca el hash de la clave.
 *
 * En el segundo bimestre estos mismos campos salen del JWT.
 */
export interface UsuarioSesion {
  id: number;
  nombre: string;
  rol: Rol;
}

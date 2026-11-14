/**
 * Servicio de calificaciones: MÓDULO DE EJEMPLO para el resto del equipo.
 *
 * Patrón que sigue todo servicio:
 * 1. Recibe el usuario de la sesión (ya obtenido con requireRole) y la entrada
 *    sin validar (`unknown`), tal como llegó del formulario o del WebSocket.
 * 2. Vuelve a comprobar el permiso (defensa en profundidad).
 * 3. Valida la entrada con el esquema Zod del módulo.
 * 4. Pide a OTROS módulos lo que necesita a través de su API pública,
 *    nunca consultando sus tablas.
 * 5. Aplica las reglas de negocio y lanza errores de dominio si no se cumplen.
 * 6. Guarda con su propio repositorio.
 *
 * Las dependencias de otros módulos llegan como parámetro opcional para poder
 * reemplazarlas en las pruebas.
 */
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido } from "@/lib/errores";
import { validar } from "@/lib/validacion";
import type { UsuarioSesion } from "@/modules/autenticacion";
import { obtenerEstadoPedido } from "@/modules/pedidos";
import * as repositorio from "./repositorio";
import { esquemaCrearCalificacion } from "./validadores";

export interface DependenciasCalificaciones {
  obtenerEstadoPedido: typeof obtenerEstadoPedido;
  repositorio: Pick<typeof repositorio, "buscarPorPedido" | "crear">;
}

const dependenciasReales: DependenciasCalificaciones = { obtenerEstadoPedido, repositorio };

/**
 * El cliente califica un pedido desde la pantalla del cajero.
 * Reglas: solo el rol cajero, solo pedidos cobrados, una vez por pedido.
 */
export async function calificarPedido(
  usuario: UsuarioSesion,
  entrada: unknown,
  deps: DependenciasCalificaciones = dependenciasReales,
): Promise<repositorio.CalificacionGuardada> {
  if (usuario.rol !== Rol.CAJERO) {
    throw new ErrorProhibido("Solo la caja puede abrir la calificación.");
  }

  const datos = validar(esquemaCrearCalificacion, entrada);

  const pedido = await deps.obtenerEstadoPedido(datos.pedidoId);
  if (!pedido) throw new ErrorNoEncontrado("El pedido no existe.");
  if (pedido.estado !== EstadoPedido.COBRADO) {
    throw new ErrorConflicto("Solo se puede calificar un pedido ya cobrado.");
  }

  if (await deps.repositorio.buscarPorPedido(datos.pedidoId)) {
    throw new ErrorConflicto("Este pedido ya fue calificado.");
  }

  return deps.repositorio.crear({ ...datos, cajeroId: usuario.id });
}

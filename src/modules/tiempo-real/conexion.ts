/**
 * Conexiones WebSocket: autenticación en el handshake, salas y límites.
 *
 * Reglas (el servidor nunca confía en el navegador):
 * - Origen: solo se aceptan conexiones desde APP_URL.
 * - Sesión: la misma cookie que las páginas. Sin sesión, la conexión se rechaza
 *   antes de abrirse.
 * - Cada conexión entra a la sala de su rol (`rol:COCINA`) y a la suya propia
 *   (`usuario:7`). publicarEvento envía a esas salas.
 * - La conexión se corta cuando vence la sesión o al cerrar sesión
 *   (desconectarUsuario).
 * - Límite de frecuencia por conexión y tamaño máximo de mensaje (server.ts).
 */
import type { Server, Socket } from "socket.io";
import { origenPermitido } from "@/lib/seguridad/peticion";
import { autenticarConexion, type UsuarioSesion } from "@/modules/autenticacion";
import { salaDeRol, salaDeUsuario } from "./eventos";
import { registrarManejadores } from "./manejadores";

/** Máximo de eventos que una conexión puede enviar por ventana de tiempo. */
const LIMITE_EVENTOS = 20;
const VENTANA_MS = 10_000;

interface DatosConexion {
  usuario: UsuarioSesion;
  expiraEn: number;
}

/** Usuario autenticado de una conexión (lo puso el handshake; nunca lo manda el cliente). */
export function usuarioDeConexion(socket: Socket): UsuarioSesion {
  return (socket.data as DatosConexion).usuario;
}

function cabecerasDelHandshake(socket: Socket) {
  return {
    get(nombre: string): string | null {
      const valor = socket.handshake.headers[nombre];
      return (Array.isArray(valor) ? valor[0] : valor) ?? null;
    },
  };
}

/** Descarta los eventos de una conexión que supera el límite y le avisa. */
function limitarFrecuencia(socket: Socket) {
  let inicioVentana = Date.now();
  let cuenta = 0;
  return (_paquete: unknown[], siguiente: (error?: Error) => void) => {
    const ahora = Date.now();
    if (ahora - inicioVentana > VENTANA_MS) {
      inicioVentana = ahora;
      cuenta = 0;
    }
    cuenta += 1;
    if (cuenta > LIMITE_EVENTOS) {
      socket.emit("limite", { mensaje: "Estás enviando demasiado rápido. Espera unos segundos." });
      return; // sin llamar a siguiente(): el evento se descarta
    }
    siguiente();
  };
}

/** Lo llama server.ts una sola vez, al crear Socket.IO. */
export function configurarConexiones(io: Server): void {
  // Handshake: corre antes de aceptar la conexión (polling y WebSocket).
  io.use(async (socket, siguiente) => {
    try {
      if (!origenPermitido(cabecerasDelHandshake(socket))) {
        return siguiente(new Error("Origen no permitido."));
      }
      const sesion = await autenticarConexion(socket.handshake.headers.cookie);
      if (!sesion) return siguiente(new Error("Debes iniciar sesión."));

      const datos: DatosConexion = { usuario: sesion.usuario, expiraEn: sesion.expiraEn.getTime() };
      socket.data = datos;
      siguiente();
    } catch (error) {
      console.error("[tiempo-real] Error al autenticar la conexión", error);
      siguiente(new Error("No se pudo conectar."));
    }
  });

  io.on("connection", (socket) => {
    const { usuario, expiraEn } = socket.data as DatosConexion;
    void socket.join([salaDeRol(usuario.rol), salaDeUsuario(usuario.id)]);

    // Cortar la conexión cuando vence la sesión (setTimeout admite hasta ~24,8 días).
    const restante = Math.min(Math.max(expiraEn - Date.now(), 0), 2_147_483_647);
    const temporizador = setTimeout(() => socket.disconnect(true), restante);
    socket.on("disconnect", () => clearTimeout(temporizador));

    socket.use(limitarFrecuencia(socket));
    registrarManejadores(io, socket, usuario);
  });
}

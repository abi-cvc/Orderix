/**
 * Gestión en memoria de usuarios conectados al chat en tiempo real.
 *
 * Cada usuario puede tener múltiples pestañas (sockets) abiertas, pero
 * en la lista pública aparece una sola vez (sin duplicados, roles ni datos internos).
 * Solo se remueve cuando se cierra su última pestaña activa.
 *
 * Archivo con lógica pura, sin dependencias de Socket.IO ni base de datos,
 * facilitando pruebas unitarias directas.
 */

export interface UsuarioConectado {
  id: number;
  nombre: string;
}

export interface RegistroUsuario {
  nombre: string;
  sockets: Set<string>;
}

export type MapaConectados = Map<number, RegistroUsuario>;

/**
 * Crea un almacén de usuarios conectados en memoria.
 */
export function crearAlmacenConectados(mapaInicial?: MapaConectados) {
  const usuarios: MapaConectados = mapaInicial ?? new Map();

  return {
    /**
     * Registra un socket para un usuario.
     * Retorna `true` si es la primera conexión del usuario (se añadió a la lista).
     */
    conectar(usuario: { id: number; nombre: string }, socketId: string): boolean {
      const existente = usuarios.get(usuario.id);
      if (existente) {
        existente.sockets.add(socketId);
        return false;
      }
      usuarios.set(usuario.id, {
        nombre: usuario.nombre,
        sockets: new Set([socketId]),
      });
      return true;
    },

    /**
     * Remueve un socket.
     * Retorna `true` si el usuario se quedó sin sockets y fue removido de la lista.
     */
    desconectar(socketId: string): boolean {
      for (const [id, registro] of usuarios.entries()) {
        if (registro.sockets.has(socketId)) {
          registro.sockets.delete(socketId);
          if (registro.sockets.size === 0) {
            usuarios.delete(id);
            return true;
          }
          return false;
        }
      }
      return false;
    },

    /**
     * Retorna la lista actual de usuarios conectados { id, nombre }.
     */
    listar(): UsuarioConectado[] {
      return Array.from(usuarios.entries()).map(([id, reg]) => ({
        id,
        nombre: reg.nombre,
      }));
    },

    /**
     * Cantidad de usuarios únicos conectados.
     */
    total(): number {
      return usuarios.size;
    },

    /**
     * Limpia todos los registros (útil para pruebas).
     */
    limpiar(): void {
      usuarios.clear();
    },
  };
}

export type AlmacenConectados = ReturnType<typeof crearAlmacenConectados>;

/** Instancia en memoria compartida para el proceso. */
export const conectados = crearAlmacenConectados();

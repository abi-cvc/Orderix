/** Registro, credenciales y recuperación. Las páginas solo llaman a este servicio. */
import { Rol } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { ErrorNoAutenticado, ErrorValidacion } from "@/lib/errores";
import { generarToken, hashearClave, hashearToken, verificarClave } from "@/lib/hash";
import { validar } from "@/lib/validacion";
import { limitadorIntentos } from "@/lib/seguridad/limite";
import { ipCliente } from "@/lib/seguridad/peticion";
import * as repositorio from "./repositorio";
import { cerrarTodasLasSesiones } from "./sesion";
import type { UsuarioSesion } from "./tipos";
import {
  esquemaLogin,
  esquemaRegistro,
  esquemaRestablecerClave,
  esquemaSolicitarRecuperacion,
} from "./validadores";

export interface DependenciasAutenticacion {
  repositorio: Pick<
    typeof repositorio,
    | "crearUsuario"
    | "buscarUsuarioPorCorreo"
    | "crearTokenRecuperacion"
    | "consumirTokenYCambiarClave"
  >;
  hashearClave: typeof hashearClave;
  verificarClave: typeof verificarClave;
  generarToken: typeof generarToken;
  hashearToken: typeof hashearToken;
  cerrarTodasLasSesiones: typeof cerrarTodasLasSesiones;
  ahora: () => Date;
  obtenerUrlApp: () => string;
  imprimirEnlace: (enlace: string) => void;
  obtenerIpCliente: () => Promise<string>;
  limitadorIntentos: typeof limitadorIntentos;
}

const dependenciasReales: DependenciasAutenticacion = {
  repositorio,
  hashearClave,
  verificarClave,
  generarToken,
  hashearToken,
  cerrarTodasLasSesiones,
  ahora: () => new Date(),
  obtenerUrlApp: () => env().APP_URL,
  // En el primer bimestre el envío de correo se simula exclusivamente en consola.
  imprimirEnlace: (enlace) => console.info("Enlace de recuperación de clave:", enlace),
  obtenerIpCliente: async () => {
    // Carga diferida, como en sesion.ts: este módulo también lo importa server.ts.
    const { headers } = await import("next/headers");
    return ipCliente(await headers());
  },
  limitadorIntentos,
};

export async function registrarUsuario(
  entrada: unknown,
  deps: DependenciasAutenticacion = dependenciasReales,
): Promise<UsuarioSesion> {
  const datos = validar(esquemaRegistro, entrada);
  return deps.repositorio.crearUsuario({
    nombre: datos.nombre,
    correo: datos.correo,
    hashClave: await deps.hashearClave(datos.clave),
    rol: Rol.MESERO,
  });
}

/** Devuelve solo datos públicos; crear la cookie corresponde a iniciarSesion. */
export async function verificarCredenciales(
  entrada: unknown,
  deps: DependenciasAutenticacion = dependenciasReales,
): Promise<UsuarioSesion> {
  const datos = validar(esquemaLogin, entrada);
  const ip = await deps.obtenerIpCliente();
  deps.limitadorIntentos.comprobarBloqueo("login", ip, datos.correo);
  const usuario = await deps.repositorio.buscarUsuarioPorCorreo(datos.correo);
  // También ejecuta Argon2 si el correo no existe, para reducir diferencias de tiempo.
  const hash = usuario?.hashClave ?? (await deps.hashearClave(deps.generarToken()));
  const claveValida = await deps.verificarClave(hash, datos.clave);
  if (!usuario || !claveValida || !usuario.activo) {
    deps.limitadorIntentos.registrarIntento("login", ip, datos.correo);
    throw new ErrorNoAutenticado("Correo o clave incorrectos.");
  }
  deps.limitadorIntentos.reiniciarCorreoLogin(datos.correo);
  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
}

export async function solicitarRecuperacion(
  entrada: unknown,
  deps: DependenciasAutenticacion = dependenciasReales,
): Promise<{ mensaje: string }> {
  const datos = validar(esquemaSolicitarRecuperacion, entrada);
  const ip = await deps.obtenerIpCliente();
  deps.limitadorIntentos.comprobarBloqueo("recuperacion", ip, datos.correo);
  deps.limitadorIntentos.registrarIntento("recuperacion", ip, datos.correo);
  const usuario = await deps.repositorio.buscarUsuarioPorCorreo(datos.correo);
  if (usuario?.activo) {
    const token = deps.generarToken();
    const enlace = new URL("/restablecer-clave", deps.obtenerUrlApp());
    enlace.searchParams.set("token", token);
    await deps.repositorio.crearTokenRecuperacion({
      usuarioId: usuario.id,
      hashToken: deps.hashearToken(token),
      caducaEn: new Date(deps.ahora().getTime() + 30 * 60_000),
    });
    deps.imprimirEnlace(enlace.toString());
  }
  return {
    mensaje: "Si el correo corresponde a una cuenta activa, recibirás un enlace de recuperación.",
  };
}

export async function restablecerClave(
  entrada: unknown,
  deps: DependenciasAutenticacion = dependenciasReales,
): Promise<void> {
  const datos = validar(esquemaRestablecerClave, entrada);
  const usuarioId = await deps.repositorio.consumirTokenYCambiarClave({
    hashToken: deps.hashearToken(datos.token),
    hashClave: await deps.hashearClave(datos.clave),
    ahora: deps.ahora(),
  });
  if (usuarioId === null) {
    throw new ErrorValidacion({ token: ["El enlace de recuperación venció o ya fue utilizado."] });
  }
  await deps.cerrarTodasLasSesiones(usuarioId);
}

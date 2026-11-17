"use server";

import { redirect } from "next/navigation";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioSesion,
  protegerFormulario,
  registrarUsuario,
  restablecerClave,
  solicitarRecuperacion,
  verificarCredenciales,
} from "@/modules/autenticacion";
import { desconectarUsuario } from "@/modules/tiempo-real";

export async function entrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(formData);
    const usuario = await verificarCredenciales(Object.fromEntries(formData));
    await iniciarSesion(usuario.id);
  } catch (error) {
    return estadoDeError(error);
  }
  // redirect lanza una excepción de Next; debe quedar fuera del catch de errores.
  redirect("/");
}

export async function registrarse(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(formData);
    await registrarUsuario(Object.fromEntries(formData));
    return { exito: true, mensaje: "Tu cuenta fue creada. Ya puedes iniciar sesión." };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function recuperar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(formData);
    const respuesta = await solicitarRecuperacion(Object.fromEntries(formData));
    return { exito: true, mensaje: respuesta.mensaje };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function restablecer(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(formData);
    await restablecerClave(Object.fromEntries(formData));
    return { exito: true, mensaje: "Tu clave fue actualizada. Inicia sesión con la nueva clave." };
  } catch (error) {
    return estadoDeError(error);
  }
}

export async function salir(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  try {
    await protegerFormulario(formData);
    const usuario = await obtenerUsuarioSesion();
    await cerrarSesion();
    if (usuario) desconectarUsuario(usuario.id);
  } catch (error) {
    return estadoDeError(error);
  }
  redirect("/login");
}

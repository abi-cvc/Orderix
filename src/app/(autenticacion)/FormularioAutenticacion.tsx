"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { estadoDeError, type EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import { validar } from "@/lib/validacion";
import {
  esquemaLogin,
  esquemaRegistro,
  esquemaRestablecerClave,
  esquemaSolicitarRecuperacion,
} from "@/modules/autenticacion/validadores";
import { entrar, recuperar, registrarse, restablecer } from "./acciones";

const configuracion = {
  login: { esquema: esquemaLogin, accion: entrar, boton: "Iniciar sesión" },
  registro: { esquema: esquemaRegistro, accion: registrarse, boton: "Crear cuenta" },
  recuperar: {
    esquema: esquemaSolicitarRecuperacion,
    accion: recuperar,
    boton: "Solicitar enlace",
  },
  restablecer: {
    esquema: esquemaRestablecerClave,
    accion: restablecer,
    boton: "Guardar nueva clave",
  },
};

interface Props {
  modo: keyof typeof configuracion;
  csrf: string;
  token?: string;
}

export function FormularioAutenticacion({ modo, csrf, token }: Props) {
  const config = configuracion[modo];
  const [estadoServidor, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    config.accion,
    {},
  );
  const [estadoCliente, setEstadoCliente] = useState<EstadoFormulario | null>(null);
  // Estos datos se conservan si el servidor rechaza el formulario; la clave no se devuelve al cliente.
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const estado = estadoCliente ?? estadoServidor;
  const completado = estadoServidor.exito && modo !== "login";

  function validarCliente(evento: FormEvent<HTMLFormElement>) {
    try {
      validar(config.esquema, Object.fromEntries(new FormData(evento.currentTarget)));
      setEstadoCliente(null);
    } catch (error) {
      evento.preventDefault();
      setEstadoCliente(estadoDeError(error));
    }
  }

  return (
    <>
      <Anuncio mensaje={estado.mensaje} tipo={estado.exito ? "exito" : "error"} />
      {completado ? (
        <p>
          <Link href="/login">Ir a iniciar sesión</Link>
        </p>
      ) : (
        <form action={accion} onSubmit={validarCliente} noValidate aria-busy={enviando}>
          <input type="hidden" name={CAMPO_CSRF} value={csrf} />
          {modo === "restablecer" && <input type="hidden" name="token" value={token ?? ""} />}
          {estado.errores?.token && (
            <Anuncio mensaje={estado.errores.token.join(" ")} tipo="error" />
          )}
          {modo === "registro" && (
            <Campo
              nombre="nombre"
              etiqueta="Nombre"
              autoComplete="name"
              required
              maxLength={100}
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              errores={estado.errores?.nombre}
            />
          )}
          {modo !== "restablecer" && (
            <Campo
              nombre="correo"
              etiqueta="Correo electrónico"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              errores={estado.errores?.correo}
            />
          )}
          {modo !== "recuperar" && (
            <Campo
              nombre="clave"
              etiqueta={modo === "restablecer" ? "Nueva clave" : "Clave"}
              type="password"
              autoComplete={modo === "login" ? "current-password" : "new-password"}
              required
              minLength={modo === "login" ? undefined : 10}
              ayuda={
                modo === "login"
                  ? undefined
                  : "Mínimo 10 caracteres. Puedes pegar tu clave o usar un gestor de contraseñas."
              }
              errores={estado.errores?.clave}
            />
          )}
          <Boton type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : config.boton}
          </Boton>
        </form>
      )}
    </>
  );
}

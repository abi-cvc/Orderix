"use client";

import { useActionState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import type { EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import { enviarEjemplo } from "./acciones";

/** Formulario de ejemplo: errores del servidor junto a cada campo y aviso general. */
export function FormularioEjemplo({ csrf }: { csrf: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(enviarEjemplo, {});

  return (
    <form action={accion} noValidate>
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      <Anuncio mensaje={estado.mensaje} tipo={estado.exito ? "exito" : "error"} />
      <Campo
        nombre="nombre"
        etiqueta="Nombre del cliente"
        ayuda="Mínimo 3 caracteres."
        autoComplete="off"
        errores={estado.errores?.nombre}
      />
      <Campo
        nombre="mesa"
        etiqueta="Número de mesa"
        inputMode="numeric"
        errores={estado.errores?.mesa}
      />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar"}
      </Boton>
    </form>
  );
}

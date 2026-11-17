"use client";

import { useActionState } from "react";
import { salir } from "@/app/(autenticacion)/acciones";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import type { EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";

export function FormularioCerrarSesion({ csrf }: { csrf: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(salir, {});
  return (
    <form action={accion} aria-busy={enviando}>
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      <Boton type="submit" variante="secundario" disabled={enviando}>
        {enviando ? "Cerrando sesión…" : "Cerrar sesión"}
      </Boton>
      <Anuncio mensaje={estado.mensaje} tipo="error" />
    </form>
  );
}

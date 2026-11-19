"use client";

import { useActionState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { Rol } from "@/generated/prisma/enums";
import { ETIQUETA_ROL } from "@/lib/navegacion";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import { cambiarRolAccion } from "./acciones";

/** Selector de rol con su botón "Guardar". El resultado se anuncia junto al formulario. */
export function FormularioRol({
  usuarioId,
  nombre,
  rol,
  csrf,
}: {
  usuarioId: number;
  nombre: string;
  rol: Rol;
  csrf: string;
}) {
  const [estado, enviar, enviando] = useActionState(cambiarRolAccion, {});
  const id = `rol-${usuarioId}`;

  return (
    <form action={enviar} className="formulario-rol">
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <label htmlFor={id} className="solo-lector">
        Rol de {nombre}
      </label>
      <select id={id} name="rol" defaultValue={rol} className="campo__control">
        {Object.values(Rol).map((opcion) => (
          <option key={opcion} value={opcion}>
            {ETIQUETA_ROL[opcion]}
          </option>
        ))}
      </select>
      <Boton type="submit" variante="secundario" disabled={enviando}>
        Guardar <span className="solo-lector">rol de {nombre}</span>
      </Boton>
      <Anuncio mensaje={estado.mensaje} tipo={estado.exito ? "exito" : "error"} />
    </form>
  );
}

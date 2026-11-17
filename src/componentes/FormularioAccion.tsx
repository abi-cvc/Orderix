"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import { Anuncio } from "./Anuncio";
import { Boton } from "./Boton";
import { ConfirmarYEnviar } from "./ConfirmarYEnviar";

interface Props {
  accion: (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;
  /** Campos ocultos (ids, estado destino...). */
  campos: Record<string, string | number>;
  csrf: string;
  texto: string;
  variante?: "primario" | "secundario" | "peligro";
  /** Si se indica, pide confirmación antes de enviar. */
  confirmar?: { titulo: string; descripcion: string; textoConfirmar: string };
}

/**
 * Botón que ejecuta una acción de servidor (cambiar estado, cobrar, quitar
 * ítem), con confirmación opcional. El resultado se anuncia junto al botón.
 */
export function FormularioAccion({ accion, campos, csrf, texto, variante, confirmar }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});

  return (
    <form action={enviar} className="formulario-accion">
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      {Object.entries(campos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      {confirmar ? (
        <ConfirmarYEnviar
          textoBoton={texto}
          titulo={confirmar.titulo}
          descripcion={confirmar.descripcion}
          textoConfirmar={confirmar.textoConfirmar}
          peligro={variante === "peligro"}
        />
      ) : (
        <Boton type="submit" variante={variante} disabled={enviando}>
          {texto}
        </Boton>
      )}
      <Anuncio mensaje={estado.exito === false ? estado.mensaje : undefined} tipo="error" />
    </form>
  );
}

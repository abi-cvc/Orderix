"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import type { EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import { ETIQUETAS_PUNTAJE } from "@/modules/calificaciones/validadores";

type AccionCalificar = (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

const PUNTAJES = Object.keys(ETIQUETAS_PUNTAJE)
  .map(Number)
  .sort((a, b) => a - b);
const CARITAS = ["😣", "🙁", "😐", "🙂", "😄"];

export function FormularioCalificacion({
  accion,
  csrf,
  calificada,
}: {
  accion: AccionCalificar;
  csrf: string;
  /** El pedido ya tiene calificación (recién enviada o de antes). */
  calificada: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(accion, {});
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const tituloGracias = useRef<HTMLHeadingElement>(null);
  const errores = estado.errores?.puntaje;
  const idError = errores?.length ? "calificacion-puntaje-error" : undefined;

  useEffect(() => {
    if (estado.exito) tituloGracias.current?.focus();
  }, [estado.exito]);

  if (estado.exito || calificada) {
    return (
      <section className="calificacion-pantalla" aria-labelledby="calificacion-gracias">
        <div className="calificacion-panel calificacion-panel--gracias">
          <p className="calificacion__simbolo" aria-hidden="true">
            ✓
          </p>
          <h1 id="calificacion-gracias" ref={tituloGracias} tabIndex={-1}>
            ¡Gracias!
          </h1>
          <p>Tu opinión nos ayuda a brindar un mejor servicio.</p>
          <Link className="boton boton--primario calificacion__volver" href="/caja">
            Volver a Caja
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="calificacion-pantalla" aria-labelledby="calificacion-titulo">
      <div className="calificacion-panel">
        <p className="calificacion__sobrelinea">Orderix · Tu opinión importa</p>
        <h1 id="calificacion-titulo">¿Cómo fue tu experiencia?</h1>
        <p className="calificacion__indicacion">
          Selecciona una carita para calificar el servicio.
        </p>

        <form action={enviar} noValidate>
          <input type="hidden" name={CAMPO_CSRF} value={csrf} />
          <Anuncio mensaje={estado.exito === false ? estado.mensaje : undefined} tipo="error" />

          <fieldset
            className="calificacion-opciones"
            disabled={enviando}
            aria-describedby={idError}
            aria-invalid={idError ? true : undefined}
          >
            <legend className="solo-lector">Selecciona una calificación del 1 al 5</legend>
            {PUNTAJES.map((puntaje) => {
              const etiqueta = ETIQUETAS_PUNTAJE[puntaje];
              return (
                <label
                  className={`calificacion-opcion${seleccion === puntaje ? " calificacion-opcion--seleccionada" : ""}`}
                  key={puntaje}
                  htmlFor={`puntaje-${puntaje}`}
                >
                  <input
                    className="calificacion-radio"
                    id={`puntaje-${puntaje}`}
                    type="radio"
                    name="puntaje"
                    value={puntaje}
                    checked={seleccion === puntaje}
                    onChange={() => setSeleccion(puntaje)}
                    aria-label={`Carita ${puntaje} de 5: ${etiqueta}`}
                    aria-describedby={idError}
                    required
                  />
                  <span className="calificacion-cara" aria-hidden="true">
                    {CARITAS[puntaje - 1]}
                  </span>
                  <span className="calificacion-etiqueta">{etiqueta}</span>
                </label>
              );
            })}
          </fieldset>
          {idError && (
            <p className="campo__error" id={idError}>
              <span aria-hidden="true">⚠</span>
              <span>{errores?.join(" ")}</span>
            </p>
          )}

          <Boton
            className="calificacion__enviar"
            type="submit"
            disabled={seleccion === null || enviando}
          >
            {enviando ? "Enviando…" : "Enviar"}
          </Boton>
        </form>
      </div>
    </section>
  );
}

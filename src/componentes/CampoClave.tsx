"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Campo } from "./Campo";

/**
 * Campo de clave con botón para mostrarla u ocultarla (WCAG 3.3.8: ayuda a
 * escribirla bien sin tener que recordarla ni copiarla).
 *
 * - Botón con nombre fijo "Mostrar clave" y aria-pressed: el lector de pantalla
 *   anuncia "presionado / no presionado" en lugar de cambiar de nombre.
 * - El nombre va en texto oculto y no en aria-label, para que la etiqueta del
 *   campo siga siendo la única que contiene la palabra "clave".
 * - Al enviar el formulario la clave vuelve a ocultarse.
 */
export function CampoClave(props: Omit<ComponentProps<typeof Campo>, "type" | "accesorio">) {
  const [visible, setVisible] = useState(false);
  const contenedor = useRef<HTMLSpanElement>(null);
  const id = props.id ?? `campo-${props.nombre}`;

  useEffect(() => {
    const formulario = contenedor.current?.closest("form");
    if (!formulario) return;
    const ocultar = () => setVisible(false);
    formulario.addEventListener("submit", ocultar);
    return () => formulario.removeEventListener("submit", ocultar);
  }, []);

  return (
    <Campo
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      accesorio={
        <span ref={contenedor} className="campo__accesorio">
          <button
            type="button"
            className="ver-clave"
            aria-pressed={visible}
            aria-controls={id}
            onClick={() => setVisible((antes) => !antes)}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="M3 3l18 18" />}
            </svg>
            <span className="solo-lector">Mostrar clave</span>
          </button>
        </span>
      }
    />
  );
}

"use client";

import { useSonidoCocina } from "@/lib/sonido";

/**
 * Interruptor accesible para los avisos sonoros en la pantalla de cocina.
 * Sigue el patrón de SelectorTema con role="switch", aria-checked y foco visible.
 */
export function InterruptorSonido() {
  const { activado, alternar } = useSonidoCocina();

  return (
    <button
      className="tema-interruptor"
      type="button"
      role="switch"
      aria-checked={activado}
      onClick={alternar}
      title={activado ? "Desactivar avisos sonoros de cocina" : "Activar avisos sonoros de cocina"}
    >
      <span className="tema-interruptor__pista" aria-hidden="true" />
      Sonido
    </button>
  );
}

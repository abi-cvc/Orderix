"use client";

import { useSyncExternalStore } from "react";
import type { TipoEvento } from "@/modules/tiempo-real/eventos";

export const CLAVE_STORAGE_SONIDO_COCINA = "orderix_sonido_cocina";

export type TipoSonidoAviso = "pedido" | "alergia" | "confirmacion";

/**
 * Determina qué sonido corresponde a un evento de tiempo real.
 */
export function sonidoPorEvento(evento: TipoEvento): "pedido" | "alergia" | null {
  if (evento === "pedido.alergiaAgregada") return "alergia";
  if (evento === "pedido.creado") return "pedido";
  return null;
}

/**
 * Resuelve la prioridad en un lote de sonidos: una alergia siempre tiene
 * máxima prioridad sobre un pedido nuevo.
 */
export function resolverPrioridadSonido(
  sonidos: ("pedido" | "alergia" | null | undefined)[],
): "pedido" | "alergia" | null {
  if (sonidos.includes("alergia")) return "alergia";
  if (sonidos.includes("pedido")) return "pedido";
  return null;
}

/**
 * Consulta si el usuario activó los avisos sonoros de cocina en localStorage.
 */
export function estaSonidoCocinaActivado(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLAVE_STORAGE_SONIDO_COCINA) === "true";
  } catch {
    return false;
  }
}

/**
 * Guarda la preferencia de sonido en localStorage y notifica a los escuchas.
 */
export function guardarPreferenciaSonidoCocina(activado: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_STORAGE_SONIDO_COCINA, activado ? "true" : "false");
    window.dispatchEvent(new Event("orderix:sonido"));
  } catch {
    // Si localStorage está bloqueado, se omite silenciosamente
  }
}

// Instancia compartida del AudioContext para evitar crear múltiples contextos
let audioContextCompartido: AudioContext | null = null;

function obtenerAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContextCompartido || audioContextCompartido.state === "closed") {
    try {
      audioContextCompartido = new AudioCtx();
    } catch {
      return null;
    }
  }

  if (audioContextCompartido.state === "suspended") {
    audioContextCompartido.resume().catch(() => {});
  }

  return audioContextCompartido;
}

/**
 * Sintetiza un aviso sonoro usando Web Audio API sin requerir archivos externos ni romper la CSP.
 * Aplica curvas de ataque y decaimiento suaves para evitar chasquidos (clicks).
 */
export function reproducirTonoAviso(tipo: TipoSonidoAviso): void {
  const ctx = obtenerAudioContext();
  if (!ctx) return;

  const ahora = ctx.currentTime;

  if (tipo === "confirmacion") {
    // Tono corto y agradable para confirmar activación (Mi5 / 659.25 Hz)
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ahora);

    ganancia.gain.setValueAtTime(0, ahora);
    ganancia.gain.linearRampToValueAtTime(0.12, ahora + 0.015);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.15);

    osc.connect(ganancia);
    ganancia.connect(ctx.destination);

    osc.start(ahora);
    osc.stop(ahora + 0.15);
    osc.onended = () => {
      osc.disconnect();
      ganancia.disconnect();
    };
    return;
  }

  if (tipo === "pedido") {
    // Melodía ascendente suave de 2 notas (Do5 523.25 Hz -> Sol5 783.99 Hz)
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ahora);
    osc.frequency.setValueAtTime(783.99, ahora + 0.1);

    ganancia.gain.setValueAtTime(0, ahora);
    ganancia.gain.linearRampToValueAtTime(0.15, ahora + 0.02);
    ganancia.gain.setValueAtTime(0.15, ahora + 0.1);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.26);

    osc.connect(ganancia);
    ganancia.connect(ctx.destination);

    osc.start(ahora);
    osc.stop(ahora + 0.26);
    osc.onended = () => {
      osc.disconnect();
      ganancia.disconnect();
    };
    return;
  }

  if (tipo === "alergia") {
    // Tono urgente y notorio (3 pulsos o intervalo descendente con armónicos suaves: triángulo)
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, ahora); // La5
    osc.frequency.setValueAtTime(659.25, ahora + 0.12); // Mi5
    osc.frequency.setValueAtTime(880, ahora + 0.22); // La5

    ganancia.gain.setValueAtTime(0, ahora);
    ganancia.gain.linearRampToValueAtTime(0.18, ahora + 0.02);
    ganancia.gain.setValueAtTime(0.18, ahora + 0.22);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.36);

    osc.connect(ganancia);
    ganancia.connect(ctx.destination);

    osc.start(ahora);
    osc.stop(ahora + 0.36);
    osc.onended = () => {
      osc.disconnect();
      ganancia.disconnect();
    };
  }
}

// Estado para agrupar eventos simultáneos en lotes y resolver prioridad
let sonidoLotePendiente: "pedido" | "alergia" | null = null;
let temporizadorLote: ReturnType<typeof setTimeout> | null = null;

/**
 * Programa la reproducción de un sonido agrupando eventos en una ventana de 80 ms.
 * Si en el lote llega una alergia, se prioriza sobre el pedido nuevo.
 */
export function programarAvisoSonoro(tipo: "pedido" | "alergia"): void {
  if (sonidoLotePendiente !== "alergia") {
    sonidoLotePendiente = tipo;
  }

  if (temporizadorLote !== null) return;

  temporizadorLote = setTimeout(() => {
    const sonidoAReproducir = sonidoLotePendiente;
    sonidoLotePendiente = null;
    temporizadorLote = null;

    if (sonidoAReproducir && estaSonidoCocinaActivado()) {
      reproducirTonoAviso(sonidoAReproducir);
    }
  }, 80);
}

/**
 * Cancela cualquier aviso sonoro programado (útil en pruebas y desmontaje).
 */
export function cancelarAvisoSonoroPendiente(): void {
  if (temporizadorLote !== null) {
    clearTimeout(temporizadorLote);
    temporizadorLote = null;
  }
  sonidoLotePendiente = null;
}

function suscribirSonido(alCambiar: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("orderix:sonido", alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener("orderix:sonido", alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

function obtenerInstantaneaSonido(): boolean {
  return estaSonidoCocinaActivado();
}

function obtenerInstantaneaServidor(): boolean {
  return false;
}

/**
 * Hook para consultar y alternar el estado del interruptor de sonido de cocina.
 * Utiliza useSyncExternalStore para sincronizarse sin desfases ni renderizados en cascada.
 */
export function useSonidoCocina() {
  const activado = useSyncExternalStore(
    suscribirSonido,
    obtenerInstantaneaSonido,
    obtenerInstantaneaServidor,
  );

  const alternar = () => {
    const siguiente = !activado;
    guardarPreferenciaSonidoCocina(siguiente);
    if (siguiente) {
      reproducirTonoAviso("confirmacion");
    }
  };

  return { activado, alternar };
}

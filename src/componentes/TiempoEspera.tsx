"use client";

import { useEffect, useState } from "react";
import { nivelDeEspera } from "@/lib/espera";
import { hora, minutosDesde } from "@/lib/formato";

function minutosTranscurridos(desde: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 60_000));
}

/**
 * Hora del pedido y tiempo de espera, que se actualiza solo cada 30 segundos.
 * Los pedidos demorados o urgentes llevan una etiqueta con TEXTO y símbolo
 * (nunca solo color, WCAG 1.4.1). No es una región viva: anunciar cada
 * minuto sería ruido para un lector de pantalla.
 */
export function TiempoEspera({ desde }: { desde: string }) {
  const [minutos, setMinutos] = useState(() => minutosTranscurridos(desde));

  useEffect(() => {
    const intervalo = setInterval(() => setMinutos(minutosTranscurridos(desde)), 30_000);
    return () => clearInterval(intervalo);
  }, [desde]);

  const nivel = nivelDeEspera(minutos);
  return (
    <span className="tiempo-espera">
      {/* suppressHydrationWarning: el servidor y el navegador pueden diferir en un minuto. */}
      <time dateTime={desde} suppressHydrationWarning>
        {hora(desde)} ({minutosDesde(desde)})
      </time>
      {nivel !== "normal" && (
        <span className={`espera espera--${nivel}`} suppressHydrationWarning>
          <span aria-hidden="true">{nivel === "urgente" ? "⚠" : "◷"}</span>
          {nivel === "urgente" ? "Urgente" : "Demorado"}
        </span>
      )}
    </span>
  );
}

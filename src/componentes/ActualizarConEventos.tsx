"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ETIQUETA_ESTADO } from "@/lib/navegacion";
import { obtenerSocket } from "@/lib/socket-cliente";
import { estaSonidoCocinaActivado, programarAvisoSonoro } from "@/lib/sonido";
import type { EventosTiempoReal, TipoEvento } from "@/modules/tiempo-real/eventos";
import { Anuncio } from "./Anuncio";

interface Props {
  /** Eventos que refrescan esta pantalla. */
  eventos: TipoEvento[];
  /** Id del usuario actual: para avisar "tu pedido está listo" al mesero. */
  usuarioId?: number;
  /** Activa los avisos sonoros (usado en cocina). */
  sonido?: boolean;
}

/**
 * Escucha los avisos en tiempo real, vuelve a pedir la pantalla al servidor
 * (router.refresh) y anuncia el cambio sin mover el foco. Una alergia nueva
 * se anuncia como alerta.
 */
export function ActualizarConEventos({ eventos, usuarioId, sonido }: Props) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string>();
  const [alerta, setAlerta] = useState<string>();
  const [sinConexion, setSinConexion] = useState(false);
  const clave = eventos.join(",");

  useEffect(() => {
    const socket = obtenerSocket();
    const suscritos = clave.split(",") as TipoEvento[];

    const manejadores: Partial<Record<TipoEvento, (datos: never) => void>> = {
      "pedido.creado": (d: EventosTiempoReal["pedido.creado"]) => {
        setAviso(
          `Nuevo pedido ${d.pedidoId} para la mesa ${d.numeroMesa}${d.tieneAlergias ? ", con alergias" : ""}.`,
        );
        if (sonido && estaSonidoCocinaActivado()) {
          programarAvisoSonoro(d.tieneAlergias ? "alergia" : "pedido");
        }
        router.refresh();
      },
      "pedido.estadoCambiado": (d: EventosTiempoReal["pedido.estadoCambiado"]) => {
        const estado = ETIQUETA_ESTADO[d.estadoNuevo].texto.toLowerCase();
        setAviso(
          d.estadoNuevo === "LISTO" && d.meseroId === usuarioId
            ? `¡El pedido ${d.pedidoId} de la mesa ${d.numeroMesa} está listo para entregar!`
            : `Pedido ${d.pedidoId} (mesa ${d.numeroMesa}): ${estado}.`,
        );
        router.refresh();
      },
      "pedido.alergiaAgregada": (d: EventosTiempoReal["pedido.alergiaAgregada"]) => {
        setAlerta(
          `ALERGIA en la mesa ${d.numeroMesa}, pedido ${d.pedidoId}: ${d.nombreProducto}, ${d.alergias}.`,
        );
        if (sonido && estaSonidoCocinaActivado()) {
          programarAvisoSonoro("alergia");
        }
        router.refresh();
      },
    };

    const conectado = () => setSinConexion(false);
    const error = () => setSinConexion(true);
    socket.on("connect", conectado);
    socket.on("connect_error", error);
    for (const tipo of suscritos) {
      const manejador = manejadores[tipo];
      if (manejador) socket.on(tipo, manejador as (...args: unknown[]) => void);
    }
    return () => {
      socket.off("connect", conectado);
      socket.off("connect_error", error);
      for (const tipo of suscritos) {
        const manejador = manejadores[tipo];
        if (manejador) socket.off(tipo, manejador as (...args: unknown[]) => void);
      }
    };
  }, [clave, router, usuarioId, sonido]);

  return (
    <div className="avisos-tiempo-real">
      <Anuncio mensaje={alerta} tipo="alergia" />
      <Anuncio mensaje={aviso} tipo="estado" />
      {sinConexion && (
        <p className="campo__ayuda">
          Sin conexión en tiempo real. Recarga la página para ver los cambios.
        </p>
      )}
    </div>
  );
}

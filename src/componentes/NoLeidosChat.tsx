"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  calcularNoLeidosAlRecibir,
  esRutaChat,
  formatearAriaLabelChat,
  formatearInsigniaNoLeidos,
} from "@/lib/chat-no-leidos";
import { obtenerSocket } from "@/lib/socket-cliente";
import type { MensajeGuardado } from "@/modules/tiempo-real";

interface ContextoNoLeidosValor {
  noLeidos: number;
  reiniciar: () => void;
  formatearInsignia: (cantidad: number) => string;
  formatearAriaLabel: (cantidad: number, etiquetaBase?: string) => string;
}

const ContextoNoLeidos = createContext<ContextoNoLeidosValor>({
  noLeidos: 0,
  reiniciar: () => {},
  formatearInsignia: formatearInsigniaNoLeidos,
  formatearAriaLabel: formatearAriaLabelChat,
});

export function useNoLeidos() {
  return useContext(ContextoNoLeidos);
}

interface Props {
  usuarioActualId: number;
  children: ReactNode;
}

/**
 * Proveedor de mensajes no leídos del chat general.
 * Escucha eventos `chat:mensaje` mediante la conexión Socket.IO compartida
 * y reinicia el contador al navegar a `/chat`.
 */
export function ProveedorNoLeidos({ usuarioActualId, children }: Props) {
  const ruta = usePathname();
  const [rutaAnterior, setRutaAnterior] = useState(ruta);
  const [noLeidos, setNoLeidos] = useState(0);

  if (ruta !== rutaAnterior) {
    setRutaAnterior(ruta);
    if (esRutaChat(ruta)) {
      setNoLeidos(0);
    }
  }

  useEffect(() => {
    const socket = obtenerSocket();

    const alRecibirMensaje = (mensaje: MensajeGuardado) => {
      setNoLeidos((actual) =>
        calcularNoLeidosAlRecibir(actual, mensaje, usuarioActualId, ruta),
      );
    };

    socket.on("chat:mensaje", alRecibirMensaje);

    return () => {
      socket.off("chat:mensaje", alRecibirMensaje);
    };
  }, [ruta, usuarioActualId]);

  const reiniciar = () => setNoLeidos(0);

  return (
    <ContextoNoLeidos.Provider
      value={{
        noLeidos,
        reiniciar,
        formatearInsignia: formatearInsigniaNoLeidos,
        formatearAriaLabel: formatearAriaLabelChat,
      }}
    >
      {children}
    </ContextoNoLeidos.Provider>
  );
}

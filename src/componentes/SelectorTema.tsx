"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";

const ContextoTema = createContext<{
  claro: boolean;
  alternar: () => void;
} | null>(null);

export function ProveedorTema({ inicial, children }: { inicial: Tema; children: ReactNode }) {
  const [tema, setTema] = useState(inicial);
  const claro = tema === "claro";

  function alternar() {
    const siguiente = claro ? "oscuro" : "claro";
    document.documentElement.dataset.tema = siguiente;
    const seguro = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_TEMA}=${siguiente}; Path=/; Max-Age=31536000; SameSite=Lax${seguro}`;
    setTema(siguiente);
  }

  return <ContextoTema value={{ claro, alternar }}>{children}</ContextoTema>;
}

export function SelectorTema() {
  const tema = useContext(ContextoTema);
  if (!tema) return null;

  return (
    <button
      className="tema-interruptor"
      type="button"
      role="switch"
      aria-checked={tema.claro}
      onClick={tema.alternar}
    >
      <span className="tema-interruptor__pista" aria-hidden="true" />
      Modo claro
    </button>
  );
}

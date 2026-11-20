import type { ReactNode } from "react";
import { SelectorTema } from "@/componentes/SelectorTema";
import { Marca } from "@/componentes/Marca";

export default function LayoutAutenticacion({ children }: { children: ReactNode }) {
  return (
    <div className="acceso-cuenta">
      <div className="acceso-cuenta__foto" aria-hidden="true" />
      <div className="acceso-cuenta__panel">
        <header className="acceso-cuenta__cabecera">
          <Marca href="/login" />
          <SelectorTema />
        </header>
        <main id="contenido" className="contenido autenticacion" tabIndex={-1}>
          {children}
        </main>
        <footer className="acceso-cuenta__pie">
          <p>
            <strong>¿Necesitas ayuda?</strong> Pide apoyo al administrador del restaurante.
          </p>
        </footer>
      </div>
    </div>
  );
}

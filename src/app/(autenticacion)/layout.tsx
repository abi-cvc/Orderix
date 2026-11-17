import Link from "next/link";
import type { ReactNode } from "react";

export default function LayoutAutenticacion({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="encabezado">
        <div className="encabezado__barra">
          <Link href="/login" className="marca">
            Orderix
          </Link>
        </div>
      </header>
      <main id="contenido" className="contenido autenticacion" tabIndex={-1}>
        {children}
      </main>
      <footer className="pie">
        <div className="pie__interior">
          <p>
            <strong>¿Necesitas ayuda?</strong> Pide apoyo al administrador del restaurante.
          </p>
        </div>
      </footer>
    </>
  );
}

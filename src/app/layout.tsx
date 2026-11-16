import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Todas las páginas se renderizan en cada petición: la CSP usa un nonce nuevo
// por petición (ver src/lib/seguridad/cabeceras.ts) y una página pregenerada
// no lo llevaría, así que el navegador bloquearía sus scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Orderix",
    template: "%s | Orderix",
  },
  description: "Gestión de pedidos y cocina para restaurantes",
};

// Sin maximum-scale ni user-scalable=no: el usuario siempre puede hacer zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* Primer elemento enfocable de toda página (WCAG 2.4.1). */}
        <a href="#contenido" className="saltar">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

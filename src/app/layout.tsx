import type { Metadata } from "next";
import type { ReactNode } from "react";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

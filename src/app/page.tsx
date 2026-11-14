import type { Metadata } from "next";

export const metadata: Metadata = {
  // La plantilla del layout no aplica a la página raíz (mismo segmento).
  title: { absolute: "Inicio | Orderix" },
};

export default function InicioPage() {
  return (
    <main>
      <h1>Orderix</h1>
      <p>Gestión de pedidos y cocina para restaurantes.</p>
    </main>
  );
}

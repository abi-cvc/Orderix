import type { Metadata } from "next";
import { usuarioDePagina } from "@/lib/pagina";
import { ChatCliente } from "./ChatCliente";

export const metadata: Metadata = { title: "Chat general" };

/**
 * Pantalla del chat general del restaurante.
 * Accesible para cualquier usuario con sesión activa (mesero, cocina, caja, admin).
 */
export default async function ChatPage() {
  const usuario = await usuarioDePagina();

  return (
    <>
      <header className="pagina-cabecera">
        <h1>Chat general</h1>
        <p>Coordina el servicio con el equipo del restaurante.</p>
      </header>
      <ChatCliente usuarioActualId={usuario.id} />
    </>
  );
}

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
      <div className="titulo-con-accion">
        <h1>Chat general</h1>
      </div>
      <p>Coordinación en tiempo real para todo el equipo del restaurante.</p>
      <ChatCliente usuarioActualId={usuario.id} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { navegacionPara } from "@/lib/navegacion";
import { usuarioDePagina } from "@/lib/pagina";

export const metadata: Metadata = {
  // La plantilla del layout no aplica a la página raíz (mismo segmento).
  title: { absolute: "Inicio | Orderix" },
};

/** Qué puede hacer cada rol desde cada sección (texto de las tarjetas de inicio). */
const DESCRIPCION: Record<string, string> = {
  "/pedidos": "Crea y consulta pedidos, agrega ítems, alergias y notas.",
  "/cocina": "Cola de pedidos pendientes, alergias resaltadas y cambio de estado.",
  "/caja": "Cobra los pedidos entregados y cierra su ciclo.",
  "/menu": "Administra los productos del menú.",
  "/usuarios": "Administra el personal y sus roles.",
  "/chat": "Conversa con todo el personal del restaurante.",
};

export default async function InicioPage() {
  const usuario = await usuarioDePagina();
  const secciones = navegacionPara(usuario.rol).filter(({ href }) => href !== "/");

  return (
    <>
      <h1>Hola, {usuario.nombre}</h1>
      <p>Elige a dónde quieres ir.</p>
      <ul className="rejilla">
        {secciones.map(({ href, etiqueta }) => (
          <li key={href} className="tarjeta">
            <h2>
              <Link href={href}>{etiqueta}</Link>
            </h2>
            <p>{DESCRIPCION[href]}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

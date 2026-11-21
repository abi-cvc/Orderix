import type { Metadata } from "next";
import Link from "next/link";
import { IconoSeccion } from "@/componentes/IconoSeccion";
import { Rol } from "@/generated/prisma/enums";
import { ETIQUETA_ROL, navegacionPara } from "@/lib/navegacion";
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
      <header className="inicio-portada">
        <div className="inicio-portada__contenido">
          <p className="rotulo">{ETIQUETA_ROL[usuario.rol]}</p>
          <h1>Hola, {usuario.nombre}</h1>
          {usuario.rol === Rol.MESERO && (
            <Link href="/pedidos/nuevo" className="boton boton--primario">
              <span aria-hidden="true">+</span> Nuevo pedido
            </Link>
          )}
        </div>
      </header>
      <section className="inicio-secciones" aria-labelledby="inicio-secciones">
        <h2 id="inicio-secciones">Áreas de trabajo</h2>
        <ul className="rejilla">
          {secciones.map(({ href, etiqueta }) => (
            <li key={href}>
              <Link href={href} className="acceso">
                <div className="acceso__icono">
                  <IconoSeccion ruta={href} />
                </div>
                <h3>{etiqueta}</h3>
                <p>{DESCRIPCION[href]}</p>
                <span className="acceso__flecha" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

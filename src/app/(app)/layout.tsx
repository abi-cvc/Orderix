import Link from "next/link";
import type { ReactNode } from "react";
import { NavegacionPrincipal } from "@/componentes/NavegacionPrincipal";
import { ETIQUETA_ROL, navegacionPara } from "@/lib/navegacion";
import { usuarioDePagina } from "@/lib/pagina";

/**
 * Estructura de todas las pantallas con sesión: encabezado con navegación por
 * rol, contenido principal y pie con ayuda (siempre en el mismo lugar, WCAG 3.2.6).
 * Sin sesión, redirige a /login.
 */
export default async function LayoutAplicacion({ children }: { children: ReactNode }) {
  const usuario = await usuarioDePagina();
  const elementos = navegacionPara(usuario.rol).map(({ href, etiqueta }) => ({ href, etiqueta }));

  return (
    <>
      <header className="encabezado">
        <div className="encabezado__barra">
          <Link href="/" className="marca">
            Orderix
          </Link>
          <NavegacionPrincipal elementos={elementos} />
          <p className="usuario-actual">
            <span className="solo-lector">Sesión iniciada como </span>
            {usuario.nombre} · {ETIQUETA_ROL[usuario.rol]}
          </p>
          {/* Frente A (Alejandro): aquí va el formulario de "Cerrar sesión". */}
        </div>
      </header>

      <main id="contenido" className="contenido" tabIndex={-1}>
        {children}
      </main>

      <footer className="pie">
        <div className="pie__interior">
          <p>
            <strong>¿Necesitas ayuda?</strong> Escribe en el <Link href="/chat">chat general</Link>{" "}
            o pide apoyo al administrador del restaurante.
          </p>
        </div>
      </footer>
    </>
  );
}

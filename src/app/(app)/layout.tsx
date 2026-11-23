import Link from "next/link";
import type { ReactNode } from "react";
import { SelectorTema } from "@/componentes/SelectorTema";
import { Marca } from "@/componentes/Marca";
import { NavegacionPrincipal } from "@/componentes/NavegacionPrincipal";
import { FormularioCerrarSesion } from "@/componentes/FormularioCerrarSesion";
import { ProveedorNoLeidos } from "@/componentes/NoLeidosChat";
import { tokenCsrf } from "@/modules/autenticacion";
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
    <ProveedorNoLeidos usuarioActualId={usuario.id}>
      <div className="aplicacion">
        <header className="encabezado">
          <div className="encabezado__barra">
            <Marca href="/" />
            <NavegacionPrincipal elementos={elementos} />
            <div className="sesion">
              <p className="usuario-actual">
                <span className="solo-lector">Sesión iniciada como </span>
                <span>{usuario.nombre}</span>
                <span className="usuario-actual__rol">{ETIQUETA_ROL[usuario.rol]}</span>
              </p>
              <div className="sesion__acciones">
                <SelectorTema />
                <FormularioCerrarSesion csrf={await tokenCsrf()} />
              </div>
            </div>
          </div>
        </header>

        <div className="aplicacion__panel">
          <main id="contenido" className="contenido" tabIndex={-1}>
            {children}
          </main>
          <footer className="pie">
            <div className="pie__interior">
              <p>
                <strong>¿Necesitas ayuda?</strong> Escribe en el{" "}
                <Link href="/chat">chat general</Link> o pide apoyo al administrador del restaurante.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ProveedorNoLeidos>
  );
}

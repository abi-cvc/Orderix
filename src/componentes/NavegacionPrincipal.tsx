"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconoSeccion } from "./IconoSeccion";

interface Props {
  elementos: { href: string; etiqueta: string }[];
}

/**
 * Navegación principal. En celular y tablet se pliega detrás del botón "Menú";
 * desde 1024px se muestra siempre. Marca la página actual con aria-current.
 * Escape cierra el menú abierto y devuelve el foco al botón.
 */
export function NavegacionPrincipal({ elementos }: Props) {
  const ruta = usePathname();
  const [abierta, setAbierta] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierta(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierta]);

  const esActual = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="boton boton--secundario nav__alternar"
        aria-expanded={abierta}
        aria-controls="navegacion-principal"
        onClick={() => setAbierta((valor) => !valor)}
      >
        <span className="nav__icono-menu" aria-hidden="true" />
        {abierta ? "Cerrar menú" : "Menú"}
      </button>
      <nav id="navegacion-principal" className="nav" aria-label="Principal" data-abierta={abierta}>
        <ul className="nav__lista">
          {elementos.map(({ href, etiqueta }) => (
            <li key={href}>
              <Link
                href={href}
                className="nav__enlace"
                aria-current={esActual(href) ? "page" : undefined}
                onClick={() => setAbierta(false)}
              >
                <IconoSeccion ruta={href} />
                {etiqueta}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

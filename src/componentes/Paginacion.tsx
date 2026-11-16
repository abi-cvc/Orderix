import Link from "next/link";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  /** Ruta del listado; se conservan los demás filtros de la URL. */
  ruta: string;
  parametros?: Record<string, string | undefined>;
}

/**
 * Paginación por enlaces (?pagina=N): funciona sin JavaScript, se puede
 * compartir la URL y el servidor solo trae las filas de esa página.
 */
export function Paginacion({ paginaActual, totalPaginas, ruta, parametros = {} }: Props) {
  if (totalPaginas <= 1) return null;

  const enlace = (pagina: number) => {
    const consulta = new URLSearchParams();
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor) consulta.set(clave, valor);
    }
    consulta.set("pagina", String(pagina));
    return `${ruta}?${consulta.toString()}`;
  };

  return (
    <nav aria-label="Paginación">
      <ul className="paginacion__lista">
        <li>
          {paginaActual > 1 ? (
            <Link className="boton boton--secundario" href={enlace(paginaActual - 1)}>
              <span aria-hidden="true">←</span> Anterior
            </Link>
          ) : null}
        </li>
        <li className="paginacion__actual" aria-current="page">
          Página {paginaActual} de {totalPaginas}
        </li>
        <li>
          {paginaActual < totalPaginas ? (
            <Link className="boton boton--secundario" href={enlace(paginaActual + 1)}>
              Siguiente <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}

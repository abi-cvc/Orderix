import type { ReactNode } from "react";

export interface Columna<T> {
  titulo: string;
  /** Contenido de la celda para una fila. */
  celda: (fila: T) => ReactNode;
}

interface Props<T> {
  /** Título de la tabla (caption): lo anuncia el lector de pantalla. */
  titulo: string;
  columnas: Columna<T>[];
  filas: T[];
  claveFila: (fila: T) => string | number;
  /** Texto cuando no hay filas. */
  vacio?: string;
}

/**
 * Tabla con encabezados (th scope="col") que en celular se muestra como
 * tarjetas: cada celda repite su encabezado (data-etiqueta) y no hay
 * desplazamiento horizontal a 320px. Desde 640px es una tabla normal.
 */
export function TablaAdaptable<T>({ titulo, columnas, filas, claveFila, vacio }: Props<T>) {
  if (filas.length === 0) {
    return <p>{vacio ?? "No hay resultados."}</p>;
  }
  return (
    <table className="tabla-adaptable">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          {columnas.map((columna) => (
            <th key={columna.titulo} scope="col">
              {columna.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila) => (
          <tr key={claveFila(fila)}>
            {columnas.map((columna) => (
              <td key={columna.titulo} data-etiqueta={columna.titulo}>
                {columna.celda(fila)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

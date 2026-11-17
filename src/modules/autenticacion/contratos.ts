/**
 * Contratos que autenticacion ofrece a otros módulos (además de la sesión).
 */
import * as repositorio from "./repositorio";

/**
 * CONTRATO (pedidos): nombre de cada usuario por id, para el historial de
 * cambios de estado. Los ids que no existen no vienen en el resultado.
 */
export async function obtenerNombresDeUsuarios(ids: number[]): Promise<Map<number, string>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const filas = await repositorio.buscarNombres(unicos);
  return new Map(filas.map((fila) => [fila.id, fila.nombre]));
}

import { notFound, redirect } from "next/navigation";
import type { Rol } from "@/generated/prisma/enums";
import { ErrorNoAutenticado, ErrorProhibido } from "@/lib/errores";
import { requireRole, type UsuarioSesion } from "@/modules/autenticacion";

/**
 * Primera línea de toda página protegida:
 *   const usuario = await usuarioDePagina("COCINA");
 *
 * Sin sesión → redirige a /login. Con un rol no permitido → 404: no se revela
 * que la pantalla existe. (Las acciones de servidor usan requireRole directo.)
 */
export async function usuarioDePagina(...roles: Rol[]): Promise<UsuarioSesion> {
  try {
    return await requireRole(...roles);
  } catch (error) {
    if (error instanceof ErrorNoAutenticado) redirect("/login");
    if (error instanceof ErrorProhibido) notFound();
    throw error;
  }
}

/**
 * Número de página de la URL (?pagina=3). Cualquier valor inválido es la página 1.
 * Uso: `const pagina = numeroDePagina((await searchParams).pagina);`
 */
export function numeroDePagina(valor: string | string[] | undefined): number {
  const numero = Number(Array.isArray(valor) ? valor[0] : valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 1;
}

/** Filas por página en todos los listados (paginación en el servidor). */
export const FILAS_POR_PAGINA = 15;

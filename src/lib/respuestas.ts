import { NextResponse } from "next/server";
import {
  ErrorConflicto,
  ErrorDominio,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorProhibido,
  ErrorValidacion,
} from "@/lib/errores";
import { ErrorLimiteIntentos } from "@/lib/seguridad/limite";

/**
 * Traduce un error lanzado por un servicio a una respuesta JSON para las rutas
 * de /api. Los errores de dominio llevan un mensaje apto para el usuario; los
 * demás se registran en el servidor y se responden con un mensaje genérico,
 * sin detalles internos.
 */
export function respuestaDeError(error: unknown): NextResponse {
  if (error instanceof ErrorValidacion) {
    return NextResponse.json({ error: error.message, campos: error.campos }, { status: 400 });
  }
  if (error instanceof ErrorLimiteIntentos) {
    // 429 + Retry-After: el cliente sabe cuántos segundos esperar.
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.reintentarEnSegundos) } },
    );
  }
  if (error instanceof ErrorDominio) {
    const estado =
      error instanceof ErrorNoAutenticado
        ? 401
        : error instanceof ErrorProhibido
          ? 403
          : error instanceof ErrorNoEncontrado
            ? 404
            : error instanceof ErrorConflicto
              ? 409
              : 400;
    return NextResponse.json({ error: error.message }, { status: estado });
  }
  console.error("Error inesperado", error);
  return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
}

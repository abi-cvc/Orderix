import { NextResponse } from "next/server";
import { respuestaDeError } from "@/lib/respuestas";
import { requireRole } from "@/modules/autenticacion";

export const dynamic = "force-dynamic";

/**
 * Usuario de la sesión actual: { id, nombre, rol }. 401 si no hay sesión.
 * Sirve a la interfaz para saber quién está conectado.
 */
export async function GET() {
  try {
    const usuario = await requireRole();
    return NextResponse.json(usuario, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return respuestaDeError(error);
  }
}

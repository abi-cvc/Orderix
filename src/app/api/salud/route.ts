import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Endpoint de salud: lo usan Render (health check), docker-compose y, en el
 * segundo bimestre, el gateway. No expone detalles internos del error.
 */
export async function GET() {
  try {
    await prisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: "ok", baseDatos: "conectada" });
  } catch (error) {
    console.error("Salud: la base de datos no responde", (error as Error).message);
    return NextResponse.json({ estado: "error", baseDatos: "sin conexión" }, { status: 503 });
  }
}

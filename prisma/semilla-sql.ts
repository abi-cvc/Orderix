/**
 * Genera la semilla base como SQL, para pegarla en el SQL Editor de Neon
 * cuando la red no deja conectarse al puerto 5432 desde la PC.
 *
 * Uso (Git Bash):
 *   SEED_PASSWORD='clave-de-demo' npx tsx prisma/semilla-sql.ts > ~/Desktop/semilla.sql
 *
 * Las claves salen ya hasheadas con Argon2id (una sal distinta por usuario).
 * Se puede ejecutar varias veces sin duplicar datos. Las tablas deben existir
 * (las crea `prisma migrate deploy`, que Render corre al arrancar).
 */
import { hashearClave } from "@/lib/hash";
import { CLAVE_DEMO, PRODUCTOS, USUARIOS } from "./datos-semilla";

/** Literal SQL seguro: comillas simples duplicadas. */
const texto = (valor: string | null) =>
  valor === null ? "NULL" : `'${valor.replace(/'/g, "''")}'`;

async function main(): Promise<void> {
  const clave = process.env.SEED_PASSWORD;
  if (!clave || clave.length < 10 || clave === CLAVE_DEMO) {
    throw new Error(
      "Define SEED_PASSWORD con una clave propia de al menos 10 caracteres (no la de desarrollo).",
    );
  }

  const usuarios = await Promise.all(
    USUARIOS.map(
      async (u) =>
        `  (${texto(u.nombre)}, ${texto(u.correo)}, ${texto(await hashearClave(clave))}, ${texto(u.rol)})`,
    ),
  );
  const productos = PRODUCTOS.map(
    (p) =>
      `  (${texto(p.nombre)}, ${texto(p.descripcion)}, ${texto(p.categoria)}, ${p.precio}, now())`,
  );

  console.log(`-- Semilla base de Orderix (datos ficticios). Generada: ${new Date().toISOString()}
BEGIN;

INSERT INTO "usuarios" ("nombre", "correo", "hashClave", "rol") VALUES
${usuarios.join(",\n")}
ON CONFLICT ("correo") DO NOTHING;

INSERT INTO "productos" ("nombre", "descripcion", "categoria", "precio", "actualizadoEn")
SELECT * FROM (VALUES
${productos.join(",\n")}
) AS nuevos
WHERE NOT EXISTS (SELECT 1 FROM "productos");

INSERT INTO "salas" ("nombre") VALUES ('general') ON CONFLICT ("nombre") DO NOTHING;

COMMIT;

SELECT (SELECT count(*) FROM "usuarios") AS usuarios,
       (SELECT count(*) FROM "productos") AS productos,
       (SELECT count(*) FROM "salas") AS salas;`);
}

main().catch((error: unknown) => {
  console.error("No se pudo generar la semilla:", error instanceof Error ? error.message : error);
  process.exit(1);
});

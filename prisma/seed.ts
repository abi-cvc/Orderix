/**
 * Semilla base de Orderix: un usuario por rol (dos meseros), productos de
 * ejemplo y la sala general del chat.
 *
 * Todos los datos son ficticios. Se puede ejecutar varias veces sin duplicar.
 * Uso: npm run db:seed
 */
import { hashearClave } from "@/lib/hash";
import { crearClienteScript } from "./cliente-script";
import { CLAVE_DEMO, PRODUCTOS, USUARIOS } from "./datos-semilla";

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
    throw new Error(
      "En producción la semilla exige SEED_PASSWORD (no se usa la clave de demostración)",
    );
  }

  const prisma = crearClienteScript();
  try {
    const clave = process.env.SEED_PASSWORD ?? CLAVE_DEMO;

    for (const usuario of USUARIOS) {
      const existe = await prisma.usuario.findUnique({ where: { correo: usuario.correo } });
      if (existe) continue;
      // Un hash por usuario: cada uno con su propia sal aleatoria.
      await prisma.usuario.create({ data: { ...usuario, hashClave: await hashearClave(clave) } });
    }

    if ((await prisma.producto.count()) === 0) {
      await prisma.producto.createMany({ data: PRODUCTOS });
    }

    await prisma.sala.upsert({
      where: { nombre: "general" },
      update: {},
      create: { nombre: "general" },
    });

    const [usuarios, productos, salas] = await Promise.all([
      prisma.usuario.count(),
      prisma.producto.count(),
      prisma.sala.count(),
    ]);
    console.log(`Semilla lista: ${usuarios} usuarios, ${productos} productos, ${salas} sala(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Falló la semilla:", error instanceof Error ? error.message : error);
  process.exit(1);
});

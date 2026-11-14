/**
 * Semilla base de Orderix: un usuario por rol (dos meseros), productos de
 * ejemplo y la sala general del chat.
 *
 * Todos los datos son ficticios. Se puede ejecutar varias veces sin duplicar.
 * Uso: npm run db:seed
 */
import { Rol } from "@/generated/prisma/client";
import { hashearClave } from "@/lib/hash";
import { crearClienteScript } from "./cliente-script";

// Clave de demostración SOLO para desarrollo y la defensa. Se puede cambiar con
// SEED_PASSWORD. No es un secreto: cualquiera que lea el repositorio la conoce,
// por eso la semilla se niega a correr en producción sin SEED_PASSWORD propia.
const CLAVE_DEMO = "orderix-demo-2026";

const USUARIOS: { nombre: string; correo: string; rol: Rol }[] = [
  { nombre: "Lucía Andrade", correo: "mesero@orderix.test", rol: Rol.MESERO },
  { nombre: "Carlos Benítez", correo: "mesero2@orderix.test", rol: Rol.MESERO },
  { nombre: "Diego Paredes", correo: "cocina@orderix.test", rol: Rol.COCINA },
  { nombre: "Sofía Cevallos", correo: "cajero@orderix.test", rol: Rol.CAJERO },
  { nombre: "Andrea Molina", correo: "admin@orderix.test", rol: Rol.ADMINISTRADOR },
];

const PRODUCTOS = [
  {
    nombre: "Empanadas de viento",
    categoria: "Entradas",
    precio: "3.50",
    descripcion: "Dos empanadas con queso y azúcar",
  },
  {
    nombre: "Ceviche de camarón",
    categoria: "Entradas",
    precio: "8.90",
    descripcion: "Con chifles y canguil",
  },
  {
    nombre: "Locro de papa",
    categoria: "Entradas",
    precio: "4.75",
    descripcion: "Con queso, aguacate y maíz tostado",
  },
  {
    nombre: "Encebollado",
    categoria: "Platos fuertes",
    precio: "6.50",
    descripcion: "Albacora, yuca y cebolla curtida",
  },
  {
    nombre: "Llapingachos",
    categoria: "Platos fuertes",
    precio: "7.25",
    descripcion: "Tortillas de papa con chorizo y huevo",
  },
  {
    nombre: "Seco de pollo",
    categoria: "Platos fuertes",
    precio: "7.80",
    descripcion: "Con arroz amarillo y maduro",
  },
  {
    nombre: "Hornado",
    categoria: "Platos fuertes",
    precio: "9.50",
    descripcion: "Cerdo horneado con mote y agrio",
  },
  { nombre: "Jugo de naranjilla", categoria: "Bebidas", precio: "2.25", descripcion: null },
  { nombre: "Limonada", categoria: "Bebidas", precio: "2.00", descripcion: null },
  { nombre: "Café pasado", categoria: "Bebidas", precio: "1.75", descripcion: null },
  {
    nombre: "Higos con queso",
    categoria: "Postres",
    precio: "3.90",
    descripcion: "Higos en almíbar con queso fresco",
  },
  {
    nombre: "Helado de paila",
    categoria: "Postres",
    precio: "3.25",
    descripcion: "Sabor a mora o guanábana",
  },
];

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

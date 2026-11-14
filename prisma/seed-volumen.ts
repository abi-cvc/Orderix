/**
 * Semilla de volumen: ~10.000 pedidos ficticios con sus ítems, repartidos en los
 * últimos 90 días, para medir el rendimiento del listado con y sin índices.
 *
 * Requiere haber corrido antes la semilla base (usuarios y productos).
 * Uso: npm run db:seed:volumen            (10.000 pedidos)
 *      npm run db:seed:volumen -- 2000    (otra cantidad)
 */
import { EstadoPedido, Prisma, Rol } from "@/generated/prisma/client";
import { crearClienteScript } from "./cliente-script";

const CANTIDAD = Number(process.argv[2] ?? 10_000);
const LOTE = 1_000;
const MESAS = 12;
const DIAS = 90;

// Distribución aproximada: la mayoría de pedidos históricos ya están cobrados.
const ESTADOS: [EstadoPedido, number][] = [
  [EstadoPedido.COBRADO, 0.82],
  [EstadoPedido.CANCELADO, 0.06],
  [EstadoPedido.ENTREGADO, 0.04],
  [EstadoPedido.LISTO, 0.03],
  [EstadoPedido.EN_PREPARACION, 0.03],
  [EstadoPedido.CREADO, 0.02],
];

const ALERGIAS = ["maní", "mariscos", "lactosa", "gluten"];

function azar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]!;
}

function estadoAlAzar(): EstadoPedido {
  let r = Math.random();
  for (const [estado, peso] of ESTADOS) {
    if ((r -= peso) <= 0) return estado;
  }
  return EstadoPedido.COBRADO;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("La semilla de volumen no se ejecuta en producción");
  }
  if (!Number.isInteger(CANTIDAD) || CANTIDAD <= 0) {
    throw new Error("La cantidad debe ser un entero positivo");
  }

  const prisma = crearClienteScript();
  try {
    const meseros = await prisma.usuario.findMany({
      where: { rol: Rol.MESERO },
      select: { id: true, nombre: true },
    });
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true, precio: true },
    });
    if (meseros.length === 0 || productos.length === 0) {
      throw new Error("Primero corre la semilla base: npm run db:seed");
    }

    const inicio = Date.now();
    const ahora = Date.now();

    for (let hechos = 0; hechos < CANTIDAD; hechos += LOTE) {
      const tamano = Math.min(LOTE, CANTIDAD - hechos);

      // Ítems de cada pedido, calculados antes para conocer el total.
      const itemsPorPedido = Array.from({ length: tamano }, () =>
        Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => {
          const producto = azar(productos);
          return {
            productoId: producto.id,
            nombreProducto: producto.nombre,
            cantidad: 1 + Math.floor(Math.random() * 3),
            precioUnitario: producto.precio,
            alergias: Math.random() < 0.08 ? azar(ALERGIAS) : null,
          };
        }),
      );

      const pedidos = await prisma.pedido.createManyAndReturn({
        select: { id: true, creadoEn: true },
        data: itemsPorPedido.map((items) => {
          const mesero = azar(meseros);
          const estado = estadoAlAzar();
          const creadoEn = new Date(ahora - Math.random() * DIAS * 24 * 60 * 60 * 1000);
          const total = items.reduce(
            (suma, item) => suma.add(item.precioUnitario.mul(item.cantidad)),
            new Prisma.Decimal(0),
          );
          const cerrado = estado === EstadoPedido.COBRADO || estado === EstadoPedido.CANCELADO;
          return {
            numeroMesa: 1 + Math.floor(Math.random() * MESAS),
            meseroId: mesero.id,
            meseroNombre: mesero.nombre,
            estado,
            total,
            creadoEn,
            cerradoEn: cerrado ? new Date(creadoEn.getTime() + 45 * 60 * 1000) : null,
          };
        }),
      });

      await prisma.itemPedido.createMany({
        data: pedidos.flatMap((pedido, i) =>
          itemsPorPedido[i]!.map((item) => ({
            ...item,
            pedidoId: pedido.id,
            agregadoEn: pedido.creadoEn,
          })),
        ),
      });

      console.log(`  ${hechos + tamano} / ${CANTIDAD} pedidos`);
    }

    console.log(`Listo en ${((Date.now() - inicio) / 1000).toFixed(1)} s.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Falló la semilla de volumen:", error instanceof Error ? error.message : error);
  process.exit(1);
});

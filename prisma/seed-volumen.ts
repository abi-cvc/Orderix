/**
 * Semilla de volumen: ~10.000 pedidos ficticios con sus ítems, repartidos en los
 * últimos 90 días, para medir el rendimiento del listado con y sin índices.
 *
 * Cada pedido trae su historial de estados con horas creíbles (cocina, entrega,
 * cobro) y parte de los cobrados, su calificación, para que el reporte por
 * mesero tenga tiempos y puntajes. Cada mesero tiene su propio ritmo y nivel,
 * así el reporte muestra diferencias entre ellos.
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

const MINUTO = 60 * 1000;
// Parte de los pedidos cobrados que el cliente califica.
const PROPORCION_CALIFICADOS = 0.65;

// Orden del flujo normal; el estado final decide hasta dónde llega cada pedido.
const FLUJO: EstadoPedido[] = [
  EstadoPedido.CREADO,
  EstadoPedido.EN_PREPARACION,
  EstadoPedido.LISTO,
  EstadoPedido.ENTREGADO,
  EstadoPedido.COBRADO,
];

/** Ritmo y nivel de cada mesero: multiplica sus tiempos de entrega y sesga su puntaje. */
interface PerfilMesero {
  id: number;
  nombre: string;
  ritmo: number;
  nivel: number;
}

interface Cambio {
  estado: EstadoPedido;
  usuarioId: number;
  fecha: Date;
}

function azar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]!;
}

/** Minutos al azar entre min y max (uniforme), en milisegundos. */
function minutos(min: number, max: number): number {
  return (min + Math.random() * (max - min)) * MINUTO;
}

/** Puntaje de 1 a 5 alrededor del nivel del mesero. */
function puntajeAlAzar(nivel: number): number {
  const valor = nivel + (Math.random() + Math.random() - 1) * 1.6;
  return Math.min(5, Math.max(1, Math.round(valor)));
}

/**
 * Historial de un pedido hasta su estado final, con quién hizo cada cambio:
 * cocina prepara, el mesero entrega y la caja cobra. Un pedido cancelado se
 * cancela antes de prepararse (mesero) o ya entregado, antes de cobrar (caja).
 */
function historial(
  estadoFinal: EstadoPedido,
  creadoEn: Date,
  mesero: PerfilMesero,
  cocineroId: number,
  cajeroId: number,
): Cambio[] {
  let t = creadoEn.getTime();
  const cambios: Cambio[] = [
    { estado: EstadoPedido.CREADO, usuarioId: mesero.id, fecha: creadoEn },
  ];
  const pasos: [EstadoPedido, number, number][] = [
    [EstadoPedido.EN_PREPARACION, cocineroId, minutos(0.5, 5)],
    [EstadoPedido.LISTO, cocineroId, minutos(4, 22)],
    [EstadoPedido.ENTREGADO, mesero.id, minutos(1, 6) * mesero.ritmo],
    [EstadoPedido.COBRADO, cajeroId, minutos(8, 40)],
  ];

  const cancelado = estadoFinal === EstadoPedido.CANCELADO;
  const temprano = Math.random() < 0.6;
  // Cuántos pasos del flujo normal recorre antes de su estado final.
  const recorridos = cancelado ? (temprano ? 0 : 3) : FLUJO.indexOf(estadoFinal);
  for (const [estado, usuarioId, espera] of pasos.slice(0, recorridos)) {
    t += espera;
    cambios.push({ estado, usuarioId, fecha: new Date(t) });
  }
  if (cancelado) {
    t += minutos(1, 10);
    cambios.push({
      estado: EstadoPedido.CANCELADO,
      usuarioId: temprano ? mesero.id : cajeroId,
      fecha: new Date(t),
    });
  }
  return cambios;
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
    const meseros: PerfilMesero[] = (
      await prisma.usuario.findMany({
        where: { rol: Rol.MESERO },
        select: { id: true, nombre: true },
        orderBy: { id: "asc" },
      })
    ).map((mesero, i) => ({
      ...mesero,
      // Fijos por posición: el reporte sale parecido cada vez que se corre.
      ritmo: [0.8, 1.35, 1, 1.15][i % 4]!,
      nivel: [4.6, 3.7, 4.2, 3.9][i % 4]!,
    }));
    const cocineros = await prisma.usuario.findMany({
      where: { rol: Rol.COCINA },
      select: { id: true },
    });
    const cajeros = await prisma.usuario.findMany({
      where: { rol: Rol.CAJERO },
      select: { id: true },
    });
    const productos = await prisma.producto.findMany({
      select: { id: true, nombre: true, precio: true },
    });
    if (
      meseros.length === 0 ||
      cocineros.length === 0 ||
      cajeros.length === 0 ||
      productos.length === 0
    ) {
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

      // Cada pedido con su historial y su calificación, calculados antes de insertar.
      const borradores = itemsPorPedido.map((items) => {
        const mesero = azar(meseros);
        const estado = estadoAlAzar();
        // Al menos 2 horas atrás, para que todo el historial quede en el pasado.
        const creadoEn = new Date(ahora - 120 * MINUTO - Math.random() * DIAS * 24 * 60 * MINUTO);
        const cambios = historial(estado, creadoEn, mesero, azar(cocineros).id, azar(cajeros).id);
        const ultimo = cambios.at(-1)!;
        const total = items.reduce(
          (suma, item) => suma.add(item.precioUnitario.mul(item.cantidad)),
          new Prisma.Decimal(0),
        );
        const cerrado = estado === EstadoPedido.COBRADO || estado === EstadoPedido.CANCELADO;
        const calificacion =
          estado === EstadoPedido.COBRADO && Math.random() < PROPORCION_CALIFICADOS
            ? {
                puntaje: puntajeAlAzar(mesero.nivel),
                cajeroId: ultimo.usuarioId,
                fecha: new Date(ultimo.fecha.getTime() + minutos(0.2, 2)),
              }
            : null;
        return {
          cambios,
          calificacion,
          pedido: {
            numeroMesa: 1 + Math.floor(Math.random() * MESAS),
            meseroId: mesero.id,
            meseroNombre: mesero.nombre,
            estado,
            total,
            creadoEn,
            cerradoEn: cerrado ? ultimo.fecha : null,
          },
        };
      });

      const pedidos = await prisma.pedido.createManyAndReturn({
        select: { id: true, creadoEn: true },
        data: borradores.map((borrador) => borrador.pedido),
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

      await prisma.cambioEstado.createMany({
        data: pedidos.flatMap((pedido, i) =>
          borradores[i]!.cambios.map((cambio) => ({ ...cambio, pedidoId: pedido.id })),
        ),
      });

      await prisma.calificacion.createMany({
        data: pedidos.flatMap((pedido, i) => {
          const calificacion = borradores[i]!.calificacion;
          return calificacion ? [{ ...calificacion, pedidoId: pedido.id }] : [];
        }),
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

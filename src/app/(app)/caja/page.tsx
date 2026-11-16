import type { Metadata } from "next";
import Link from "next/link";
import { ActualizarConEventos } from "@/componentes/ActualizarConEventos";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { TablaAdaptable } from "@/componentes/TablaAdaptable";
import { Rol } from "@/generated/prisma/enums";
import { hora, moneda } from "@/lib/formato";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { pedidosPorCobrar, type PedidoGuardado } from "@/modules/pedidos";
import { cambiarEstadoAccion } from "../pedidos/acciones";
import { accionHacia } from "../pedidos/textos";

export const metadata: Metadata = { title: "Caja" };

/** Pedidos entregados pendientes de cobro. Cobrar pide confirmación con el total. */
export default async function CajaPage() {
  const usuario = await usuarioDePagina(Rol.CAJERO);
  const [pedidos, csrf] = await Promise.all([pedidosPorCobrar(usuario), tokenCsrf()]);

  return (
    <>
      <h1>Caja</h1>
      <ActualizarConEventos eventos={["pedido.estadoCambiado"]} />
      <p role="status">
        {pedidos.length === 0
          ? "No hay pedidos por cobrar."
          : `${pedidos.length} ${pedidos.length === 1 ? "pedido por cobrar" : "pedidos por cobrar"}.`}
      </p>
      <TablaAdaptable
        titulo="Pedidos entregados por cobrar"
        filas={pedidos}
        claveFila={(p) => p.id}
        vacio="Cuando un mesero entregue un pedido, aparecerá aquí."
        columnas={[
          {
            titulo: "Pedido",
            celda: (p: PedidoGuardado) => <Link href={`/pedidos/${p.id}`}>{p.id}</Link>,
          },
          { titulo: "Mesa", celda: (p: PedidoGuardado) => p.numeroMesa },
          { titulo: "Mesero", celda: (p: PedidoGuardado) => p.meseroNombre },
          {
            titulo: "Productos",
            celda: (p: PedidoGuardado) => p.items.reduce((suma, item) => suma + item.cantidad, 0),
          },
          { titulo: "Hora", celda: (p: PedidoGuardado) => hora(p.creadoEn) },
          {
            titulo: "Total",
            celda: (p: PedidoGuardado) => <strong>{moneda(p.total)}</strong>,
          },
          {
            titulo: "Acción",
            celda: (p: PedidoGuardado) => {
              const { texto, variante, confirmar } = accionHacia("COBRADO", p, moneda(p.total));
              return (
                <FormularioAccion
                  accion={cambiarEstadoAccion}
                  campos={{ pedidoId: p.id, estado: "COBRADO" }}
                  csrf={csrf}
                  texto={`${texto} (mesa ${p.numeroMesa})`}
                  variante={variante}
                  confirmar={confirmar}
                />
              );
            },
          },
        ]}
      />
    </>
  );
}

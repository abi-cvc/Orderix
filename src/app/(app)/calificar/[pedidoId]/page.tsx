import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { tokenCsrf } from "@/modules/autenticacion";
import { obtenerCalificacion } from "@/modules/calificaciones";
import { obtenerEstadoPedido } from "@/modules/pedidos";
import { usuarioDePagina } from "@/lib/pagina";
import { registrarCalificacionAccion } from "./acciones";
import { FormularioCalificacion } from "./FormularioCalificacion";

export const metadata: Metadata = { title: "Calificar servicio" };

export default async function CalificarPedidoPage({
  params,
}: {
  params: Promise<{ pedidoId: string }>;
}) {
  await usuarioDePagina(Rol.CAJERO);
  const pedidoId = Number((await params).pedidoId);
  if (!Number.isSafeInteger(pedidoId) || pedidoId < 1) notFound();

  const pedido = await obtenerEstadoPedido(pedidoId);
  if (!pedido) notFound();
  if (pedido.estado !== EstadoPedido.COBRADO) redirect(`/pedidos/${pedidoId}`);
  // Ya calificado: muestra el agradecimiento en vez de redirigir. Tras enviar,
  // Next vuelve a pintar esta ruta y un redirect taparía el "¡Gracias!".
  const calificada = Boolean(await obtenerCalificacion(pedidoId));

  const accion = registrarCalificacionAccion.bind(null, pedidoId);
  return (
    <FormularioCalificacion accion={accion} csrf={await tokenCsrf()} calificada={calificada} />
  );
}

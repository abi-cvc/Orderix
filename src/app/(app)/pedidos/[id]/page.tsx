import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActualizarConEventos } from "@/componentes/ActualizarConEventos";
import { Anuncio } from "@/componentes/Anuncio";
import { EtiquetaEstado } from "@/componentes/EtiquetaEstado";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoEncontrado, ErrorValidacion } from "@/lib/errores";
import { fechaHora, hora, moneda, subtotal } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/lib/navegacion";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { obtenerCalificacion } from "@/modules/calificaciones";
import { ETIQUETAS_PUNTAJE } from "@/modules/calificaciones/validadores";
import { listarProductosDisponibles } from "@/modules/menu";
import { obtenerPedido } from "@/modules/pedidos";
import { ESTADOS_QUITAR_ITEMS } from "@/modules/pedidos/estados";
import { cambiarEstadoAccion, quitarItemAccion } from "../acciones";
import { accionHacia } from "../textos";
import { FormularioAgregarItem, FormularioEditarItem } from "./FormulariosItem";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Pedido ${(await params).id}` };
}

async function cargar(usuario: Parameters<typeof obtenerPedido>[0], id: string) {
  try {
    return await obtenerPedido(usuario, id);
  } catch (error) {
    if (error instanceof ErrorNoEncontrado || error instanceof ErrorValidacion) notFound();
    throw error;
  }
}

export default async function DetallePedidoPage({ params, searchParams }: Props) {
  const usuario = await usuarioDePagina();
  const { id } = await params;
  const { creado } = await searchParams;
  const { pedido, historial, estadosPermitidos, puedeEditarItems } = await cargar(usuario, id);
  const calificacion =
    usuario.rol === Rol.CAJERO && pedido.estado === "COBRADO"
      ? await obtenerCalificacion(pedido.id)
      : null;
  const csrf = await tokenCsrf();
  const productos = puedeEditarItems ? await listarProductosDisponibles() : [];
  const puedeQuitar = puedeEditarItems && ESTADOS_QUITAR_ITEMS.includes(pedido.estado);
  const totalTexto = moneda(pedido.total);
  const volver =
    usuario.rol === Rol.COCINA
      ? "/cocina"
      : usuario.rol === Rol.CAJERO && pedido.estado === "ENTREGADO"
        ? "/caja"
        : "/pedidos";

  return (
    <>
      <header className="pagina-cabecera">
        <p>
          <Link href={volver}>
            <span aria-hidden="true">←</span> Volver
          </Link>
        </p>

        <h1>
          Pedido {pedido.id} · Mesa {pedido.numeroMesa}
        </h1>
      </header>
      <Anuncio tipo="exito" mensaje={creado ? "Pedido enviado a cocina." : undefined} />
      <ActualizarConEventos
        eventos={["pedido.estadoCambiado", "pedido.alergiaAgregada"]}
        usuarioId={usuario.id}
      />

      <dl className="resumen-pedido">
        <div>
          <dt>Estado</dt>
          <dd>
            <EtiquetaEstado estado={pedido.estado} />
          </dd>
        </div>
        <div>
          <dt>Mesero</dt>
          <dd>{pedido.meseroNombre}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{fechaHora(pedido.creadoEn)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>
            <strong>{totalTexto}</strong>
          </dd>
        </div>
        {pedido.notas && (
          <div>
            <dt>Notas</dt>
            <dd>{pedido.notas}</dd>
          </div>
        )}
      </dl>

      {usuario.rol === Rol.CAJERO && pedido.estado === "COBRADO" && (
        <section className="calificacion-detalle" aria-labelledby="titulo-calificacion">
          <h2 id="titulo-calificacion">Calificación del servicio</h2>
          {calificacion ? (
            <p role="status">
              {calificacion.puntaje}/5 · {ETIQUETAS_PUNTAJE[calificacion.puntaje]}
            </p>
          ) : (
            <Link className="boton boton--primario" href={`/calificar/${pedido.id}`}>
              Calificar servicio
            </Link>
          )}
        </section>
      )}

      {estadosPermitidos.length > 0 && (
        <section className="seccion" aria-labelledby="titulo-acciones">
          <h2 id="titulo-acciones">Acciones</h2>
          <div className="grupo-botones">
            {estadosPermitidos.map((estado) => {
              const { texto, variante, confirmar } = accionHacia(estado, pedido, totalTexto);
              return (
                <FormularioAccion
                  key={estado}
                  accion={cambiarEstadoAccion}
                  campos={{ pedidoId: pedido.id, estado }}
                  csrf={csrf}
                  texto={texto}
                  variante={variante}
                  confirmar={confirmar}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="seccion" aria-labelledby="titulo-items">
        <h2 id="titulo-items">Productos</h2>
        <ul className="lista-items">
          {pedido.items.map((item) => (
            <li key={item.id} className="tarjeta">
              <p className="item__titulo">
                <strong>
                  {item.cantidad} × {item.nombreProducto}
                </strong>{" "}
                <span className="campo__ayuda">
                  {moneda(item.precioUnitario)} c/u · subtotal{" "}
                  {moneda(subtotal(item.precioUnitario, item.cantidad))} · {hora(item.agregadoEn)}
                </span>
              </p>
              {item.alergias && (
                <p className="alergia">
                  <span aria-hidden="true">⚠</span> ALERGIA: {item.alergias}
                </p>
              )}
              {item.notas && <p>Nota: {item.notas}</p>}
              {puedeEditarItems && (
                <div className="grupo-botones">
                  <FormularioEditarItem item={item} csrf={csrf} />
                  {puedeQuitar && pedido.items.length > 1 && (
                    <FormularioAccion
                      accion={quitarItemAccion}
                      campos={{ itemId: item.id }}
                      csrf={csrf}
                      texto={`Quitar ${item.nombreProducto}`}
                      variante="secundario"
                      confirmar={{
                        titulo: `¿Quitar ${item.nombreProducto}?`,
                        descripcion: "El producto se quitará del pedido y el total se recalculará.",
                        textoConfirmar: "Sí, quitar",
                      }}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        {puedeEditarItems && (
          <FormularioAgregarItem pedidoId={pedido.id} productos={productos} csrf={csrf} />
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-historial">
        <h2 id="titulo-historial">Historial</h2>
        <ol className="historial">
          {historial.map((cambio) => (
            <li key={cambio.id}>
              <strong>{ETIQUETA_ESTADO[cambio.estado].texto}</strong> por {cambio.usuarioNombre},{" "}
              <time dateTime={cambio.fecha.toISOString()}>{fechaHora(cambio.fecha)}</time>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

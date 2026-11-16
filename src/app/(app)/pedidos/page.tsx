import type { Metadata } from "next";
import Link from "next/link";
import { ActualizarConEventos } from "@/componentes/ActualizarConEventos";
import { EtiquetaEstado } from "@/componentes/EtiquetaEstado";
import { Paginacion } from "@/componentes/Paginacion";
import { TablaAdaptable } from "@/componentes/TablaAdaptable";
import { EstadoPedido, Rol } from "@/generated/prisma/enums";
import { hora, moneda } from "@/lib/formato";
import { ETIQUETA_ESTADO } from "@/lib/navegacion";
import { usuarioDePagina } from "@/lib/pagina";
import { listarPedidos, type PedidoGuardado } from "@/modules/pedidos";
import { MESAS } from "@/modules/pedidos/validadores";

export const metadata: Metadata = { title: "Pedidos" };

type Parametros = Promise<Record<string, string | string[] | undefined>>;

export default async function PedidosPage({ searchParams }: { searchParams: Parametros }) {
  const usuario = await usuarioDePagina(Rol.MESERO, Rol.CAJERO, Rol.ADMINISTRADOR);
  const { pedidos, total, totalPaginas, filtro } = await listarPedidos(usuario, await searchParams);
  const esMesero = usuario.rol === Rol.MESERO;
  const pagina = Math.min(filtro.pagina, totalPaginas);

  const columnas = [
    {
      titulo: "N.º",
      celda: (p: PedidoGuardado) => (
        <Link href={`/pedidos/${p.id}`}>
          <span className="solo-lector">Ver pedido </span>
          {p.id}
        </Link>
      ),
    },
    { titulo: "Mesa", celda: (p: PedidoGuardado) => p.numeroMesa },
    ...(esMesero ? [] : [{ titulo: "Mesero", celda: (p: PedidoGuardado) => p.meseroNombre }]),
    { titulo: "Estado", celda: (p: PedidoGuardado) => <EtiquetaEstado estado={p.estado} /> },
    {
      titulo: "Productos",
      celda: (p: PedidoGuardado) => (
        <>
          {p.items.reduce((suma, item) => suma + item.cantidad, 0)}
          {p.items.some((item) => item.alergias) && (
            <span className="marca-alergia">
              {" "}
              <span aria-hidden="true">⚠</span> alergia
            </span>
          )}
        </>
      ),
    },
    { titulo: "Total", celda: (p: PedidoGuardado) => moneda(p.total) },
    { titulo: "Hora", celda: (p: PedidoGuardado) => hora(p.creadoEn) },
  ];

  return (
    <>
      <div className="titulo-con-accion">
        <h1>{esMesero ? "Mis pedidos" : "Pedidos"}</h1>
        {esMesero && (
          <Link href="/pedidos/nuevo" className="boton boton--primario">
            Nuevo pedido
          </Link>
        )}
      </div>

      {esMesero && (
        <ActualizarConEventos eventos={["pedido.estadoCambiado"]} usuarioId={usuario.id} />
      )}

      {/* Formulario GET: los filtros quedan en la URL y se pueden compartir. */}
      <form method="get" action="/pedidos" className="filtros" aria-label="Filtrar pedidos">
        <div className="campo">
          <label htmlFor="filtro-id" className="campo__etiqueta">
            N.º de pedido
          </label>
          <input
            id="filtro-id"
            name="id"
            inputMode="numeric"
            className="campo__control"
            defaultValue={filtro.id ?? ""}
          />
        </div>
        <div className="campo">
          <label htmlFor="filtro-mesa" className="campo__etiqueta">
            Mesa
          </label>
          <select
            id="filtro-mesa"
            name="mesa"
            className="campo__control"
            defaultValue={filtro.mesa ?? ""}
          >
            <option value="">Todas</option>
            {Array.from({ length: MESAS }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Mesa {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-estado" className="campo__etiqueta">
            Estado
          </label>
          <select
            id="filtro-estado"
            name="estado"
            className="campo__control"
            defaultValue={filtro.estado ?? ""}
          >
            <option value="">Todos</option>
            {Object.values(EstadoPedido).map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO[estado].texto}
              </option>
            ))}
          </select>
        </div>
        <div className="grupo-botones filtros__botones">
          <button type="submit" className="boton boton--primario">
            Filtrar
          </button>
          <Link href="/pedidos" className="boton boton--secundario">
            Quitar filtros
          </Link>
        </div>
      </form>

      <p role="status">
        {total === 1
          ? "1 pedido encontrado."
          : `${total.toLocaleString("es-EC")} pedidos encontrados.`}
      </p>

      <TablaAdaptable
        titulo={`Pedidos, página ${pagina} de ${totalPaginas}`}
        columnas={columnas}
        filas={pedidos}
        claveFila={(p) => p.id}
        vacio={
          esMesero
            ? "Todavía no tienes pedidos con estos filtros."
            : "No hay pedidos con estos filtros."
        }
      />
      <Paginacion
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        ruta="/pedidos"
        parametros={{
          id: filtro.id?.toString(),
          mesa: filtro.mesa?.toString(),
          estado: filtro.estado,
        }}
      />
    </>
  );
}

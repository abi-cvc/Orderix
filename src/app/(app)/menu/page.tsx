import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { Paginacion } from "@/componentes/Paginacion";
import { TablaAdaptable } from "@/componentes/TablaAdaptable";
import { Rol } from "@/generated/prisma/enums";
import { moneda } from "@/lib/formato";
import { numeroDePagina, usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { listarProductos, type ProductoGuardado } from "@/modules/menu";
import {
  activarProductoAccion,
  desactivarProductoAccion,
  eliminarProductoAccion,
} from "./acciones";

export const metadata: Metadata = { title: "Menú" };

type Parametros = Promise<Record<string, string | string[] | undefined>>;

export default async function MenuPage({ searchParams }: { searchParams: Parametros }) {
  const usuario = await usuarioDePagina(Rol.ADMINISTRADOR);
  const parametros = await searchParams;
  const resultado = await listarProductos(usuario, {
    pagina: numeroDePagina(parametros.pagina),
    nombre: parametros.nombre,
    categoria: parametros.categoria,
    disponible: parametros.disponible,
  });
  const csrf = await tokenCsrf();
  const pagina = Math.min(resultado.filtro.pagina, resultado.totalPaginas);

  const columnas = [
    {
      titulo: "Producto",
      celda: (producto: ProductoGuardado) => (
        <Link href={`/menu/${producto.id}`}>
          <span className="solo-lector">Ver producto </span>
          {producto.nombre}
        </Link>
      ),
    },
    { titulo: "Categoría", celda: (producto: ProductoGuardado) => producto.categoria },
    { titulo: "Precio", celda: (producto: ProductoGuardado) => moneda(producto.precio) },
    {
      titulo: "Disponibilidad",
      celda: (producto: ProductoGuardado) => (producto.disponible ? "Disponible" : "No disponible"),
    },
    {
      titulo: "Acciones",
      celda: (producto: ProductoGuardado) => (
        <div className="grupo-botones">
          <Link className="boton boton--secundario" href={`/menu/${producto.id}`}>
            Editar
          </Link>
          {producto.disponible && (
            <FormularioAccion
              accion={desactivarProductoAccion}
              campos={{ id: producto.id }}
              csrf={csrf}
              texto="Desactivar"
              variante="secundario"
              confirmar={{
                titulo: `¿Desactivar ${producto.nombre}?`,
                descripcion: "No aparecerá en nuevos pedidos, pero conservará su historial.",
                textoConfirmar: "Sí, desactivar",
              }}
            />
          )}
          {!producto.disponible && (
            <FormularioAccion
              accion={activarProductoAccion}
              campos={{ id: producto.id }}
              csrf={csrf}
              texto="Activar"
              variante="secundario"
              confirmar={{
                titulo: `¿Activar ${producto.nombre}?`,
                descripcion: "Volverá a aparecer en los nuevos pedidos.",
                textoConfirmar: "Sí, activar",
              }}
            />
          )}
          <FormularioAccion
            accion={eliminarProductoAccion}
            campos={{ id: producto.id }}
            csrf={csrf}
            texto="Eliminar"
            variante="peligro"
            confirmar={{
              titulo: `¿Eliminar ${producto.nombre}?`,
              descripcion: "Esta acción no se puede deshacer.",
              textoConfirmar: "Sí, eliminar",
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="titulo-con-accion">
        <h1>Menú</h1>
        <Link href="/menu/nuevo" className="boton boton--primario">
          Nuevo producto
        </Link>
      </div>

      <form method="get" action="/menu" className="filtros" aria-label="Filtrar productos">
        <div className="campo">
          <label htmlFor="filtro-nombre" className="campo__etiqueta">
            Nombre
          </label>
          <input
            id="filtro-nombre"
            name="nombre"
            className="campo__control"
            defaultValue={resultado.filtro.nombre ?? ""}
          />
        </div>
        <div className="campo">
          <label htmlFor="filtro-categoria" className="campo__etiqueta">
            Categoría
          </label>
          <input
            id="filtro-categoria"
            name="categoria"
            className="campo__control"
            defaultValue={resultado.filtro.categoria ?? ""}
          />
        </div>
        <div className="campo">
          <label htmlFor="filtro-disponible" className="campo__etiqueta">
            Disponibilidad
          </label>
          <select
            id="filtro-disponible"
            name="disponible"
            className="campo__control"
            defaultValue={parametros.disponible?.toString() ?? ""}
          >
            <option value="">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No disponibles</option>
          </select>
        </div>
        <div className="grupo-botones filtros__botones">
          <button type="submit" className="boton boton--primario">
            Filtrar
          </button>
          <Link href="/menu" className="boton boton--secundario">
            Quitar filtros
          </Link>
        </div>
      </form>

      <p role="status">
        {resultado.total === 1
          ? "1 producto encontrado."
          : `${resultado.total.toLocaleString("es-EC")} productos encontrados.`}
      </p>
      <TablaAdaptable
        titulo={`Productos, página ${pagina} de ${resultado.totalPaginas}`}
        columnas={columnas}
        filas={resultado.productos}
        claveFila={(producto) => producto.id}
        vacio="No hay productos con estos filtros."
      />
      <Paginacion
        paginaActual={pagina}
        totalPaginas={resultado.totalPaginas}
        ruta="/menu"
        parametros={{
          nombre: resultado.filtro.nombre,
          categoria: resultado.filtro.categoria,
          disponible: resultado.filtro.disponible?.toString(),
        }}
      />
    </>
  );
}

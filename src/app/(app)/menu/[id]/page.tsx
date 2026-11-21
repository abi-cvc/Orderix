import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { Anuncio } from "@/componentes/Anuncio";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoEncontrado, ErrorValidacion } from "@/lib/errores";
import { moneda } from "@/lib/formato";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { obtenerProducto } from "@/modules/menu";
import {
  activarProductoAccion,
  desactivarProductoAccion,
  editarProductoAccion,
  eliminarProductoAccion,
} from "../acciones";
import { FormularioProducto } from "../FormularioProducto";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Producto ${(await params).id}` };
}

export default async function ProductoPage({ params, searchParams }: Props) {
  const usuario = await usuarioDePagina(Rol.ADMINISTRADOR);
  const { id } = await params;
  let producto;
  try {
    producto = await obtenerProducto(usuario, id);
  } catch (error) {
    if (error instanceof ErrorNoEncontrado || error instanceof ErrorValidacion) notFound();
    throw error;
  }
  const csrf = await tokenCsrf();
  const parametros = await searchParams;

  return (
    <>
      <header className="pagina-cabecera">
        <p>
          <Link href="/menu">
            <span aria-hidden="true">←</span> Volver al menú
          </Link>
        </p>
        <h1>{producto.nombre}</h1>
      </header>
      <Anuncio
        tipo="estado"
        mensaje={`Precio actual: ${moneda(producto.precio)}. ${
          producto.disponible
            ? "Disponible para nuevos pedidos."
            : "No disponible para nuevos pedidos."
        }`}
      />
      {parametros.eliminado === "1" && <Anuncio tipo="exito" mensaje="Producto eliminado." />}
      <section className="seccion" aria-labelledby="titulo-editar">
        <h2 id="titulo-editar">Editar producto</h2>
        <FormularioProducto producto={producto} csrf={csrf} accion={editarProductoAccion} />
      </section>
      <section className="seccion" aria-labelledby="titulo-estado">
        <h2 id="titulo-estado">Disponibilidad</h2>
        <div className="grupo-botones">
          {producto.disponible && (
            <FormularioAccion
              accion={desactivarProductoAccion}
              campos={{ id: producto.id }}
              csrf={csrf}
              texto="Desactivar producto"
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
              texto="Activar producto"
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
            texto="Eliminar producto"
            variante="peligro"
            confirmar={{
              titulo: `¿Eliminar ${producto.nombre}?`,
              descripcion: "Esta acción no se puede deshacer.",
              textoConfirmar: "Sí, eliminar",
            }}
          />
        </div>
      </section>
    </>
  );
}

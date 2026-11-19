import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { Paginacion } from "@/componentes/Paginacion";
import { TablaAdaptable } from "@/componentes/TablaAdaptable";
import { Rol } from "@/generated/prisma/enums";
import { fechaHora } from "@/lib/formato";
import { ETIQUETA_ROL } from "@/lib/navegacion";
import { usuarioDePagina } from "@/lib/pagina";
import { listarUsuarios, tokenCsrf, type UsuarioListado } from "@/modules/autenticacion";
import { cambiarActivoAccion } from "./acciones";
import { FormularioRol } from "./FormularioRol";

export const metadata: Metadata = { title: "Usuarios" };

type Parametros = Promise<Record<string, string | string[] | undefined>>;

/**
 * Gestión del personal (solo administrador): buscar, cambiar rol y activar o
 * desactivar cuentas. Las cuentas nuevas se registran como mesero y aquí se les
 * asigna el rol que corresponde.
 */
export default async function UsuariosPage({ searchParams }: { searchParams: Parametros }) {
  const admin = await usuarioDePagina(Rol.ADMINISTRADOR);
  const [{ usuarios, total, totalPaginas, filtro }, csrf] = await Promise.all([
    listarUsuarios(admin, await searchParams),
    tokenCsrf(),
  ]);
  const pagina = Math.min(filtro.pagina, totalPaginas);

  return (
    <>
      <h1>Usuarios</h1>
      <p>
        Las cuentas nuevas se registran como mesero. Asigna aquí el rol que corresponde. Al cambiar
        el rol o desactivar una cuenta, se cierran sus sesiones abiertas.
      </p>

      <form method="get" action="/usuarios" className="filtros" aria-label="Buscar usuarios">
        <div className="campo">
          <label htmlFor="filtro-texto" className="campo__etiqueta">
            Nombre o correo
          </label>
          <input
            id="filtro-texto"
            name="texto"
            className="campo__control"
            defaultValue={filtro.texto ?? ""}
          />
        </div>
        <div className="grupo-botones filtros__botones">
          <button type="submit" className="boton boton--primario">
            Buscar
          </button>
          <Link href="/usuarios" className="boton boton--secundario">
            Quitar filtro
          </Link>
        </div>
      </form>

      <p role="status">
        {total === 1 ? "1 usuario encontrado." : `${total} usuarios encontrados.`}
      </p>

      <TablaAdaptable
        titulo={`Usuarios, página ${pagina} de ${totalPaginas}`}
        filas={usuarios}
        claveFila={(u) => u.id}
        vacio="No hay usuarios con ese nombre o correo."
        columnas={[
          {
            titulo: "Nombre",
            celda: (u: UsuarioListado) => (
              <>
                {u.nombre}
                {u.id === admin.id && <span className="campo__ayuda"> (tú)</span>}
              </>
            ),
          },
          { titulo: "Correo", celda: (u: UsuarioListado) => u.correo },
          {
            titulo: "Rol",
            celda: (u: UsuarioListado) =>
              u.id === admin.id ? (
                ETIQUETA_ROL[u.rol]
              ) : (
                <FormularioRol usuarioId={u.id} nombre={u.nombre} rol={u.rol} csrf={csrf} />
              ),
          },
          {
            titulo: "Estado",
            celda: (u: UsuarioListado) => (
              <span className={`estado ${u.activo ? "estado--LISTO" : "estado--CANCELADO"}`}>
                <span aria-hidden="true">{u.activo ? "●" : "✕"}</span>
                {u.activo ? "Activa" : "Desactivada"}
              </span>
            ),
          },
          { titulo: "Creada", celda: (u: UsuarioListado) => fechaHora(u.creadoEn) },
          {
            titulo: "Acción",
            celda: (u: UsuarioListado) =>
              u.id === admin.id ? (
                <span className="campo__ayuda">—</span>
              ) : u.activo ? (
                <FormularioAccion
                  accion={cambiarActivoAccion}
                  campos={{ usuarioId: u.id, activo: "false" }}
                  csrf={csrf}
                  texto={`Desactivar a ${u.nombre}`}
                  variante="peligro"
                  confirmar={{
                    titulo: `¿Desactivar la cuenta de ${u.nombre}?`,
                    descripcion:
                      "No podrá iniciar sesión y se cerrarán sus sesiones abiertas. Su historial se conserva.",
                    textoConfirmar: "Sí, desactivar",
                  }}
                />
              ) : (
                <FormularioAccion
                  accion={cambiarActivoAccion}
                  campos={{ usuarioId: u.id, activo: "true" }}
                  csrf={csrf}
                  texto={`Activar a ${u.nombre}`}
                  variante="secundario"
                  confirmar={{
                    titulo: `¿Activar la cuenta de ${u.nombre}?`,
                    descripcion: "Podrá volver a iniciar sesión.",
                    textoConfirmar: "Sí, activar",
                  }}
                />
              ),
          },
        ]}
      />
      <Paginacion
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        ruta="/usuarios"
        parametros={{ texto: filtro.texto }}
      />
    </>
  );
}

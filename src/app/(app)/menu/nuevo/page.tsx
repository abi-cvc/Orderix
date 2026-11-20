import type { Metadata } from "next";
import Link from "next/link";
import { Rol } from "@/generated/prisma/enums";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { crearProductoAccion } from "../acciones";
import { FormularioProducto } from "../FormularioProducto";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await usuarioDePagina(Rol.ADMINISTRADOR);
  const csrf = await tokenCsrf();

  return (
    <>
      <header className="pagina-cabecera">
        <p>
          <Link href="/menu">
            <span aria-hidden="true">←</span> Volver al menú
          </Link>
        </p>
        <h1>Nuevo producto</h1>
      </header>
      <FormularioProducto accion={crearProductoAccion} csrf={csrf} />
    </>
  );
}

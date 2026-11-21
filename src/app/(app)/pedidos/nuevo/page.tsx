import type { Metadata } from "next";
import Link from "next/link";
import { Rol } from "@/generated/prisma/enums";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { listarProductosDisponibles } from "@/modules/menu";
import { FormularioPedido } from "./FormularioPedido";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default async function NuevoPedidoPage() {
  await usuarioDePagina(Rol.MESERO);
  const [productos, csrf] = await Promise.all([listarProductosDisponibles(), tokenCsrf()]);

  return (
    <>
      <header className="pagina-cabecera">
        <p>
          <Link href="/pedidos">
            <span aria-hidden="true">←</span> Volver a mis pedidos
          </Link>
        </p>
        <h1>Nuevo pedido</h1>
      </header>
      {productos.length === 0 ? (
        <p className="panel-vacio">
          No hay productos disponibles en el menú. Pide al administrador que los active.
        </p>
      ) : (
        <FormularioPedido productos={productos} csrf={csrf} />
      )}
    </>
  );
}

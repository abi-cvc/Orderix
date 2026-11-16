import type { Metadata } from "next";
import Link from "next/link";
import { ActualizarConEventos } from "@/componentes/ActualizarConEventos";
import { EtiquetaEstado } from "@/componentes/EtiquetaEstado";
import { FormularioAccion } from "@/componentes/FormularioAccion";
import { Rol } from "@/generated/prisma/enums";
import { hora, minutosDesde } from "@/lib/formato";
import { usuarioDePagina } from "@/lib/pagina";
import { tokenCsrf } from "@/modules/autenticacion";
import { colaCocina } from "@/modules/pedidos";
import { estadosPermitidos } from "@/modules/pedidos/estados";
import { cambiarEstadoAccion } from "../pedidos/acciones";
import { accionHacia } from "../pedidos/textos";

export const metadata: Metadata = { title: "Cocina" };

/**
 * Cola de cocina: pedidos creados y en preparación, los más antiguos primero.
 * Se actualiza sola con los avisos en tiempo real; una alergia nueva se anuncia
 * como alerta. Cambiar de estado es un botón (sin arrastrar, WCAG 2.5.7).
 */
export default async function CocinaPage() {
  const usuario = await usuarioDePagina(Rol.COCINA);
  const [pedidos, csrf] = await Promise.all([colaCocina(usuario), tokenCsrf()]);

  return (
    <>
      <h1>Cocina</h1>
      <ActualizarConEventos
        eventos={["pedido.creado", "pedido.estadoCambiado", "pedido.alergiaAgregada"]}
      />
      <p role="status">
        {pedidos.length === 0
          ? "No hay pedidos pendientes."
          : `${pedidos.length} ${pedidos.length === 1 ? "pedido pendiente" : "pedidos pendientes"}.`}
      </p>

      <ul className="rejilla">
        {pedidos.map((pedido) => {
          const conAlergia = pedido.items.some((item) => item.alergias);
          return (
            <li key={pedido.id} className={`tarjeta${conAlergia ? " tarjeta--alergia" : ""}`}>
              <article aria-labelledby={`pedido-${pedido.id}`}>
                <h2 id={`pedido-${pedido.id}`}>
                  Mesa {pedido.numeroMesa}
                  <span className="campo__ayuda"> · Pedido {pedido.id}</span>
                </h2>
                <p className="tarjeta__meta">
                  <EtiquetaEstado estado={pedido.estado} />{" "}
                  <time dateTime={pedido.creadoEn.toISOString()}>
                    {hora(pedido.creadoEn)} ({minutosDesde(pedido.creadoEn)})
                  </time>{" "}
                  · {pedido.meseroNombre}
                </p>
                <ul className="lista-cocina">
                  {pedido.items.map((item) => (
                    <li key={item.id}>
                      <strong>
                        {item.cantidad} × {item.nombreProducto}
                      </strong>
                      {item.alergias && (
                        <p className="alergia">
                          <span aria-hidden="true">⚠</span> ALERGIA: {item.alergias}
                        </p>
                      )}
                      {item.notas && <p className="campo__ayuda">Nota: {item.notas}</p>}
                    </li>
                  ))}
                </ul>
                {pedido.notas && <p>Nota del pedido: {pedido.notas}</p>}
                <div className="grupo-botones">
                  {estadosPermitidos(pedido, usuario).map((estado) => {
                    const { texto, variante } = accionHacia(estado, pedido, "");
                    return (
                      <FormularioAccion
                        key={estado}
                        accion={cambiarEstadoAccion}
                        campos={{ pedidoId: pedido.id, estado }}
                        csrf={csrf}
                        texto={`${texto} (mesa ${pedido.numeroMesa})`}
                        variante={variante}
                      />
                    );
                  })}
                  <Link href={`/pedidos/${pedido.id}`} className="boton boton--secundario">
                    Ver detalle <span className="solo-lector">del pedido {pedido.id}</span>
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}

"use client";

import { useActionState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { moneda } from "@/lib/formato";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import type { ProductoParaPedido } from "@/modules/menu";
import type { ItemGuardado } from "@/modules/pedidos";
import { CANTIDAD_MAXIMA, LARGO_ALERGIAS, LARGO_NOTAS_ITEM } from "@/modules/pedidos/validadores";
import { agregarItemAccion, editarItemAccion } from "../acciones";

/** Editar cantidad, alergias y notas de un ítem (desplegable nativo: accesible con teclado). */
export function FormularioEditarItem({ item, csrf }: { item: ItemGuardado; csrf: string }) {
  const [estado, enviar, enviando] = useActionState(editarItemAccion, {});
  const sufijo = `item-${item.id}`;

  return (
    <details className="desplegable">
      <summary className="boton boton--secundario">
        Editar <span className="solo-lector">{item.nombreProducto}</span>
      </summary>
      <form action={enviar} noValidate className="desplegable__contenido">
        <input type="hidden" name={CAMPO_CSRF} value={csrf} />
        <input type="hidden" name="itemId" value={item.id} />
        <Anuncio mensaje={estado.mensaje} tipo={estado.exito ? "exito" : "error"} />
        <Campo
          nombre="cantidad"
          id={`cantidad-${sufijo}`}
          etiqueta="Cantidad"
          ayuda={`De 1 a ${CANTIDAD_MAXIMA}.`}
          inputMode="numeric"
          defaultValue={item.cantidad}
          errores={estado.errores?.cantidad}
        />
        <Campo
          nombre="alergias"
          id={`alergias-${sufijo}`}
          etiqueta="Alergias"
          ayuda="Si cambias la alergia, cocina recibe una alerta."
          maxLength={LARGO_ALERGIAS}
          defaultValue={item.alergias ?? ""}
          errores={estado.errores?.alergias}
        />
        <Campo
          nombre="notas"
          id={`notas-${sufijo}`}
          etiqueta="Notas"
          maxLength={LARGO_NOTAS_ITEM}
          defaultValue={item.notas ?? ""}
          errores={estado.errores?.notas}
        />
        <Boton type="submit" disabled={enviando}>
          Guardar cambios
        </Boton>
      </form>
    </details>
  );
}

/** Pedido adicional: un producto más para el mismo pedido. */
export function FormularioAgregarItem({
  pedidoId,
  productos,
  csrf,
}: {
  pedidoId: number;
  productos: ProductoParaPedido[];
  csrf: string;
}) {
  const [estado, enviar, enviando] = useActionState(agregarItemAccion, {});
  const errorProducto = estado.errores?.["items.0.productoId"];
  const error = (campo: string) => estado.errores?.[`items.0.${campo}`];

  return (
    <details className="desplegable">
      <summary className="boton boton--primario">Agregar producto al pedido</summary>
      <form action={enviar} noValidate className="desplegable__contenido">
        <input type="hidden" name={CAMPO_CSRF} value={csrf} />
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <Anuncio mensaje={estado.mensaje} tipo={estado.exito ? "exito" : "error"} />
        <div className="campo">
          <label htmlFor="agregar-producto" className="campo__etiqueta">
            Producto
          </label>
          <select
            id="agregar-producto"
            name="productoId"
            className="campo__control"
            defaultValue=""
            aria-invalid={errorProducto ? true : undefined}
            aria-describedby={errorProducto ? "agregar-producto-error" : undefined}
          >
            <option value="" disabled>
              Elige un producto
            </option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {moneda(p.precio)}
              </option>
            ))}
          </select>
          {errorProducto && (
            <p id="agregar-producto-error" className="campo__error">
              <span aria-hidden="true">⚠</span> {errorProducto.join(" ")}
            </p>
          )}
        </div>
        <Campo
          nombre="cantidad"
          id="agregar-cantidad"
          etiqueta="Cantidad"
          inputMode="numeric"
          defaultValue={1}
          errores={error("cantidad")}
        />
        <Campo
          nombre="alergias"
          id="agregar-alergias"
          etiqueta="Alergias (opcional)"
          maxLength={LARGO_ALERGIAS}
          errores={error("alergias")}
        />
        <Campo
          nombre="notas"
          id="agregar-notas"
          etiqueta="Notas (opcional)"
          maxLength={LARGO_NOTAS_ITEM}
          errores={error("notas")}
        />
        <Boton type="submit" disabled={enviando}>
          Agregar
        </Boton>
      </form>
    </details>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { moneda, subtotal } from "@/lib/formato";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import type { ProductoParaPedido } from "@/modules/menu";
import {
  CANTIDAD_MAXIMA,
  ITEMS_MAXIMOS,
  LARGO_ALERGIAS,
  LARGO_NOTAS_ITEM,
  LARGO_NOTAS_PEDIDO,
  MESAS,
} from "@/modules/pedidos/validadores";
import { crearPedidoAccion } from "../acciones";
import { SelectorProducto } from "../SelectorProducto";

interface Fila {
  clave: number;
  productoId: string;
  cantidad: string;
  alergias: string;
  notas: string;
}

const filaVacia = (clave: number): Fila => ({
  clave,
  productoId: "",
  cantidad: "1",
  alergias: "",
  notas: "",
});

/** Errores del servidor de un campo: "numeroMesa", "items", "items.0.cantidad"... */
function errorDe(errores: Record<string, string[]> | undefined, campo: string) {
  return errores?.[campo]?.join(" ");
}

/**
 * Formulario de nuevo pedido. Los productos se envían como JSON en un campo
 * oculto; el servidor vuelve a validar todo y pone el precio real (el total que
 * se muestra aquí es solo una referencia para el mesero).
 */
export function FormularioPedido({
  productos,
  csrf,
}: {
  productos: ProductoParaPedido[];
  csrf: string;
}) {
  const [estado, enviar, enviando] = useActionState(crearPedidoAccion, {});
  const [filas, setFilas] = useState<Fila[]>([filaVacia(0)]);
  const siguienteClave = useRef(1);
  const [anuncio, setAnuncio] = useState<string>();
  const porId = new Map(productos.map((p) => [String(p.id), p]));

  const cambiar = (clave: number, campo: keyof Omit<Fila, "clave">, valor: string) =>
    setFilas((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)));

  const agregar = () => {
    const clave = siguienteClave.current++;
    setFilas((actuales) => [...actuales, filaVacia(clave)]);
    setAnuncio(`Producto ${filas.length + 1} agregado.`);
    // Lleva el foco al selector del producto nuevo.
    setTimeout(() => document.getElementById(`producto-${clave}`)?.focus(), 0);
  };

  const quitar = (clave: number, numero: number) => {
    setFilas((actuales) => actuales.filter((f) => f.clave !== clave));
    setAnuncio(`Producto ${numero} quitado.`);
    setTimeout(() => document.getElementById("agregar-producto")?.focus(), 0);
  };

  const items = filas.map(({ productoId, cantidad, alergias, notas }) => ({
    productoId,
    cantidad,
    alergias,
    notas,
  }));
  const totalEstimado = filas
    .reduce((suma, f) => {
      const producto = porId.get(f.productoId);
      const cantidad = Number(f.cantidad);
      return producto && Number.isInteger(cantidad) && cantidad > 0
        ? suma + Number(subtotal(producto.precio, cantidad))
        : suma;
    }, 0)
    .toFixed(2);
  const errores = estado.errores;

  return (
    <form action={enviar} noValidate className="formulario-pedido">
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Anuncio mensaje={estado.exito === false ? estado.mensaje : undefined} tipo="error" />

      <div className="pedido-mesa campo">
        <label htmlFor="numeroMesa" className="campo__etiqueta">
          Mesa
        </label>
        <select
          id="numeroMesa"
          name="numeroMesa"
          className="campo__control"
          defaultValue=""
          aria-invalid={errorDe(errores, "numeroMesa") ? true : undefined}
          aria-describedby={errorDe(errores, "numeroMesa") ? "numeroMesa-error" : undefined}
        >
          <option value="" disabled>
            Elige la mesa
          </option>
          {Array.from({ length: MESAS }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Mesa {i + 1}
            </option>
          ))}
        </select>
        {errorDe(errores, "numeroMesa") && (
          <p id="numeroMesa-error" className="campo__error">
            <span aria-hidden="true">⚠</span> {errorDe(errores, "numeroMesa")}
          </p>
        )}
      </div>

      <h2>Productos</h2>
      {errorDe(errores, "items") && (
        <p className="campo__error">
          <span aria-hidden="true">⚠</span> {errorDe(errores, "items")}
        </p>
      )}

      {filas.map((fila, indice) => {
        const numero = indice + 1;
        const id = (campo: string) => `${campo}-${fila.clave}`;
        const err = (campo: string) => errorDe(errores, `items.${indice}.${campo}`);
        const producto = porId.get(fila.productoId);
        return (
          <fieldset key={fila.clave} className="fila-item">
            <legend>Producto {numero}</legend>

            <SelectorProducto
              id={id("producto")}
              productos={productos}
              valor={fila.productoId}
              alCambiar={(valor) => cambiar(fila.clave, "productoId", valor)}
              error={err("productoId")}
            />

            <div className="fila-item__datos">
              <div className="campo campo--corto">
                <label htmlFor={id("cantidad")} className="campo__etiqueta">
                  Cantidad
                </label>
                <input
                  id={id("cantidad")}
                  className="campo__control"
                  inputMode="numeric"
                  value={fila.cantidad}
                  onChange={(e) => cambiar(fila.clave, "cantidad", e.target.value)}
                  aria-invalid={err("cantidad") ? true : undefined}
                  aria-describedby={`${id("cantidad-ayuda")}${err("cantidad") ? ` ${id("cantidad-error")}` : ""}`}
                />
                <span id={id("cantidad-ayuda")} className="campo__ayuda">
                  De 1 a {CANTIDAD_MAXIMA}.
                  {producto && Number(fila.cantidad) > 0
                    ? ` Subtotal: ${moneda(subtotal(producto.precio, Math.floor(Number(fila.cantidad))))}`
                    : ""}
                </span>
                {err("cantidad") && (
                  <p id={id("cantidad-error")} className="campo__error">
                    <span aria-hidden="true">⚠</span> {err("cantidad")}
                  </p>
                )}
              </div>

              <div className="campo">
                <label htmlFor={id("alergias")} className="campo__etiqueta">
                  Alergias <span className="campo__ayuda">(opcional)</span>
                </label>
                <input
                  id={id("alergias")}
                  className="campo__control"
                  maxLength={LARGO_ALERGIAS}
                  placeholder="Ej.: maní, mariscos"
                  value={fila.alergias}
                  onChange={(e) => cambiar(fila.clave, "alergias", e.target.value)}
                  aria-describedby={err("alergias") ? id("alergias-error") : undefined}
                />
                {err("alergias") && (
                  <p id={id("alergias-error")} className="campo__error">
                    <span aria-hidden="true">⚠</span> {err("alergias")}
                  </p>
                )}
              </div>

              <div className="campo">
                <label htmlFor={id("notas")} className="campo__etiqueta">
                  Notas <span className="campo__ayuda">(opcional)</span>
                </label>
                <input
                  id={id("notas")}
                  className="campo__control"
                  maxLength={LARGO_NOTAS_ITEM}
                  placeholder="Ej.: sin cebolla"
                  value={fila.notas}
                  onChange={(e) => cambiar(fila.clave, "notas", e.target.value)}
                />
              </div>
            </div>

            {filas.length > 1 && (
              <Boton variante="secundario" onClick={() => quitar(fila.clave, numero)}>
                Quitar producto {numero}
              </Boton>
            )}
          </fieldset>
        );
      })}

      <div role="status" className="solo-lector">
        {anuncio}
      </div>

      {filas.length < ITEMS_MAXIMOS && (
        <Boton id="agregar-producto" variante="secundario" onClick={agregar}>
          <span aria-hidden="true">+</span> Agregar otro producto
        </Boton>
      )}

      <div className="pedido-cierre">
        <div className="campo">
          <label htmlFor="notas-pedido" className="campo__etiqueta">
            Notas del pedido <span className="campo__ayuda">(opcional)</span>
          </label>
          <textarea
            id="notas-pedido"
            name="notas"
            className="campo__control"
            rows={2}
            maxLength={LARGO_NOTAS_PEDIDO}
          />
        </div>

        <div className="pedido-cierre__acciones">
          <p className="total-estimado">
            <span>Total estimado</span>
            <strong>{moneda(totalEstimado)}</strong>
          </p>
          <Boton type="submit" disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar pedido a cocina"}
          </Boton>
        </div>
      </div>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import bebida from "@/app/imagenes/bebida.webp";
import cafe from "@/app/imagenes/cafe.webp";
import empanada from "@/app/imagenes/empanada.webp";
import entrada from "@/app/imagenes/entrada.webp";
import limonada from "@/app/imagenes/limonada.webp";
import plato from "@/app/imagenes/plato.webp";
import pollo from "@/app/imagenes/pollo.webp";
import postre from "@/app/imagenes/postre.webp";
import sopa from "@/app/imagenes/sopa.webp";
import { moneda } from "@/lib/formato";
import type { ProductoParaPedido } from "@/modules/menu";

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
}

// Fotos de referencia. No representan ingredientes ni la presentación del restaurante.
function fotoDe(nombre: string) {
  if (/cafe|capuchino|espresso/.test(nombre)) return cafe;
  if (/bebida|cerveza|coctel/.test(nombre)) return bebida;
  // Limonada de Francesca Hotchin: https://unsplash.com/photos/p5EiqkBYIEE
  if (/jugo|limonada|refresco|batido|agua/.test(nombre)) return limonada;
  if (/helado|postre|higos|pastel|torta|flan/.test(nombre)) return postre;
  if (/locro|sopa|caldo|encebollado/.test(nombre)) return sopa;
  // Empanadas de Luther Yonel: https://unsplash.com/photos/AW2Ybe3YjEk
  if (/empanada/.test(nombre)) return empanada;
  if (/ceviche|ensalada/.test(nombre)) return entrada;
  if (/pollo/.test(nombre)) return pollo;
  return plato;
}

interface Props {
  id: string;
  productos: ProductoParaPedido[];
  nombre?: string;
  valor?: string;
  alCambiar?: (productoId: string) => void;
  error?: string;
}

export function SelectorProducto({ id, productos, nombre = id, valor, alCambiar, error }: Props) {
  const [busqueda, buscar] = useState("");
  const opciones = productos.map((producto) => ({ producto, clave: normalizar(producto.nombre) }));
  const consulta = normalizar(busqueda);
  const hayCoincidencias = opciones.some(({ clave }) => clave.includes(consulta));

  return (
    <fieldset className="selector-producto" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="solo-lector">Elegir producto</legend>
      {productos.length > 0 ? (
        <>
          <div className="selector-producto__cabecera">
            <div className="selector-producto__busqueda">
              <label htmlFor={id} className="campo__etiqueta">
                Buscar producto
              </label>
              <input
                id={id}
                type="search"
                className="campo__control"
                placeholder="Nombre del producto"
                value={busqueda}
                onChange={(evento) => buscar(evento.target.value)}
              />
            </div>
            <span className="campo__ayuda">Fotos referenciales</span>
          </div>
          <div role="status">
            {!hayCoincidencias && (
              <p className="selector-producto__sin-resultados">
                No hay productos que coincidan con la búsqueda.
              </p>
            )}
          </div>
          <div className="selector-producto__rejilla">
            {opciones.map(({ producto, clave }) => {
              const productoId = String(producto.id);
              return (
                <label
                  key={producto.id}
                  className="selector-producto__opcion"
                  hidden={!clave.includes(consulta)}
                >
                  <input
                    type="radio"
                    name={nombre}
                    value={productoId}
                    checked={valor === undefined ? undefined : valor === productoId}
                    onChange={alCambiar ? () => alCambiar(productoId) : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                  />
                  <span className="selector-producto__tarjeta">
                    <Image
                      src={fotoDe(clave)}
                      alt=""
                      width={64}
                      height={64}
                      sizes="64px"
                      unoptimized
                    />
                    <span className="selector-producto__datos">
                      <strong>{producto.nombre}</strong>
                      <span>{moneda(producto.precio)}</span>
                    </span>
                    <span className="selector-producto__marca" aria-hidden="true" />
                  </span>
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <p>No hay productos disponibles.</p>
      )}
      {error && (
        <p id={`${id}-error`} className="campo__error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

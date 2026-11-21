"use client";

import { useActionState } from "react";
import { Anuncio } from "@/componentes/Anuncio";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import type { EstadoFormulario } from "@/lib/formularios";
import { CAMPO_CSRF } from "@/lib/seguridad/constantes";
import type { ProductoGuardado } from "@/modules/menu";

type AccionProducto = (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

interface Props {
  producto?: ProductoGuardado;
  csrf: string;
  accion: AccionProducto;
}

function errorDe(
  errores: Record<string, string[]> | undefined,
  campo: string,
): string[] | undefined {
  return errores?.[campo];
}

export function FormularioProducto({ producto, csrf, accion }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const errores = estado.errores;

  return (
    <form action={enviar} noValidate className="formulario-producto">
      <input type="hidden" name={CAMPO_CSRF} value={csrf} />
      {producto && <input type="hidden" name="id" value={producto.id} />}
      <Anuncio mensaje={estado.exito === false ? estado.mensaje : undefined} tipo="error" />

      <Campo
        nombre="nombre"
        etiqueta="Nombre"
        maxLength={120}
        defaultValue={producto?.nombre}
        errores={errorDe(errores, "nombre")}
        required
      />
      <Campo
        nombre="categoria"
        etiqueta="Categoría"
        maxLength={60}
        defaultValue={producto?.categoria}
        errores={errorDe(errores, "categoria")}
        required
      />
      <Campo
        nombre="precio"
        etiqueta="Precio"
        type="number"
        inputMode="decimal"
        min="0"
        max="99999999.99"
        step="0.01"
        defaultValue={producto?.precio}
        errores={errorDe(errores, "precio")}
        required
      />
      <div className="campo">
        <label htmlFor="descripcion" className="campo__etiqueta">
          Descripción <span className="campo__ayuda">(opcional)</span>
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          className="campo__control"
          maxLength={500}
          rows={4}
          defaultValue={producto?.descripcion ?? ""}
          aria-invalid={errorDe(errores, "descripcion") ? true : undefined}
          aria-describedby={errorDe(errores, "descripcion") ? "descripcion-error" : undefined}
        />
        {errorDe(errores, "descripcion") && (
          <p id="descripcion-error" className="campo__error">
            <span aria-hidden="true">⚠</span> {errorDe(errores, "descripcion")!.join(" ")}
          </p>
        )}
      </div>
      <div className="grupo-botones">
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
        </Boton>
      </div>
      <Anuncio mensaje={estado.exito ? estado.mensaje : undefined} tipo="exito" />
    </form>
  );
}

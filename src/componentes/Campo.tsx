import type { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "name"> {
  /** name del input. */
  nombre: string;
  /** id del input (por defecto `campo-<nombre>`). Úsalo si hay varios formularios con el mismo campo. */
  id?: string;
  etiqueta: string;
  /** Texto de ayuda permanente (formato, mínimo de caracteres...). */
  ayuda?: string;
  /** Mensajes de error de este campo, tal como los devuelve ErrorValidacion.campos. */
  errores?: string[];
}

/**
 * Campo de formulario accesible: etiqueta visible, ayuda y error enlazados con
 * aria-describedby, y aria-invalid cuando hay error. El error lleva texto y
 * símbolo, nunca solo color.
 *
 * Los formularios llevan `noValidate`: la validación es la de Zod (cliente y
 * servidor), con estos mismos mensajes, no la del navegador.
 */
export function Campo({ nombre, id: idPropio, etiqueta, ayuda, errores, ...resto }: Props) {
  const id = idPropio ?? `campo-${nombre}`;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = errores?.length ? `${id}-error` : undefined;
  const describe = [idAyuda, idError].filter(Boolean).join(" ") || undefined;

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      {ayuda && (
        <span id={idAyuda} className="campo__ayuda">
          {ayuda}
        </span>
      )}
      <input
        id={id}
        name={nombre}
        className="campo__control"
        aria-invalid={idError ? true : undefined}
        aria-describedby={describe}
        {...resto}
      />
      {idError && (
        <p id={idError} className="campo__error">
          <span aria-hidden="true">⚠</span>
          <span>{errores!.join(" ")}</span>
        </p>
      )}
    </div>
  );
}

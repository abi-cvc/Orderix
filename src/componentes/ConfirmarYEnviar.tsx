"use client";

import { useId, useRef } from "react";
import { Boton } from "./Boton";

interface Props {
  /** Texto del botón que abre la confirmación ("Eliminar"). */
  textoBoton: string;
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  peligro?: boolean;
}

/**
 * Botón que pide confirmación antes de enviar el formulario que lo contiene.
 * Úsalo para eliminar, cancelar o cobrar:
 *
 *   <form action={eliminarProducto}>
 *     <input type="hidden" name="id" value={producto.id} />
 *     <input type="hidden" name={CAMPO_CSRF} value={csrf} />
 *     <ConfirmarYEnviar textoBoton="Eliminar" titulo="¿Eliminar el producto?"
 *       descripcion="Esta acción no se puede deshacer." peligro />
 *   </form>
 *
 * Accesibilidad: diálogo modal nativo (el foco queda dentro), se abre con el
 * foco en "Cancelar" (la opción segura), Escape cierra, y el foco vuelve al
 * botón que lo abrió.
 */
export function ConfirmarYEnviar({
  textoBoton,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  peligro = false,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const id = useId();

  const cerrar = () => {
    dialogo.current?.close();
    disparador.current?.focus();
  };

  const confirmar = () => {
    const formulario = disparador.current?.form;
    dialogo.current?.close();
    formulario?.requestSubmit();
  };

  return (
    <>
      <Boton
        ref={disparador}
        variante={peligro ? "peligro" : "secundario"}
        aria-haspopup="dialog"
        onClick={() => dialogo.current?.showModal()}
      >
        {textoBoton}
      </Boton>
      <dialog
        ref={dialogo}
        className="dialogo"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descripcion`}
        onCancel={(evento) => {
          evento.preventDefault(); // Escape: cerrar devolviendo el foco
          cerrar();
        }}
      >
        <h2 id={`${id}-titulo`}>{titulo}</h2>
        <p id={`${id}-descripcion`}>{descripcion}</p>
        <div className="grupo-botones">
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- foco inicial en la opción segura del diálogo */}
          <Boton variante="secundario" onClick={cerrar} autoFocus>
            Cancelar
          </Boton>
          <Boton variante={peligro ? "peligro" : "primario"} onClick={confirmar}>
            {textoConfirmar}
          </Boton>
        </div>
      </dialog>
    </>
  );
}

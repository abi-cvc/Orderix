import type { ComponentPropsWithRef } from "react";

type Variante = "primario" | "secundario" | "peligro";

interface Props extends ComponentPropsWithRef<"button"> {
  variante?: Variante;
}

/**
 * Botón base: 44px de alto mínimo y foco visible. Por defecto es type="button"
 * para no enviar formularios por accidente; usa type="submit" cuando corresponda.
 * Las acciones destructivas usan variante="peligro" y siempre piden confirmación.
 */
export function Boton({ variante = "primario", className, type = "button", ...resto }: Props) {
  return (
    <button
      type={type}
      className={`boton boton--${variante}${className ? ` ${className}` : ""}`}
      {...resto}
    />
  );
}

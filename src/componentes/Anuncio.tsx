interface Props {
  /** Texto del anuncio. Vacío = región presente pero sin mensaje. */
  mensaje?: string;
  /**
   * - "estado": cortés (role="status"). Para confirmaciones, chat y cambios de estado.
   * - "alerta": inmediato (role="alert"). Solo para lo urgente: una ALERGIA nueva o un error.
   * - "exito" / "error": como "estado" / "alerta", con color y símbolo propios.
   */
  tipo?: "estado" | "alerta" | "exito" | "error" | "alergia";
}

const SIMBOLO = { estado: "ℹ", exito: "✓", error: "⚠", alerta: "⚠", alergia: "⚠" } as const;

/**
 * Región que los lectores de pantalla anuncian cuando cambia su texto, sin
 * mover el foco. La región debe existir ANTES de recibir el mensaje: renderízala
 * siempre y cambia solo `mensaje`. No la hagas desaparecer antes de que se lea.
 */
export function Anuncio({ mensaje, tipo = "estado" }: Props) {
  const urgente = tipo === "alerta" || tipo === "error" || tipo === "alergia";
  return (
    <div role={urgente ? "alert" : "status"} className={`aviso aviso--${tipo}`} aria-atomic="true">
      {mensaje ? (
        <>
          <span aria-hidden="true">{SIMBOLO[tipo]}</span>
          <span>{mensaje}</span>
        </>
      ) : null}
    </div>
  );
}

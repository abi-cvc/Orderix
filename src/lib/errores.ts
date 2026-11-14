/**
 * Errores de dominio que lanzan los servicios. Las páginas, acciones de
 * servidor y eventos de WebSocket los traducen a una respuesta para el usuario.
 * El mensaje siempre es apto para mostrarse: nunca lleva datos internos.
 */

export class ErrorDominio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** Datos inválidos. `campos` lleva el mensaje de cada campo para el formulario. */
export class ErrorValidacion extends ErrorDominio {
  constructor(
    public readonly campos: Record<string, string[]>,
    mensaje = "Revisa los datos marcados.",
  ) {
    super(mensaje);
  }
}

/** No hay sesión iniciada (equivale a HTTP 401). */
export class ErrorNoAutenticado extends ErrorDominio {
  constructor(mensaje = "Debes iniciar sesión.") {
    super(mensaje);
  }
}

/** Hay sesión, pero el rol o el dueño del dato no corresponde (HTTP 403). */
export class ErrorProhibido extends ErrorDominio {
  constructor(mensaje = "No tienes permiso para esta acción.") {
    super(mensaje);
  }
}

/** El recurso no existe o el usuario no puede verlo (HTTP 404). */
export class ErrorNoEncontrado extends ErrorDominio {
  constructor(mensaje = "No se encontró lo que buscas.") {
    super(mensaje);
  }
}

/** La acción choca con el estado actual, por ejemplo calificar dos veces (HTTP 409). */
export class ErrorConflicto extends ErrorDominio {}

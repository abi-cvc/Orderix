/**
 * El último argumento de un evento de Socket.IO solo es el callback (ack) si el
 * cliente lo mandó así; un cliente malicioso puede enviar ahí cualquier valor.
 * Llamar a algo que no es función lanza un TypeError fuera de todo try/catch y
 * tumba el proceso, así que cada manejador pasa su ack por aquí.
 */
export type Responder = (respuesta: unknown) => void;

export function comoResponder(valor: unknown): Responder {
  return typeof valor === "function" ? (valor as Responder) : () => {};
}

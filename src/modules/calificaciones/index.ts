/**
 * API pública del módulo calificaciones (módulo de ejemplo).
 * Los validadores se importan aparte, desde "@/modules/calificaciones/validadores",
 * porque también los usa el navegador.
 */
export { calificacionesDePedidos, calificarPedido, obtenerCalificacion } from "./servicio";
export type { CalificacionGuardada } from "./repositorio";

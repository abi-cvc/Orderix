import { ErrorDominio } from "@/lib/errores";

export const MAXIMO_INTENTOS = 5;
export const BLOQUEO_MS = 15 * 60_000;

export class ErrorLimiteIntentos extends ErrorDominio {
  constructor(public readonly reintentarEnSegundos: number) {
    super("Demasiados intentos. Intenta de nuevo en 15 minutos.");
  }
}

type Operacion = "login" | "recuperacion";
interface Contador {
  intentos: number;
  venceEn: number;
}

/** Estado local al proceso; cada instancia permite aislar las pruebas sin temporizadores. */
export function crearLimitadorIntentos(ahora: () => number = Date.now) {
  const contadores = new Map<string, Contador>();

  return (operacion: Operacion, ip: string, correo: string): void => {
    const instante = ahora();
    // Elimina tanto ventanas de intentos como bloqueos vencidos.
    for (const [clave, contador] of contadores) {
      if (contador.venceEn <= instante) contadores.delete(clave);
    }
    // Son dos cuotas independientes: cambiar de correo no evita el límite de IP,
    // y cambiar de IP no evita el límite de correo. Cada flujo tiene sus cuotas.
    const claves = [
      JSON.stringify([operacion, "ip", ip]),
      JSON.stringify([operacion, "correo", correo.trim().toLowerCase()]),
    ];
    const bloqueadoHasta = Math.max(
      0,
      ...claves.map((clave) => {
        const contador = contadores.get(clave);
        return contador && contador.intentos >= MAXIMO_INTENTOS ? contador.venceEn : 0;
      }),
    );
    if (bloqueadoHasta > instante) {
      throw new ErrorLimiteIntentos(Math.ceil((bloqueadoHasta - instante) / 1000));
    }
    // Reserva ambos intentos sin await: dos solicitudes concurrentes no pueden
    // superar la cuota mientras esperan las consultas o el hash de la clave.
    for (const clave of claves) {
      const contador = contadores.get(clave) ?? { intentos: 0, venceEn: instante + BLOQUEO_MS };
      contador.intentos += 1;
      // Al alcanzar cinco intentos empieza un bloqueo completo de 15 minutos.
      if (contador.intentos === MAXIMO_INTENTOS) contador.venceEn = instante + BLOQUEO_MS;
      contadores.set(clave, contador);
    }
  };
}

/** Compartido por todas las peticiones de este proceso de servidor. */
export const limitarIntentos = crearLimitadorIntentos();

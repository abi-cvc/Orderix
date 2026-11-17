import { ErrorDominio } from "@/lib/errores";

export const MAXIMO_INTENTOS_CORREO = 5;
export const MAXIMO_INTENTOS_IP = 30;
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

  function limpiarVencidos(): number {
    const instante = ahora();
    // Elimina tanto ventanas de intentos como bloqueos vencidos.
    for (const [clave, contador] of contadores) {
      if (contador.venceEn <= instante) contadores.delete(clave);
    }
    return instante;
  }

  function claveCorreo(operacion: Operacion, correo: string): string {
    return JSON.stringify([operacion, "correo", correo.trim().toLowerCase()]);
  }

  function cuotas(operacion: Operacion, ip: string, correo: string) {
    return [
      { clave: JSON.stringify([operacion, "ip", ip]), maximo: MAXIMO_INTENTOS_IP },
      { clave: claveCorreo(operacion, correo), maximo: MAXIMO_INTENTOS_CORREO },
    ];
  }

  /** Consulta sin consumir intentos, antes de acceder a la base o verificar la clave. */
  function comprobarBloqueo(operacion: Operacion, ip: string, correo: string): void {
    const instante = limpiarVencidos();
    const bloqueadoHasta = Math.max(
      0,
      ...cuotas(operacion, ip, correo).map(({ clave, maximo }) => {
        const contador = contadores.get(clave);
        return contador && contador.intentos >= maximo ? contador.venceEn : 0;
      }),
    );
    if (bloqueadoHasta > instante) {
      throw new ErrorLimiteIntentos(Math.ceil((bloqueadoHasta - instante) / 1000));
    }
  }

  /** En login se llama solo tras un fallo; en recuperación, por cada solicitud. */
  function registrarIntento(operacion: Operacion, ip: string, correo: string): void {
    const instante = limpiarVencidos();
    for (const { clave, maximo } of cuotas(operacion, ip, correo)) {
      const contador = contadores.get(clave) ?? { intentos: 0, venceEn: instante + BLOQUEO_MS };
      // Fallos que ya estaban en vuelo no extienden un bloqueo alcanzado entretanto.
      if (contador.intentos >= maximo) continue;
      contador.intentos += 1;
      if (contador.intentos === maximo) contador.venceEn = instante + BLOQUEO_MS;
      contadores.set(clave, contador);
    }
  }

  /** Un login correcto limpia solo su correo; conserva los fallos acumulados por IP. */
  function reiniciarCorreoLogin(correo: string): void {
    contadores.delete(claveCorreo("login", correo));
  }

  return { comprobarBloqueo, registrarIntento, reiniciarCorreoLogin };
}

/** Compartido por todas las peticiones de este proceso de servidor. */
export const limitadorIntentos = crearLimitadorIntentos();

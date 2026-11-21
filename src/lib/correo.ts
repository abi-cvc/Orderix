/**
 * Envío de correos con la API de Brevo (por HTTPS, no SMTP: los hostings
 * gratuitos suelen bloquear los puertos de correo).
 *
 * Nunca lanza: devuelve si se envió o por qué no, y quien lo llama decide el
 * respaldo. Los registros nunca incluyen la clave de la API.
 */
import { env } from "@/lib/env";

export interface Mensaje {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

export interface ConfigCorreo {
  apiKey: string;
  remitente: string;
  nombreRemitente: string;
}

export type ResultadoEnvio = { enviado: true } | { enviado: false; motivo: string };

const URL_BREVO = "https://api.brevo.com/v3/smtp/email";
const ESPERA_MAXIMA_MS = 10_000;

/** Configuración del correo real, o null si no está configurado. */
export function configCorreo(): ConfigCorreo | null {
  const { BREVO_API_KEY, CORREO_REMITENTE, CORREO_REMITENTE_NOMBRE } = env();
  if (!BREVO_API_KEY || !CORREO_REMITENTE) return null;
  return {
    apiKey: BREVO_API_KEY,
    remitente: CORREO_REMITENTE,
    nombreRemitente: CORREO_REMITENTE_NOMBRE,
  };
}

export async function enviarCorreo(
  mensaje: Mensaje,
  opciones: { config: ConfigCorreo | null; fetch: typeof fetch } = {
    config: configCorreo(),
    fetch: globalThis.fetch,
  },
): Promise<ResultadoEnvio> {
  const { config } = opciones;
  if (!config) return { enviado: false, motivo: "sin-configurar" };

  try {
    const respuesta = await opciones.fetch(URL_BREVO, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.remitente, name: config.nombreRemitente },
        to: [{ email: mensaje.para }],
        subject: mensaje.asunto,
        htmlContent: mensaje.html,
        textContent: mensaje.texto,
      }),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (respuesta.ok) return { enviado: true };
    return { enviado: false, motivo: `Brevo respondió ${respuesta.status}` };
  } catch (error) {
    return { enviado: false, motivo: error instanceof Error ? error.name : "error de red" };
  }
}

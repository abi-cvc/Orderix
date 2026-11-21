/**
 * Entrega del enlace de recuperación de clave.
 *
 * - Con Brevo configurado: se envía por correo a la persona.
 * - Sin configurar o si el envío falla: el enlace se muestra en la consola del
 *   servidor (el “correo simulado” que pide la guía), así la recuperación
 *   nunca deja de funcionar.
 */
import { enviarCorreo, type Mensaje, type ResultadoEnvio } from "@/lib/correo";

export const MINUTOS_VALIDEZ_ENLACE = 30;

/** Escapa texto para HTML: el nombre lo escribe el usuario al registrarse. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Correo de recuperación en HTML (accesible y con estilos en línea) y en texto plano. */
export function plantillaRecuperacion(datos: {
  nombre: string;
  enlace: string;
}): Omit<Mensaje, "para"> {
  const nombre = escaparHtml(datos.nombre);
  const enlace = escaparHtml(datos.enlace);
  const minutos = MINUTOS_VALIDEZ_ENLACE;

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f4ede3;font-family:Arial,Helvetica,sans-serif;color:#2b211c;">
  <div style="max-width:520px;margin:0 auto;background:#fffaf3;border-radius:12px;padding:32px;border:1px solid #e3d5c3;">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a4b2a;">Orderix</p>
    <h1 style="margin:0 0 16px;font-size:24px;color:#2b211c;">Restablece tu clave</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hola, ${nombre}. Recibimos una solicitud para restablecer la clave de tu cuenta en Orderix.</p>
    <p style="margin:24px 0;">
      <a href="${enlace}" style="display:inline-block;background:#6b3a22;color:#fffaf3;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 24px;border-radius:999px;">Restablecer mi clave</a>
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">El enlace vence en ${minutos} minutos y solo se puede usar una vez.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Si el botón no funciona, copia esta dirección en tu navegador:<br><span style="word-break:break-all;color:#6b3a22;">${enlace}</span></p>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#5c4a3f;">Si no pediste este cambio, ignora este correo: tu clave seguirá siendo la misma.</p>
  </div>
</body>
</html>`;

  const texto = [
    `Hola, ${datos.nombre}.`,
    "",
    "Recibimos una solicitud para restablecer la clave de tu cuenta en Orderix.",
    "Abre este enlace para elegir una clave nueva:",
    datos.enlace,
    "",
    `El enlace vence en ${minutos} minutos y solo se puede usar una vez.`,
    "Si no pediste este cambio, ignora este correo: tu clave seguirá siendo la misma.",
  ].join("\n");

  return { asunto: "Restablece tu clave de Orderix", html, texto };
}

/**
 * Envía el enlace por correo o, si no se puede, lo deja en la consola.
 * Nunca lanza: un fallo del correo no debe romper la recuperación.
 */
export async function entregarEnlaceRecuperacion(
  destino: { correo: string; nombre: string },
  enlace: string,
  opciones: {
    enviar: (mensaje: Mensaje) => Promise<ResultadoEnvio>;
    registrar: (...datos: unknown[]) => void;
  } = { enviar: (mensaje) => enviarCorreo(mensaje), registrar: console.info },
): Promise<void> {
  const resultado = await opciones.enviar({
    para: destino.correo,
    ...plantillaRecuperacion({ nombre: destino.nombre, enlace }),
  });
  if (resultado.enviado) {
    opciones.registrar("Correo de recuperación de clave enviado.");
    return;
  }
  if (resultado.motivo !== "sin-configurar") {
    opciones.registrar(`No se pudo enviar el correo de recuperación (${resultado.motivo}).`);
  }
  // Respaldo: correo simulado en la consola del servidor.
  opciones.registrar("Enlace de recuperación de clave:", enlace);
}

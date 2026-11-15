/**
 * Cabeceras de seguridad HTTP (helmet) y política de contenido (CSP) con nonce.
 *
 * Se aplican en server.ts a TODAS las respuestas, antes de entregar la petición
 * a Next. El nonce cambia en cada petición: Next lo lee de la cabecera
 * `content-security-policy` de la PETICIÓN y lo pone en sus <script>, así que
 * solo se ejecutan los scripts que generó el servidor (defensa contra XSS).
 */
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import helmet from "helmet";
import { env } from "@/lib/env";

type RespuestaConNonce = ServerResponse & { nonceCsp?: string };
type Middleware = ReturnType<typeof helmet>;

function crearMiddleware(): Middleware {
  const { NODE_ENV, APP_URL } = env();
  const produccion = NODE_ENV === "production";
  const url = new URL(APP_URL);
  const https = url.protocol === "https:";
  // WebSocket del mismo sitio (Socket.IO): wss cuando APP_URL es https (Render).
  const webSocket = `${https ? "wss" : "ws"}://${url.host}`;

  const nonce = (_req: IncomingMessage, res: ServerResponse) =>
    `'nonce-${(res as RespuestaConNonce).nonceCsp}'`;

  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        // 'strict-dynamic': los scripts con nonce pueden cargar los trozos de Next.
        // 'unsafe-eval' solo en desarrollo: lo necesita React para depurar.
        scriptSrc: ["'self'", nonce, "'strict-dynamic'", ...(produccion ? [] : ["'unsafe-eval'"])],
        // Next y React insertan estilos en línea; el riesgo de los estilos es bajo.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        // En desarrollo, ws: para la recarga en caliente de Next.
        connectSrc: ["'self'", webSocket, ...(produccion ? [] : ["ws:"])],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        // Solo con HTTPS (Render): en local, subir a https rompería la página.
        ...(https ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    // HSTS solo con HTTPS.
    strictTransportSecurity: https ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}

let middleware: Middleware | undefined;

/**
 * Genera el nonce de esta petición, lo deja visible para Next y escribe las
 * cabeceras de seguridad en la respuesta.
 */
export function aplicarCabecerasSeguridad(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  middleware ??= crearMiddleware();

  const nonce = randomBytes(16).toString("base64url");
  (res as RespuestaConNonce).nonceCsp = nonce;
  // Se sobrescribe siempre: el navegador no puede elegir el nonce enviando esta cabecera.
  req.headers["content-security-policy"] = `script-src 'nonce-${nonce}'`;

  const aplicar = middleware;
  return new Promise((resolve, reject) => {
    aplicar(req, res, (error?: unknown) => (error ? reject(error) : resolve()));
  });
}

/**
 * Servidor Node propio de Orderix.
 *
 * Arranca Next.js (vistas renderizadas en el servidor) y monta Socket.IO en el
 * MISMO proceso y el MISMO puerto, como exige la guía para el monolito.
 * En el segundo bimestre Socket.IO se mueve a su propio servicio.
 */
import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { env } from "@/lib/env";
import { registrarServidorSocket } from "@/modules/tiempo-real";

const dev = process.env.NODE_ENV !== "production";
// Carga .env antes de validar, con las mismas reglas que Next.js.
loadEnvConfig(process.cwd(), dev);

async function main(): Promise<void> {
  // Falla al arrancar si falta o es inválida alguna variable de entorno.
  const { HOST: hostname, PORT: port } = env();

  const app = next({ dev, hostname, port });
  await app.prepare();

  const handle = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();

  const httpServer = createServer((req, res) => {
    void handle(req, res);
  });

  const io = new SocketServer(httpServer, {
    path: "/socket.io",
    // No destruir conexiones de upgrade ajenas: las de recarga en caliente de Next.
    destroyUpgrade: false,
  });
  registrarServidorSocket(io);

  // Upgrades que no son de Socket.IO (por ejemplo, HMR de Next en desarrollo).
  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/socket.io")) {
      void handleUpgrade(req, socket, head);
    }
  });

  // Provisional (paso 1): se reemplaza en el paso 6 por el módulo tiempo-real,
  // con autenticación en el handshake.
  io.on("connection", (socket) => {
    socket.on("ping", (ack?: (respuesta: string) => void) => {
      if (typeof ack === "function") ack("pong");
    });
  });

  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`El puerto ${port} ya está en uso. Cierra el otro proceso o cambia PORT.`);
    } else {
      console.error("Error del servidor HTTP", error);
    }
    process.exit(1);
  });

  httpServer.listen(port, hostname, () => {
    console.log(
      `> Orderix escuchando en http://localhost:${port} (${dev ? "desarrollo" : "producción"})`,
    );
  });
}

main().catch((error: unknown) => {
  console.error("No se pudo iniciar el servidor", error);
  process.exit(1);
});

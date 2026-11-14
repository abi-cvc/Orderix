/**
 * Servidor Node propio de Orderix.
 *
 * Arranca Next.js (vistas renderizadas en el servidor) y monta Socket.IO en el
 * MISMO proceso y el MISMO puerto, como exige la guía para el monolito.
 * En el segundo bimestre Socket.IO se mueve a su propio servicio.
 */
import { createServer } from "node:http";
import next from "next";
import { Server as SocketServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
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

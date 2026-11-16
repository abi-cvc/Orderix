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
import { aplicarCabecerasSeguridad } from "@/lib/seguridad/cabeceras";
import { CABECERA_IP_CLIENTE, calcularIpCliente } from "@/lib/seguridad/peticion";
import { configurarConexiones, registrarServidorSocket } from "@/modules/tiempo-real";

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
    // IP confiable para el límite de intentos (se sobrescribe la que mande el cliente).
    req.headers[CABECERA_IP_CLIENTE] = calcularIpCliente(req);
    aplicarCabecerasSeguridad(req, res)
      .then(() => handle(req, res))
      .catch((error: unknown) => {
        console.error("Error al atender la petición", error);
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      });
  });

  const io = new SocketServer(httpServer, {
    path: "/socket.io",
    // No destruir conexiones de upgrade ajenas: las de recarga en caliente de Next.
    destroyUpgrade: false,
    // Tamaño máximo de un mensaje: 16 KB (un mensaje de chat tiene máximo 1000 caracteres).
    maxHttpBufferSize: 16 * 1024,
    // El cliente se empaqueta con la aplicación; no hace falta servirlo aparte.
    serveClient: false,
  });
  registrarServidorSocket(io);

  // Upgrades que no son de Socket.IO (por ejemplo, HMR de Next en desarrollo).
  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/socket.io")) {
      void handleUpgrade(req, socket, head);
    }
  });

  // Origen, sesión en el handshake, salas por rol y usuario, límites.
  configurarConexiones(io);

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

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Boton } from "@/componentes/Boton";
import { Campo } from "@/componentes/Campo";
import { obtenerSocket } from "@/lib/socket-cliente";
import type { MensajeGuardado, UsuarioConectado } from "@/modules/tiempo-real";
import { esquemaTextoMensaje } from "@/modules/tiempo-real/validadores";

interface Props {
  usuarioActualId: number;
}

type EstadoConexion = "conectando" | "conectado" | "error" | "desconectado";

function formatearHora(fecha: Date | string): string {
  try {
    const d = typeof fecha === "string" ? new Date(fecha) : fecha;
    return new Intl.DateTimeFormat("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export function ChatCliente({ usuarioActualId }: Props) {
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>(() => {
    if (typeof window !== "undefined") {
      return obtenerSocket().connected ? "conectado" : "conectando";
    }
    return "conectando";
  });
  const [mensajes, setMensajes] = useState<MensajeGuardado[]>([]);
  const [conectados, setConectados] = useState<UsuarioConectado[]>([]);
  const [texto, setTexto] = useState("");
  const [errores, setErrores] = useState<string[]>();
  const [enviando, setEnviando] = useState(false);
  const [avisoLimite, setAvisoLimite] = useState<string>();
  const [anuncioNuevo, setAnuncioNuevo] = useState<string>();
  const contenedorMensajesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = obtenerSocket();

    const alConectar = () => {
      setEstadoConexion("conectado");
      setAvisoLimite(undefined);
    };

    const alError = () => {
      setEstadoConexion("error");
    };

    const alDesconectar = () => {
      setEstadoConexion("desconectado");
    };

    const alRecibirLimite = (datos: { mensaje: string }) => {
      setAvisoLimite(datos.mensaje);
    };

    const alRecibirConectados = (lista: UsuarioConectado[]) => {
      setConectados(lista);
    };

    const alRecibirHistorial = (historial: MensajeGuardado[]) => {
      // El historial inicial NO debe anunciarse mensaje por mensaje
      setMensajes(historial);
    };

    const alRecibirMensaje = (nuevoMensaje: MensajeGuardado) => {
      setMensajes((anteriores) => {
        if (anteriores.some((m) => m.id === nuevoMensaje.id)) return anteriores;
        return [...anteriores, nuevoMensaje];
      });

      // Se anuncia cortésmente el mensaje nuevo sin mover el foco
      setAnuncioNuevo(`Nuevo mensaje de ${nuevoMensaje.autorNombre}: ${nuevoMensaje.texto}`);
    };

    socket.on("connect", alConectar);
    socket.on("connect_error", alError);
    socket.on("disconnect", alDesconectar);
    socket.on("limite", alRecibirLimite);
    socket.on("chat:conectados", alRecibirConectados);
    socket.on("chat:historial", alRecibirHistorial);
    socket.on("chat:mensaje", alRecibirMensaje);

    // Pedir historial al montar
    socket.emit(
      "chat:historial",
      "general",
      (respuesta: { ok: boolean; mensajes?: MensajeGuardado[] }) => {
        if (respuesta?.ok && respuesta.mensajes) {
          setMensajes(respuesta.mensajes);
        }
      },
    );

    return () => {
      socket.off("connect", alConectar);
      socket.off("connect_error", alError);
      socket.off("disconnect", alDesconectar);
      socket.off("limite", alRecibirLimite);
      socket.off("chat:conectados", alRecibirConectados);
      socket.off("chat:historial", alRecibirHistorial);
      socket.off("chat:mensaje", alRecibirMensaje);
    };
  }, []);

  // Desplazamiento automático de la vista de mensajes sin mover el foco
  useEffect(() => {
    if (contenedorMensajesRef.current) {
      contenedorMensajesRef.current.scrollTop = contenedorMensajesRef.current.scrollHeight;
    }
  }, [mensajes]);

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (enviando) return;

    const resultado = esquemaTextoMensaje.safeParse(texto);
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]?.message ?? "El mensaje no es válido.";
      setErrores([primerError]);
      return;
    }

    setErrores(undefined);
    setEnviando(true);
    const socket = obtenerSocket();

    socket.emit(
      "chat:enviar",
      { texto: resultado.data, sala: "general" },
      (respuesta: { ok: boolean; error?: string }) => {
        setEnviando(false);
        if (respuesta?.ok) {
          setTexto("");
        } else if (respuesta?.error) {
          setErrores([respuesta.error]);
        }
      },
    );
  };

  const textoEstado = {
    conectando: "○ Conectando al chat...",
    conectado: "● En línea",
    error: "⚠ Error de conexión en tiempo real",
    desconectado: "⚠ Desconectado del chat",
  }[estadoConexion];

  return (
    <div className="chat-layout">
      {/* Región viva cortés solo para anuncios de mensajes nuevos */}
      <div aria-live="polite" aria-atomic="true" className="solo-lector">
        {anuncioNuevo}
      </div>

      {/* Barra de estado de conexión */}
      <div className="chat-estado" role="status">
        <span
          className={`chat-estado__indicador chat-estado__indicador--${estadoConexion}`}
          aria-hidden="true"
        />
        <span>{textoEstado}</span>
      </div>

      {avisoLimite && (
        <div className="aviso aviso--alerta" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{avisoLimite}</span>
        </div>
      )}

      <div className="chat-principal">
        {/* Panel de conversación */}
        <section className="seccion chat-conversacion" aria-label="Mensajes del chat">
          <div
            ref={contenedorMensajesRef}
            className="chat-mensajes"
            role="region"
            aria-label="Historial de mensajes de la sala general"
          >
            {mensajes.length === 0 ? (
              <p className="campo__ayuda chat-mensajes__vacio">
                No hay mensajes aún en esta sala. Sé el primero en escribir.
              </p>
            ) : (
              <ol className="chat-lista-mensajes">
                {mensajes.map((mensaje) => {
                  const esPropio = mensaje.autorId === usuarioActualId;
                  return (
                    <li
                      key={mensaje.id}
                      className={`chat-burbuja${esPropio ? " chat-burbuja--propio" : ""}`}
                    >
                      <div className="chat-burbuja__encabezado">
                        <strong className="chat-burbuja__autor">{mensaje.autorNombre}</strong>
                        <time
                          className="chat-burbuja__hora"
                          dateTime={new Date(mensaje.enviadoEn).toISOString()}
                        >
                          {formatearHora(mensaje.enviadoEn)}
                        </time>
                      </div>
                      <p className="chat-burbuja__texto">{mensaje.texto}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Formulario para escribir mensaje */}
          <form onSubmit={alEnviar} noValidate className="chat-formulario">
            <Campo
              nombre="texto"
              etiqueta="Escribe un mensaje"
              ayuda="Máximo 1000 caracteres"
              errores={errores}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (errores) setErrores(undefined);
              }}
              maxLength={1000}
              autoComplete="off"
              disabled={estadoConexion !== "conectado" && estadoConexion !== "conectando"}
            />
            <div className="chat-formulario__acciones">
              <Boton
                type="submit"
                variante="primario"
                disabled={enviando || !texto.trim() || estadoConexion !== "conectado"}
              >
                {enviando ? "Enviando..." : "Enviar"}
              </Boton>
            </div>
          </form>
        </section>

        {/* Panel lateral de conectados */}
        <aside className="seccion chat-conectados" aria-labelledby="titulo-conectados">
          <h2 id="titulo-conectados" className="chat-conectados__titulo">
            En línea ({conectados.length})
          </h2>
          {conectados.length === 0 ? (
            <p className="campo__ayuda">No hay usuarios conectados.</p>
          ) : (
            <ul className="chat-conectados__lista">
              {conectados.map((u) => (
                <li key={u.id} className="chat-conectados__item">
                  <span className="chat-conectados__punto" aria-hidden="true">
                    ●
                  </span>
                  <span>{u.nombre}</span>
                  {u.id === usuarioActualId && <span className="campo__ayuda"> (tú)</span>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

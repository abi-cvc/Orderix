# Arquitectura del monolito de Orderix

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->

```mermaid
flowchart TD
    N["Navegador"]
    P["Proxy de Render HTTPS"]
    S["Servidor Node server.ts"]
    NX["Next.js"]
    IO["Socket.IO"]

    N -->|"HTTPS"| P
    P -->|"HTTP"| S
    P -->|"WSS a Socket.IO"| S
    S -->|"peticiones web"| NX
    S -->|"conexiones tiempo real"| IO

    subgraph MOD["Modulos del monolito"]
        AUTH["Autenticacion"]
        MENU["Menu"]
        PED["Pedidos"]
        RT["Tiempo real"]
        CAL["Calificaciones"]
    end

    NX --> AUTH
    NX --> MENU
    NX --> PED
    IO --> RT
    NX --> CAL
    subgraph DATA["Persistencia"]
        PRISMA["Prisma"]
        DB[("PostgreSQL en Neon")]
    end
    MOD -->|"acceso a datos"| PRISMA
    PRISMA -->|"SQL"| DB
    IO -->|"eventos"| PED

    subgraph PROD["Produccion"]
        R["Render Web Service"]
    end
    R -->|"termina TLS y reenvia HTTP y WebSocket"| P
```

Render termina HTTPS y acepta WSS en su proxy; el servicio Node recibe el
tráfico reenviado y conserva el mismo puerto interno para HTTP y WebSocket.
Dentro de `server.ts`, la configuración de Next.js y la de Socket.IO están
separadas: Next.js atiende las peticiones HTTP y Socket.IO administra el
endpoint `/socket.io` y sus upgrades. Prisma conecta los módulos con
PostgreSQL, alojado en Neon en producción. La aplicación utiliza una única
base de datos PostgreSQL.

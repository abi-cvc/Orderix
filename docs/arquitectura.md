# Arquitectura del monolito de Orderix

```mermaid
flowchart TB
    N[Navegador]
    S[Servidor Node: server.ts<br/>Next.js + Socket.IO]

    N -->|HTTP| S
    N <-->|WebSocket| S

    subgraph MOD[Modulos del monolito]
        AUTH[Autenticacion]
        MENU[Menu]
        PED[Pedidos]
        RT[Tiempo-real]
        CAL[Calificaciones]
    end

    S --> AUTH
    S --> MENU
    S --> PED
    S --> RT
    S --> CAL
    MOD --> PRISMA[Prisma]
    PRISMA --> DB[(PostgreSQL en Neon)]

    subgraph PROD[Produccion]
        R[Render]
    end

    R -.-> S
```

El monolito se despliega en Render. El mismo proceso de `server.ts` ejecuta
Next.js y Socket.IO; Prisma conecta los módulos con PostgreSQL, alojado en Neon
en producción. La aplicación utiliza una única base de datos PostgreSQL.

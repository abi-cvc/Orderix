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
    PRISMA --> DB[(PostgreSQL)]

    subgraph PROD[Produccion]
        R[Render]
        NEON[(Neon)]
    end

    R -.-> S
    DB -.-> NEON
```

El monolito se despliega en Render. El mismo proceso de `server.ts` ejecuta
Next.js y Socket.IO; Prisma conecta los módulos con PostgreSQL, alojado en Neon
en producción.

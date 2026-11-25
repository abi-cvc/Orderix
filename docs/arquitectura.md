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

## Modelo C4

Tres niveles de zoom del [modelo C4](https://c4model.com): quién usa el
sistema y con qué se conecta (contexto), en qué piezas desplegables se divide
(contenedores) y cómo se organiza el servidor por dentro (componentes).

### Nivel 1: contexto

```mermaid
flowchart TB
    MES["Mesero<br/>[Persona]<br/>Toma pedidos y alergias"]
    COC["Cocina<br/>[Persona]<br/>Prepara los pedidos"]
    CAJ["Cajero<br/>[Persona]<br/>Cobra y abre la calificacion"]
    ADM["Administrador<br/>[Persona]<br/>Menu, usuarios y reportes"]
    CLI["Cliente<br/>[Persona]<br/>Califica el servicio"]

    ORX["Orderix<br/>[Sistema de software]<br/>Pedidos, cocina, caja y chat en tiempo real"]

    BRE["Brevo<br/>[Sistema externo]<br/>Envio de correos transaccionales"]

    MES -->|"crea y entrega pedidos"| ORX
    COC -->|"avanza la cola de cocina"| ORX
    CAJ -->|"cobra pedidos"| ORX
    ADM -->|"administra y consulta reportes"| ORX
    CLI -->|"elige una carita en la pantalla de caja"| ORX
    ORX -->|"envia el enlace de recuperacion, API HTTPS"| BRE
    BRE -->|"correo a la bandeja del usuario"| MES

    classDef persona fill:#08427b,stroke:#052e56,color:#ffffff
    classDef sistema fill:#1168bd,stroke:#0b4884,color:#ffffff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#ffffff
    class MES,COC,CAJ,ADM,CLI persona
    class ORX sistema
    class BRE externo
```

### Nivel 2: contenedores

```mermaid
flowchart TB
    PER["Personal del restaurante<br/>[Persona]<br/>Mesero, cocina, cajero, administrador"]

    subgraph ORX["Orderix"]
        WEB["Aplicacion web<br/>[Contenedor: React en el navegador]<br/>Paginas renderizadas en el servidor, formularios y cliente Socket.IO"]
        SRV["Servidor Orderix<br/>[Contenedor: Node.js 24, server.ts]<br/>Next.js 16 para paginas y acciones; Socket.IO para tiempo real; un solo proceso y puerto"]
        DB[("Base de datos<br/>[Contenedor: PostgreSQL 17 en Neon]<br/>Usuarios, sesiones, menu, pedidos, historial, chat y calificaciones")]
    end

    BRE["Brevo<br/>[Sistema externo]<br/>Correo transaccional"]

    PER -->|"usa desde celular, tablet o PC, HTTPS"| WEB
    WEB -->|"paginas y acciones de formulario, HTTPS con cookie de sesion y CSRF"| SRV
    WEB -->|"avisos y chat, WSS con la cookie en el handshake"| SRV
    SRV -->|"lee y escribe, Prisma 7 con TLS"| DB
    SRV -->|"enlace de recuperacion, API HTTPS"| BRE

    classDef persona fill:#08427b,stroke:#052e56,color:#ffffff
    classDef contenedor fill:#438dd5,stroke:#2e6295,color:#ffffff
    classDef externo fill:#999999,stroke:#6b6b6b,color:#ffffff
    class PER persona
    class WEB,SRV,DB contenedor
    class BRE externo
```

En producción el servidor corre en un contenedor Docker en Render, que termina
HTTPS en su proxy y reenvía HTTP y WebSocket al mismo puerto interno.

### Nivel 3: componentes del servidor

Cada módulo de `src/modules` es un componente con su API pública en
`index.ts`. Las flechas son llamadas a esa API (ESLint impide importar el
interior de otro módulo) y ningún módulo consulta las tablas de otro.

```mermaid
flowchart TB
    WEB["Aplicacion web<br/>[Contenedor]"]

    subgraph SRV["Servidor Orderix"]
        PAG["Paginas y acciones<br/>[Componente: Next.js, src/app]<br/>Validan sesion, rol y CSRF antes de llamar a los servicios"]
        SOK["Conexiones en tiempo real<br/>[Componente: Socket.IO]<br/>Handshake con sesion, salas por rol, limite de frecuencia"]

        AUTH["autenticacion<br/>[Componente]<br/>Cuentas, Argon2id, sesiones, roles, recuperacion de clave"]
        MENU["menu<br/>[Componente]<br/>Productos y disponibilidad"]
        PED["pedidos<br/>[Componente]<br/>Flujo de estados, alergias, historial, cola de cocina y caja"]
        RT["tiempo-real<br/>[Componente]<br/>Chat, conectados, escribiendo y publicacion de eventos"]
        CAL["calificaciones<br/>[Componente]<br/>Una calificacion por pedido cobrado"]
        REP["reportes<br/>[Componente]<br/>Desempeno por mesero, sin tablas propias"]
        COR["correo<br/>[Componente: src/lib/correo.ts]<br/>Cliente de la API de Brevo, nunca lanza"]
    end

    DB[("Base de datos<br/>[Contenedor: PostgreSQL]")]
    BRE["Brevo<br/>[Sistema externo]"]

    WEB -->|"HTTPS"| PAG
    WEB -->|"WSS"| SOK
    PAG --> AUTH
    PAG --> MENU
    PAG --> PED
    PAG --> CAL
    PAG --> REP
    SOK -->|"autentica la conexion"| AUTH
    SOK -->|"mensajes del chat"| RT

    PED -->|"productos para el pedido"| MENU
    PED -->|"publica pedido creado, listo, alergia"| RT
    CAL -->|"estado del pedido"| PED
    REP -->|"resumen de servicio"| PED
    REP -->|"calificaciones de los pedidos"| CAL
    AUTH -->|"enlace de recuperacion"| COR
    COR -->|"API HTTPS"| BRE

    AUTH -->|"usuarios, sesiones, tokens"| DB
    MENU -->|"productos"| DB
    PED -->|"pedidos, items, cambios de estado"| DB
    RT -->|"salas, mensajes"| DB
    CAL -->|"calificaciones"| DB

    classDef contenedor fill:#438dd5,stroke:#2e6295,color:#ffffff
    classDef componente fill:#85bbf0,stroke:#5d82a8,color:#000000
    classDef externo fill:#999999,stroke:#6b6b6b,color:#ffffff
    class WEB,DB contenedor
    class PAG,SOK,AUTH,MENU,PED,RT,CAL,REP,COR componente
    class BRE externo
```

`reportes` no tiene tablas: compone `resumenDeServicio` de `pedidos` y
`calificacionesDePedidos` de `calificaciones`. Todos los módulos (salvo
`autenticacion`) reciben el usuario de la sesión desde `autenticacion` para
volver a comprobar el permiso. En el segundo bimestre, cada componente con
tablas propias puede pasar a ser un contenedor (microservicio) con su base.

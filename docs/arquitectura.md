# Arquitectura de Orderix

```mermaid
flowchart LR
    U[Usuarios: mesero, cocina, cajero, administrador] --> UI[Cliente web Next.js]
    UI --> API[API protegida]
    UI <--> WS[WebSocket autenticado]
    API --> AUTH[Autenticación y autorización]
    API --> DB[(Base de datos relacional)]
    WS --> API
    API --> AUDIT[Historial de cambios]
    AUDIT --> DB
```

El cliente web consume la API para las operaciones de autenticación, usuarios,
pedidos y menú. La API valida permisos por rol y persiste los datos en una base
relacional. El canal WebSocket exige autenticación en el handshake y distribuye
avisos de pedidos y chat a los usuarios autorizados.

# Modelo entidad-relación de Orderix

```mermaid
erDiagram
    USUARIO ||--o{ SESION : tiene
    USUARIO ||--o{ TOKEN_RECUPERACION : solicita
    PEDIDO ||--o{ ITEM_PEDIDO : contiene
    PEDIDO ||--o{ CAMBIO_ESTADO : tiene
    SALA ||--o{ MENSAJE : contiene

    USUARIO {
        Int id PK
        string nombre
        string correo UK
        string hashClave
        string rol
        boolean activo
        datetime creadoEn
    }
    SESION {
        string id PK
        Int usuarioId FK
        datetime expiraEn
        datetime creadaEn
    }
    TOKEN_RECUPERACION {
        Int id PK
        Int usuarioId FK
        string hashToken
        datetime caducaEn
        boolean usado
        datetime creadoEn
    }
    PRODUCTO {
        Int id PK
        string nombre
        string descripcion nullable
        string categoria
        decimal precio
        boolean disponible
        datetime creadoEn
        datetime actualizadoEn
    }
    PEDIDO {
        Int id PK
        Int numeroMesa
        Int meseroId
        string meseroNombre
        string estado
        decimal total
        string notas nullable
        datetime creadoEn
        datetime cerradoEn nullable
    }
    ITEM_PEDIDO {
        Int id PK
        Int pedidoId FK
        Int productoId
        string nombreProducto
        integer cantidad
        decimal precioUnitario
        string alergias nullable
        string notas nullable
        datetime agregadoEn
    }
    CAMBIO_ESTADO {
        Int id PK
        Int pedidoId FK
        string estado
        Int usuarioId
        datetime fecha
    }
    CALIFICACION {
        Int id PK
        Int pedidoId UK
        integer puntaje
        Int cajeroId
        datetime fecha
    }
    SALA {
        Int id PK
        string nombre
        datetime creadaEn
    }
    MENSAJE {
        Int id PK
        Int salaId FK
        Int autorId
        string autorNombre
        string texto
        datetime enviadoEn
    }
```

Las líneas entre entidades muestran únicamente relaciones con clave foránea
dentro del mismo módulo: `sesiones` y `tokens_recuperacion` pertenecen a
autenticación, `items_pedido` y `cambios_estado` a pedidos, y `mensajes` a
tiempo-real. Las referencias entre módulos no tienen FK: `meseroId`,
`productoId`, `usuarioId` en `CambioEstado`, `pedidoId` y `cajeroId` en
`Calificacion`, y `autorId` se validan mediante los servicios correspondientes.
Sus copias de lectura son `meseroNombre`, `nombreProducto`, `precioUnitario` y
`autorNombre`.

La relación entre `PEDIDO` y `CALIFICACION` es opcional y uno a uno:
`pedidoId` es único y un pedido tiene como máximo una calificación. Un pedido
puede tener muchos ítems y muchos cambios de estado.

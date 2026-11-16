# Modelo entidad-relación de Orderix

```mermaid
erDiagram
    USUARIO ||--o{ SESION : tiene
    USUARIO ||--o{ TOKEN_RECUPERACION : solicita
    USUARIO ||--o{ PEDIDO : registra
    USUARIO ||--o{ CAMBIO_ESTADO : realiza
    USUARIO ||--o{ CALIFICACION : registra
    USUARIO ||--o{ MENSAJE : envia
    PEDIDO ||--o{ ITEM_PEDIDO : contiene
    PRODUCTO ||--o{ ITEM_PEDIDO : compone
    PEDIDO ||--o{ CAMBIO_ESTADO : tiene
    PEDIDO ||--o| CALIFICACION : recibe
    SALA ||--o{ MENSAJE : contiene

    USUARIO {
        uuid id PK
        string nombre
        string correo UK
        string hashClave
        string rol
        boolean activo
        datetime creado
    }
    SESION {
        uuid id PK
        uuid usuario FK
        datetime expira
    }
    TOKEN_RECUPERACION {
        uuid usuario PK
        string hashToken
        datetime caduca
        boolean usado
    }
    PRODUCTO {
        uuid id PK
        string nombre
        string descripcion
        string categoria
        decimal precio
        boolean disponible
    }
    PEDIDO {
        uuid id PK
        string numeroMesa
        uuid mesero FK
        string estado
        decimal total
        string notas
        datetime creado
        datetime cerrado
    }
    ITEM_PEDIDO {
        uuid id PK
        uuid pedido FK
        uuid producto FK
        integer cantidad
        decimal precioUnitario
        string alergias
        string notas
        datetime agregado
    }
    CAMBIO_ESTADO {
        uuid id PK
        uuid pedido FK
        string estado
        uuid usuario FK
        datetime fecha
    }
    CALIFICACION {
        uuid id PK
        uuid pedido UK
        integer puntaje
        uuid cajero FK
        datetime fecha
    }
    SALA {
        uuid id PK
        string nombre
    }
    MENSAJE {
        uuid id PK
        uuid sala FK
        uuid autor FK
        string texto
        datetime enviado
    }
```

La relación entre `PEDIDO` y `CALIFICACION` es opcional y uno a uno:
un pedido tiene como máximo una calificación. Un pedido puede tener muchos
ítems y muchos cambios de estado.

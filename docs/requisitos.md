# Historias de usuario de Orderix

## Historias comunes

### Registro

**Como usuario, quiero registrarme para poder acceder a Orderix con una cuenta propia.**

- El sistema solicita nombre, correo, clave y rol permitido.
- El correo no puede estar registrado previamente.
- La clave se almacena de forma segura y nunca en texto plano.

### Inicio de sesión

**Como usuario, quiero iniciar sesión para acceder a las funciones correspondientes a mi rol.**

- El sistema valida el correo y la clave antes de crear la sesión.
- Una sesión válida permite acceder solo a las funciones autorizadas para el rol del usuario.
- Las credenciales incorrectas muestran un mensaje de error sin revelar cuál dato falló.

### Recuperación de clave

**Como usuario, quiero recuperar mi clave mediante un token para volver a acceder a mi cuenta.**

- El sistema genera un token de recuperación con tiempo de caducidad.
- El token solo puede utilizarse una vez y deja de ser válido al caducar.
- La nueva clave debe cumplir las reglas de seguridad definidas.

### Cierre de sesión

**Como usuario, quiero cerrar sesión para impedir que otras personas usen mi cuenta en el dispositivo.**

- El sistema invalida la sesión actual.
- Después de cerrar sesión, las pantallas protegidas requieren iniciar sesión nuevamente.

### Chat general

**Como usuario, quiero participar en un chat general para coordinarme con el personal del restaurante.**

- Puedo enviar mensajes y ver el historial ordenado por fecha y hora.
- Puedo ver la lista de usuarios conectados.
- Los mensajes muestran el nombre del autor y la hora de envío.

## Mesero

### Crear pedido

**Como mesero, quiero crear pedidos para mis mesas para registrar lo que solicitan los clientes.**

- Puedo seleccionar una mesa y agregar uno o más productos disponibles.
- El pedido se crea inicialmente con estado `CREADO`.
- Al crear el pedido, cocina recibe un aviso en tiempo real.

### Agregar información al pedido

**Como mesero, quiero agregar ítems, alergias y notas para comunicar correctamente las necesidades de cada mesa.**

- Cada ítem registra cantidad, alergias y notas opcionales.
- Las alergias se muestran de forma resaltada para cocina.
- Si agrego o modifico una alergia después de enviar el pedido, cocina recibe un aviso en tiempo real.

### Consultar pedidos propios

**Como mesero, quiero consultar mis pedidos para conocer su estado y atender mis mesas.**

- Solo puedo ver los pedidos que yo registré.
- Puedo ver el estado actual y el historial de cambios del pedido.
- Cada cambio muestra quién lo realizó y la fecha y hora.

### Marcar pedido como entregado

**Como mesero, quiero marcar un pedido como entregado para indicar que ya fue llevado a la mesa.**

- Solo puedo marcar como `ENTREGADO` un pedido que esté en estado `LISTO`.
- El cambio registra mi usuario y la fecha y hora.
- El pedido queda disponible para que caja lo cobre y cierre.

### Recibir aviso de pedido listo

**Como mesero, quiero recibir un aviso cuando mi pedido esté listo para entregarlo oportunamente.**

- El aviso se envía cuando cocina cambia el pedido a `LISTO`.
- El aviso identifica el pedido y la mesa correspondiente.

## Cocina

### Ver cola de pedidos

**Como cocina, quiero ver la cola de pedidos para preparar los pedidos pendientes en orden.**

- La cola muestra los pedidos en estado `CREADO` o `EN_PREPARACION`.
- Cada pedido muestra sus ítems, cantidades, notas y alergias resaltadas.
- Los pedidos nuevos aparecen mediante un aviso en tiempo real.

### Pasar pedido a preparación

**Como cocina, quiero pasar un pedido a “en preparación” para indicar que ya estoy trabajando en él.**

- Solo puedo cambiar un pedido de `CREADO` a `EN_PREPARACION`.
- El cambio registra mi usuario y la fecha y hora.

### Marcar pedido como listo

**Como cocina, quiero marcar un pedido como “listo” para avisar al mesero que puede entregarlo.**

- Solo puedo cambiar un pedido de `EN_PREPARACION` a `LISTO`.
- El cambio registra mi usuario y la fecha y hora.
- El mesero responsable recibe un aviso en tiempo real.

## Cajero

### Cobrar pedido

**Como cajero, quiero cobrar un pedido para registrar que el cliente ha pagado.**

- Solo puedo cobrar un pedido que esté en estado `ENTREGADO`.
- El sistema muestra el total del pedido antes de confirmar el cobro.
- El cambio a `COBRADO` registra mi usuario y la fecha y hora.

### Cerrar pedido

**Como cajero, quiero cerrar los pedidos cobrados para finalizar su ciclo de atención.**

- Un pedido cobrado queda en estado `COBRADO` y registra su fecha de cierre.
- Un pedido cerrado no puede volver a modificarse ni avanzar a otro estado.

### Cancelar pedido

**Como cajero, quiero cancelar un pedido para cerrar correctamente los pedidos que no se atenderán.**

- Puedo cancelar un pedido que todavía no esté cobrado.
- El cambio a `CANCELADO` registra mi usuario y la fecha y hora.
- Un pedido cancelado no puede avanzar a otro estado.

## Administrador

### Gestionar usuarios

**Como administrador, quiero gestionar usuarios para mantener actualizado el personal y sus permisos.**

- Puedo crear usuarios y asignarles un rol permitido.
- Puedo editar los datos y el rol de un usuario.
- Puedo desactivar usuarios sin borrar su historial de operaciones.

### Gestionar menú

**Como administrador, quiero gestionar el menú para mantener actualizados los productos que puede solicitar el restaurante.**

- Puedo crear, editar y desactivar productos.
- Cada producto tiene nombre, descripción, categoría y precio.
- Los productos no disponibles no pueden agregarse a nuevos pedidos.

## Flujo y reglas del pedido

El flujo normal de un pedido es:

```text
CREADO → EN_PREPARACION → LISTO → ENTREGADO → COBRADO
```

Un pedido también puede pasar a `CANCELADO` cuando corresponda. Cada cambio de estado registra el usuario responsable y la fecha y hora. Las transiciones inválidas deben rechazarse.

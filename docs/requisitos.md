# Historias de usuario de Orderix

## Historias comunes

### Registro

**Como usuario, quiero registrarme para poder acceder a Orderix con una cuenta propia.**

- El sistema solicita nombre, correo y clave; toda cuenta nueva se crea con rol `MESERO`.
- Solo un administrador puede asignar o cambiar roles después del registro.
- El correo no puede estar registrado previamente.
- La clave se almacena de forma segura y nunca en texto plano.

### Inicio de sesión

**Como usuario, quiero iniciar sesión para acceder a las funciones correspondientes a mi rol.**

- El sistema valida el correo y la clave antes de crear la sesión.
- Una sesión válida permite acceder solo a las funciones autorizadas para el rol del usuario.
- La sesión usa una cookie `httpOnly`, `Secure` y `SameSite`, y se renueva al iniciar sesión.
- Las credenciales incorrectas muestran un mensaje de error sin revelar cuál dato falló.

### Acceder a la pantalla principal

**Como usuario autenticado, quiero acceder a una pantalla principal para utilizar las funciones disponibles para mi rol.**

- La pantalla principal y sus rutas requieren una sesión válida.
- La navegación muestra solo las opciones autorizadas para mi rol.
- Desde la pantalla principal puedo acceder al CRUD correspondiente y al chat general.

### Recuperación de clave

**Como usuario, quiero recuperar mi clave mediante un token para volver a acceder a mi cuenta.**

- El sistema genera un token de recuperación con tiempo de caducidad.
- El token caduca después de 30 minutos y en la base de datos se almacena únicamente su hash.
- El token solo puede utilizarse una vez y deja de ser válido al caducar.
- La respuesta no revela si el correo solicitado está registrado.
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
- Puedo modificar los ítems, alergias y notas de mi pedido mientras su estado lo permita.
- Las alergias se muestran de forma resaltada para cocina.
- Si agrego o modifico una alergia después de enviar el pedido, cocina recibe un aviso en tiempo real.

### Consultar pedidos propios

**Como mesero, quiero consultar mis pedidos para conocer su estado y atender mis mesas.**

- Solo puedo ver los pedidos que yo registré.
- Puedo buscar y filtrar mis pedidos por id, mesa y estado.
- Puedo consultar el detalle de un pedido mediante su id.
- El listado de pedidos se muestra paginado.
- Puedo eliminar un pedido mediante cancelación lógica, con una confirmación explícita y respetando su historial.
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

### Recibir eventos de pedido

**Como personal autorizado, quiero recibir eventos de los pedidos para conocer sus cambios sin recargar la página.**

- El sistema publica eventos cuando se crea un pedido, cambia su estado o se agrega una alergia.
- Solo los usuarios autenticados y autorizados reciben los eventos correspondientes.

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

### Cobrar y cerrar pedido

**Como cajero, quiero cobrar un pedido para registrar el pago y cerrar su ciclo de atención.**

- Solo puedo cobrar un pedido que esté en estado `ENTREGADO`.
- El sistema muestra el total del pedido antes de confirmar el cobro.
- El cambio a `COBRADO` registra mi usuario, la fecha y hora y la fecha de cierre.
- Un pedido cerrado no puede volver a modificarse ni avanzar a otro estado.

### Cancelar pedido

**Como personal autorizado, quiero cancelar un pedido que no se atenderá para mantener correcto su ciclo de atención.**

- El mesero responsable puede cancelar su pedido únicamente mientras esté en estado `CREADO`, antes de que cocina empiece a prepararlo.
- El cajero puede cancelar un pedido que todavía no esté cobrado.
- El sistema solicita confirmación antes de cancelar y registra el motivo cuando se proporciona.
- El cambio a `CANCELADO` registra mi usuario y la fecha y hora.
- Un pedido cancelado no puede avanzar a otro estado.

### Registrar calificación del servicio (opcional)

**Como cajero, quiero abrir la pantalla de calificación después del cobro para que el cliente valore el servicio.**

- Solo puedo abrir la pantalla para un pedido en estado `COBRADO`.
- El cliente puede elegir un puntaje de 1 a 5 y ver el texto asociado a cada opción.
- Cada pedido admite como máximo una calificación.

## Administrador

### Gestionar usuarios

**Como administrador, quiero gestionar usuarios para mantener actualizado el personal y sus permisos.**

- Puedo crear usuarios y asignarles un rol permitido.
- Puedo editar los datos y el rol de un usuario.
- Puedo desactivar usuarios sin borrar su historial de operaciones.

### Gestionar menú

**Como administrador, quiero gestionar el menú para mantener actualizados los productos que puede solicitar el restaurante.**

- Puedo crear, editar y desactivar productos.
- Puedo buscar productos por nombre y filtrar por categoría y disponibilidad.
- El listado de productos se muestra paginado.
- Puedo consultar el detalle de un producto mediante su id.
- Puedo eliminar un producto con una confirmación explícita, respetando el historial de pedidos.
- Cada producto tiene nombre, descripción, categoría y precio.
- Los productos no disponibles no pueden agregarse a nuevos pedidos.

## Requisitos no funcionales

- **Validación:** los datos se validan en cliente para dar retroalimentación inmediata y en servidor antes de persistirse; la validación del servidor es obligatoria.
- **Autorización:** las rutas y operaciones protegidas requieren una sesión válida y verifican los permisos del rol en el servidor.
- **Seguridad web:** las entradas se parametrizan para prevenir SQLi, se escapan o sanitizan para prevenir XSS y se implementa protección CSRF en las operaciones que modifican datos.
- **WebSocket:** la autenticación y autorización se verifican durante el handshake; no se aceptan conexiones anónimas para eventos privados. Los mensajes se validan y sanitizan, tienen límites de tamaño y frecuencia, y la conexión usa `wss` en producción.
- **Rendimiento:** se crean índices para los campos usados en búsquedas, filtros y relaciones; se mide el rendimiento con Lighthouse y se corrigen los incumplimientos relevantes.
- **Accesibilidad:** la interfaz debe cumplir WCAG 2.2 AA en navegación por teclado, foco visible, etiquetas de formularios, contraste y mensajes de error.

## Flujo y reglas del pedido

El flujo normal de un pedido es:

```text
CREADO → EN_PREPARACION → LISTO → ENTREGADO → COBRADO
```

Un pedido también puede pasar a `CANCELADO` cuando corresponda. Cada cambio de estado registra el usuario responsable y la fecha y hora. Las transiciones inválidas deben rechazarse.

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('MESERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('CREADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'COBRADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "hashClave" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" VARCHAR(64) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_recuperacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" VARCHAR(64) NOT NULL,
    "caducaEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(500),
    "categoria" VARCHAR(60) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "numeroMesa" INTEGER NOT NULL,
    "meseroId" INTEGER NOT NULL,
    "meseroNombre" VARCHAR(100) NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'CREADO',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notas" VARCHAR(500),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoEn" TIMESTAMP(3),

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_pedido" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "nombreProducto" VARCHAR(120) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "alergias" VARCHAR(300),
    "notas" VARCHAR(300),
    "agregadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cambios_estado" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cambios_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificaciones" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "puntaje" SMALLINT NOT NULL,
    "cajeroId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" SERIAL NOT NULL,
    "salaId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "autorNombre" VARCHAR(100) NOT NULL,
    "texto" VARCHAR(1000) NOT NULL,
    "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_idx" ON "sesiones"("usuarioId");

-- CreateIndex
CREATE INDEX "sesiones_expiraEn_idx" ON "sesiones"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_recuperacion_hashToken_key" ON "tokens_recuperacion"("hashToken");

-- CreateIndex
CREATE INDEX "tokens_recuperacion_usuarioId_idx" ON "tokens_recuperacion"("usuarioId");

-- CreateIndex
CREATE INDEX "productos_nombre_idx" ON "productos"("nombre");

-- CreateIndex
CREATE INDEX "productos_categoria_idx" ON "productos"("categoria");

-- CreateIndex
CREATE INDEX "pedidos_estado_creadoEn_idx" ON "pedidos"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "pedidos_meseroId_idx" ON "pedidos"("meseroId");

-- CreateIndex
CREATE INDEX "items_pedido_pedidoId_idx" ON "items_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "cambios_estado_pedidoId_fecha_idx" ON "cambios_estado"("pedidoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "calificaciones_pedidoId_key" ON "calificaciones"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "salas_nombre_key" ON "salas"("nombre");

-- CreateIndex
CREATE INDEX "mensajes_salaId_enviadoEn_idx" ON "mensajes"("salaId", "enviadoEn");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_recuperacion" ADD CONSTRAINT "tokens_recuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cambios_estado" ADD CONSTRAINT "cambios_estado_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Restricciones CHECK (agregadas a mano: Prisma no las genera).
-- La validación principal está en los esquemas Zod; esto es la última barrera.
-- ---------------------------------------------------------------------------
ALTER TABLE "productos" ADD CONSTRAINT "productos_precio_no_negativo" CHECK ("precio" >= 0);
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mesa_positiva" CHECK ("numeroMesa" > 0);
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_total_no_negativo" CHECK ("total" >= 0);
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_precio_no_negativo" CHECK ("precioUnitario" >= 0);
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_puntaje_1_a_5" CHECK ("puntaje" BETWEEN 1 AND 5);

-- DropIndex
DROP INDEX "pedidos_meseroId_idx";

-- CreateIndex
CREATE INDEX "pedidos_meseroId_creadoEn_idx" ON "pedidos"("meseroId", "creadoEn");

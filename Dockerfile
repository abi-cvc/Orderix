# syntax=docker/dockerfile:1

# ---------- Dependencias ----------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Instala todo (incluye devDependencies para compilar). El postinstall genera el cliente de Prisma.
# Secreto opcional "ca_extra": certificado raíz extra para redes o antivirus que
# inspeccionan HTTPS (por ejemplo Avast). No queda guardado en la imagen. Sin él, se ignora.
RUN --mount=type=secret,id=ca_extra,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/ca_extra npm ci

# ---------- Compilación ----------
FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build
# Deja solo las dependencias de producción para la imagen final.
RUN npm prune --omit=dev

# ---------- Imagen final ----------
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOST=0.0.0.0 \
    PORT=3000

# Usuario sin privilegios (la imagen oficial ya trae "node").
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/server.ts /app/next.config.ts /app/tsconfig.json /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/salud').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Aplica las migraciones pendientes y arranca el servidor (Next.js + Socket.IO).
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx server.ts"]

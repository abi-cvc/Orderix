import { z } from "zod";

/** Roles del sistema. Se reemplaza por el enum de Prisma en el paso 3. */
export const ROLES = ["MESERO", "COCINA", "CAJERO", "ADMINISTRADOR"] as const;

const esquemaEnv = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
    TRUST_PROXY: z.stringbool().default(false),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),
    DEV_FAKE_USER_ROLE: z
      .union([z.enum(ROLES), z.literal("")])
      .optional()
      .transform((valor) => valor || undefined),
  })
  .refine((env) => !(env.NODE_ENV === "production" && env.DEV_FAKE_USER_ROLE), {
    message: "DEV_FAKE_USER_ROLE no puede estar activo en producción",
    path: ["DEV_FAKE_USER_ROLE"],
  });

export type Env = z.infer<typeof esquemaEnv>;

let cache: Env | undefined;

/**
 * Variables de entorno validadas. Se evalúa en el primer uso (no al importar)
 * para que `next build` no exija la base de datos.
 * Los mensajes de error nombran la variable, nunca muestran su valor.
 */
export function env(): Env {
  if (cache) return cache;
  const resultado = esquemaEnv.safeParse(process.env);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  cache = resultado.data;
  return cache;
}

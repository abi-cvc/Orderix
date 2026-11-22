/**
 * Zod configurado para toda la app. Importa `z` desde aquí, no desde "zod":
 * la configuración tiene que aplicarse ANTES de crear cualquier esquema, porque
 * Zod decide al construir cada objeto si usa su modo acelerado.
 *
 * - Mensajes genéricos en español (los propios de cada esquema ya lo están).
 * - jitless: el modo acelerado usa `new Function`, que nuestra CSP bloquea
 *   (bien hecho); sin esto el navegador reporta una violación de CSP en cada
 *   página con formularios.
 */
import { z } from "zod";

z.config(z.locales.es());
z.config({ jitless: true });

export { z };

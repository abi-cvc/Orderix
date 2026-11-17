import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoAutenticado, ErrorValidacion } from "@/lib/errores";
import { generarToken, hashearClave, hashearToken, verificarClave } from "@/lib/hash";
import {
  registrarUsuario,
  restablecerClave,
  solicitarRecuperacion,
  verificarCredenciales,
  type DependenciasAutenticacion,
} from "./servicio";
import { esquemaLogin, esquemaRegistro, esquemaRestablecerClave } from "./validadores";

const token = "a".repeat(43);
const usuario = { id: 7, nombre: "Mesero de prueba", rol: Rol.MESERO };

test("las utilidades existentes generan tokens válidos y hashes de clave con sal", async () => {
  const generado = generarToken();
  assert.equal(
    esquemaRestablecerClave.safeParse({ token: generado, clave: "clave correcta" }).success,
    true,
  );
  assert.notEqual(generado, generarToken());
  const primero = await hashearClave("clave correcta");
  const segundo = await hashearClave("clave correcta");
  assert.notEqual(primero, segundo);
  assert.equal(await verificarClave(primero, "clave correcta"), true);
  assert.equal(await verificarClave(primero, "otra clave"), false);
});

function preparar() {
  const guardado: {
    registro?: Parameters<DependenciasAutenticacion["repositorio"]["crearUsuario"]>[0];
    recuperacion?: Parameters<
      DependenciasAutenticacion["repositorio"]["crearTokenRecuperacion"]
    >[0];
    cambio?: Parameters<DependenciasAutenticacion["repositorio"]["consumirTokenYCambiarClave"]>[0];
    enlace?: string;
    sesionesCerradas?: number;
  } = {};
  const deps: DependenciasAutenticacion = {
    repositorio: {
      crearUsuario: async (datos) => {
        guardado.registro = datos;
        return usuario;
      },
      buscarUsuarioPorCorreo: async () => ({
        ...usuario,
        hashClave: "hash anterior",
        activo: true,
      }),
      crearTokenRecuperacion: async (datos) => {
        guardado.recuperacion = datos;
      },
      consumirTokenYCambiarClave: async (datos) => {
        guardado.cambio = datos;
        return usuario.id;
      },
    },
    hashearClave: async (clave) => `hash:${clave}`,
    verificarClave: async (_hash, clave) => clave === "clave correcta",
    generarToken: () => token,
    hashearToken,
    cerrarTodasLasSesiones: async (id) => {
      guardado.sesionesCerradas = id;
    },
    ahora: () => new Date("2026-11-16T12:00:00Z"),
    obtenerUrlApp: () => "https://orderix.example",
    imprimirEnlace: (enlace) => {
      guardado.enlace = enlace;
    },
  };
  return { deps, guardado };
}

test("registro valida nombre, correo y mínimo de 10 caracteres sin recortar la clave", () => {
  const datos = { nombre: "  Ana  ", correo: " ANA@EXAMPLE.COM ", clave: " 12345678 " };
  const resultado = esquemaRegistro.parse(datos);
  assert.equal(resultado.nombre, "Ana");
  assert.equal(resultado.correo, "ana@example.com");
  assert.equal(resultado.clave, datos.clave);
  for (const invalido of [{ nombre: " " }, { correo: "incorrecto" }, { clave: "123456789" }]) {
    assert.equal(esquemaRegistro.safeParse({ ...datos, ...invalido }).success, false);
  }
  assert.equal(esquemaLogin.safeParse({ correo: datos.correo, clave: "corta" }).success, true);
  assert.equal(esquemaRestablecerClave.safeParse({ token, clave: "corta" }).success, false);
});

test("registro ignora un rol enviado por el cliente y persiste solo el hash", async () => {
  const { deps, guardado } = preparar();
  const resultado = await registrarUsuario(
    {
      nombre: "Ana",
      correo: " ANA@EXAMPLE.COM ",
      clave: "clave correcta",
      rol: Rol.ADMINISTRADOR,
    },
    deps,
  );
  assert.deepEqual(guardado.registro, {
    nombre: "Ana",
    correo: "ana@example.com",
    hashClave: "hash:clave correcta",
    rol: Rol.MESERO,
  });
  assert.deepEqual(resultado, usuario);
});

test("el servicio revalida antes de consultar o guardar datos", async () => {
  const { deps, guardado } = preparar();
  await assert.rejects(
    registrarUsuario({ nombre: "Ana", correo: "a@example.com", clave: "corta" }, deps),
    ErrorValidacion,
  );
  assert.equal(guardado.registro, undefined);
});

test("login devuelve únicamente los datos de sesión", async () => {
  const { deps } = preparar();
  assert.deepEqual(
    await verificarCredenciales({ correo: "a@example.com", clave: "clave correcta" }, deps),
    usuario,
  );
});

test("correo desconocido, clave incorrecta e inactividad tienen el mismo error", async () => {
  for (const caso of ["correo", "clave", "inactivo"]) {
    const { deps } = preparar();
    deps.repositorio.buscarUsuarioPorCorreo = async () =>
      caso === "correo"
        ? null
        : { ...usuario, hashClave: "hash anterior", activo: caso !== "inactivo" };
    await assert.rejects(
      verificarCredenciales(
        { correo: "a@example.com", clave: caso === "clave" ? "incorrecta" : "clave correcta" },
        deps,
      ),
      (error: unknown) =>
        error instanceof ErrorNoAutenticado && error.message === "Correo o clave incorrectos.",
    );
  }
});

test("recuperación guarda solo SHA-256, vence en 30 minutos e imprime el enlace", async () => {
  const { deps, guardado } = preparar();
  await solicitarRecuperacion({ correo: "a@example.com" }, deps);
  assert.deepEqual(guardado.recuperacion, {
    usuarioId: usuario.id,
    hashToken: hashearToken(token),
    caducaEn: new Date("2026-11-16T12:30:00Z"),
  });
  assert.equal(new URL(guardado.enlace!).searchParams.get("token"), token);
});

test("recuperación responde igual para correo existente, desconocido e inactivo", async () => {
  const { deps } = preparar();
  const respuesta = await solicitarRecuperacion({ correo: "a@example.com" }, deps);
  for (const activo of [false, null]) {
    const otro = preparar();
    otro.deps.repositorio.buscarUsuarioPorCorreo = async () =>
      activo === null ? null : { ...usuario, hashClave: "hash anterior", activo };
    assert.deepEqual(
      await solicitarRecuperacion({ correo: "a@example.com" }, otro.deps),
      respuesta,
    );
    assert.equal(otro.guardado.recuperacion, undefined);
    assert.equal(otro.guardado.enlace, undefined);
  }
});

test("restablecer pasa los hashes al repositorio y cierra todas las sesiones", async () => {
  const { deps, guardado } = preparar();
  await restablecerClave({ token, clave: "clave nueva segura" }, deps);
  assert.deepEqual(guardado.cambio, {
    hashToken: hashearToken(token),
    hashClave: "hash:clave nueva segura",
    ahora: deps.ahora(),
  });
  assert.equal(guardado.sesionesCerradas, usuario.id);
});

test("token inválido, vencido o usado rechaza el cambio sin llamar al cierre de sesiones", async () => {
  const { deps, guardado } = preparar();
  deps.repositorio.consumirTokenYCambiarClave = async () => null;
  await assert.rejects(
    restablecerClave({ token, clave: "clave nueva segura" }, deps),
    ErrorValidacion,
  );
  assert.equal(guardado.sesionesCerradas, undefined);
  await assert.rejects(
    restablecerClave({ token: "", clave: "clave nueva segura" }, deps),
    ErrorValidacion,
  );
});

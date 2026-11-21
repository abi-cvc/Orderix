import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import { ErrorNoAutenticado, ErrorValidacion } from "@/lib/errores";
import { generarToken, hashearClave, hashearToken, verificarClave } from "@/lib/hash";
import { crearLimitadorIntentos, ErrorLimiteIntentos } from "@/lib/seguridad/limite";
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
    destino?: { correo: string; nombre: string };
    sesionesCerradas?: number;
    usuarioDesconectado?: number;
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
    desconectarUsuario: (id) => {
      assert.equal(guardado.sesionesCerradas, id);
      guardado.usuarioDesconectado = id;
    },
    ahora: () => new Date("2026-11-16T12:00:00Z"),
    obtenerIpCliente: async () => "192.0.2.1",
    limitadorIntentos: crearLimitadorIntentos(),
    obtenerUrlApp: () => "https://orderix.example",
    entregarEnlace: async (destino, enlace) => {
      guardado.enlace = enlace;
      guardado.destino = destino;
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

test("recuperación guarda solo SHA-256, vence en 30 minutos y entrega el enlace a su dueño", async () => {
  const { deps, guardado } = preparar();
  await solicitarRecuperacion({ correo: "a@example.com" }, deps);
  assert.deepEqual(guardado.recuperacion, {
    usuarioId: usuario.id,
    hashToken: hashearToken(token),
    caducaEn: new Date("2026-11-16T12:30:00Z"),
  });
  assert.equal(new URL(guardado.enlace!).searchParams.get("token"), token);
  assert.deepEqual(guardado.destino, { correo: "a@example.com", nombre: usuario.nombre });
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

test("restablecer guarda los hashes, cierra las sesiones y después desconecta al usuario", async () => {
  const { deps, guardado } = preparar();
  await restablecerClave({ token, clave: "clave nueva segura" }, deps);
  assert.deepEqual(guardado.cambio, {
    hashToken: hashearToken(token),
    hashClave: "hash:clave nueva segura",
    ahora: deps.ahora(),
  });
  assert.equal(guardado.sesionesCerradas, usuario.id);
  assert.equal(guardado.usuarioDesconectado, usuario.id);
});

test("token inválido, vencido o usado rechaza el cambio sin llamar al cierre de sesiones", async () => {
  const { deps, guardado } = preparar();
  deps.repositorio.consumirTokenYCambiarClave = async () => null;
  await assert.rejects(
    restablecerClave({ token, clave: "clave nueva segura" }, deps),
    ErrorValidacion,
  );
  assert.equal(guardado.sesionesCerradas, undefined);
  assert.equal(guardado.usuarioDesconectado, undefined);
  await assert.rejects(
    restablecerClave({ token: "", clave: "clave nueva segura" }, deps),
    ErrorValidacion,
  );
});

test("cinco usuarios distintos entran bien desde la misma IP y el sexto también entra", async () => {
  const { deps } = preparar();
  let consultas = 0;
  deps.repositorio.buscarUsuarioPorCorreo = async (correo) => {
    consultas += 1;
    return {
      ...usuario,
      id: Number(correo.match(/usuario(\d+)/)?.[1]) + 1,
      hashClave: "hash anterior",
      activo: true,
    };
  };
  for (let i = 0; i < 6; i++) {
    const resultado = await verificarCredenciales(
      { correo: `usuario${i}@example.com`, clave: "clave correcta" },
      deps,
    );
    assert.equal(resultado.id, i + 1);
  }
  assert.equal(consultas, 6);
});

test("un login correcto reinicia los fallos del correo", async () => {
  const { deps } = preparar();
  const entrada = { correo: " ANA@EXAMPLE.COM ", clave: "incorrecta" };
  for (let i = 0; i < 4; i++)
    await assert.rejects(verificarCredenciales(entrada, deps), ErrorNoAutenticado);
  await verificarCredenciales({ ...entrada, clave: "clave correcta" }, deps);
  for (let i = 0; i < 4; i++)
    await assert.rejects(verificarCredenciales(entrada, deps), ErrorNoAutenticado);
  await verificarCredenciales({ ...entrada, clave: "clave correcta" }, deps);
});

test("cinco logins fallidos bloquean el correo antes de consultar la base o verificar la clave", async () => {
  for (const caso of ["clave", "correo", "inactivo"]) {
    const { deps } = preparar();
    let consultas = 0;
    let verificaciones = 0;
    deps.repositorio.buscarUsuarioPorCorreo = async () => {
      consultas += 1;
      return caso === "correo"
        ? null
        : { ...usuario, hashClave: "hash anterior", activo: caso !== "inactivo" };
    };
    deps.verificarClave = async () => {
      verificaciones += 1;
      return caso !== "clave";
    };
    for (let i = 0; i < 5; i++) {
      await assert.rejects(
        verificarCredenciales({ correo: "ana@example.com", clave: "cualquiera" }, deps),
        ErrorNoAutenticado,
      );
    }
    deps.obtenerIpCliente = async () => "192.0.2.99";
    await assert.rejects(
      verificarCredenciales({ correo: "ana@example.com", clave: "clave correcta" }, deps),
      ErrorLimiteIntentos,
    );
    assert.equal(consultas, 5);
    assert.equal(verificaciones, 5);
  }
});

test("login limita 30 fallos por IP entre distintos correos sin borrar el acumulado con un éxito", async () => {
  const { deps } = preparar();
  for (let i = 0; i < 30; i++) {
    await assert.rejects(
      verificarCredenciales({ correo: `usuario${i}@example.com`, clave: "incorrecta" }, deps),
      ErrorNoAutenticado,
    );
    if (i === 15)
      await verificarCredenciales({ correo: "valido@example.com", clave: "clave correcta" }, deps);
  }
  await assert.rejects(
    verificarCredenciales({ correo: "nuevo@example.com", clave: "clave correcta" }, deps),
    ErrorLimiteIntentos,
  );
});

test("recuperación limita correos desconocidos y existentes antes de consultar la base", async () => {
  for (const existe of [true, false]) {
    const { deps } = preparar();
    let consultas = 0;
    deps.repositorio.buscarUsuarioPorCorreo = async () => {
      consultas += 1;
      return existe ? { ...usuario, hashClave: "hash anterior", activo: true } : null;
    };
    for (let i = 0; i < 5; i++) {
      deps.obtenerIpCliente = async () => `192.0.2.${i}`;
      await solicitarRecuperacion({ correo: " ANA@EXAMPLE.COM " }, deps);
    }
    deps.obtenerIpCliente = async () => "192.0.2.99";
    await assert.rejects(
      solicitarRecuperacion({ correo: "ana@example.com" }, deps),
      ErrorLimiteIntentos,
    );
    assert.equal(consultas, 5);
  }
});

test("recuperación permite seis correos desde la misma IP y bloquea después de 30 solicitudes", async () => {
  const { deps } = preparar();
  let consultas = 0;
  deps.repositorio.buscarUsuarioPorCorreo = async () => {
    consultas += 1;
    return null;
  };
  for (let i = 0; i < 30; i++) {
    await solicitarRecuperacion({ correo: `usuario${i}@example.com` }, deps);
  }
  await assert.rejects(
    solicitarRecuperacion({ correo: "nuevo@example.com" }, deps),
    ErrorLimiteIntentos,
  );
  assert.equal(consultas, 30);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import { ErrorConflicto, ErrorNoEncontrado, ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import type { UsuarioListado } from "./repositorio";
import {
  cambiarActivo,
  cambiarRol,
  listarUsuarios,
  type DependenciasUsuarios,
} from "./servicio-usuarios";

const admin = { id: 5, nombre: "Andrea", rol: Rol.ADMINISTRADOR };
const mesero = { id: 1, nombre: "Lucía", rol: Rol.MESERO };

function crearEntorno() {
  const usuarios = new Map<number, UsuarioListado>([
    [
      1,
      {
        id: 1,
        nombre: "Lucía",
        correo: "mesero@orderix.test",
        rol: Rol.MESERO,
        activo: true,
        creadoEn: new Date(),
      },
    ],
    [
      5,
      {
        id: 5,
        nombre: "Andrea",
        correo: "admin@orderix.test",
        rol: Rol.ADMINISTRADOR,
        activo: true,
        creadoEn: new Date(),
      },
    ],
  ]);
  const registro: string[] = [];
  const consultas: unknown[] = [];
  const deps: DependenciasUsuarios = {
    repositorio: {
      listarUsuarios: async (consulta) => {
        consultas.push(consulta);
        return { usuarios: [...usuarios.values()], total: usuarios.size };
      },
      buscarUsuarioPorId: async (id) => usuarios.get(id) ?? null,
      actualizarRol: async (id, rol) => {
        usuarios.get(id)!.rol = rol;
      },
      actualizarActivo: async (id, activo) => {
        usuarios.get(id)!.activo = activo;
      },
    },
    cerrarTodasLasSesiones: async (id) => {
      registro.push(`sesiones cerradas ${id}`);
    },
    desconectarUsuario: (id) => {
      registro.push(`desconectado ${id}`);
    },
  };
  return { deps, usuarios, registro, consultas };
}

test("solo el administrador gestiona usuarios", async () => {
  const { deps } = crearEntorno();
  await assert.rejects(listarUsuarios(mesero, {}, deps), ErrorProhibido);
  await assert.rejects(
    cambiarRol(mesero, { usuarioId: 1, rol: "ADMINISTRADOR" }, deps),
    ErrorProhibido,
  );
  await assert.rejects(
    cambiarActivo(mesero, { usuarioId: 1, activo: "false" }, deps),
    ErrorProhibido,
  );
});

test("cambiar el rol cierra las sesiones y conexiones de esa persona", async () => {
  const { deps, usuarios, registro } = crearEntorno();
  await cambiarRol(admin, { usuarioId: "1", rol: "COCINA" }, deps);
  assert.equal(usuarios.get(1)!.rol, Rol.COCINA);
  assert.deepEqual(registro, ["sesiones cerradas 1", "desconectado 1"]);
});

test("el administrador no puede cambiar su propio rol ni desactivarse", async () => {
  const { deps, usuarios } = crearEntorno();
  await assert.rejects(cambiarRol(admin, { usuarioId: 5, rol: "MESERO" }, deps), ErrorConflicto);
  await assert.rejects(
    cambiarActivo(admin, { usuarioId: 5, activo: "false" }, deps),
    ErrorConflicto,
  );
  assert.equal(usuarios.get(5)!.rol, Rol.ADMINISTRADOR);
  assert.equal(usuarios.get(5)!.activo, true);
});

test("desactivar corta sesiones; activar no; usuario inexistente o rol inválido se rechazan", async () => {
  const { deps, usuarios, registro } = crearEntorno();
  await cambiarActivo(admin, { usuarioId: 1, activo: "false" }, deps);
  assert.equal(usuarios.get(1)!.activo, false);
  assert.deepEqual(registro, ["sesiones cerradas 1", "desconectado 1"]);

  registro.length = 0;
  await cambiarActivo(admin, { usuarioId: 1, activo: "true" }, deps);
  assert.equal(usuarios.get(1)!.activo, true);
  assert.deepEqual(registro, []);

  await assert.rejects(
    cambiarActivo(admin, { usuarioId: 99, activo: "false" }, deps),
    ErrorNoEncontrado,
  );
  await assert.rejects(cambiarRol(admin, { usuarioId: 1, rol: "DUENO" }, deps), ErrorValidacion);
});

test("el listado pagina en el servidor e ignora filtros inválidos", async () => {
  const { deps, consultas } = crearEntorno();
  await listarUsuarios(admin, { pagina: "2", texto: "  lucía " }, deps);
  await listarUsuarios(admin, { pagina: "abc" }, deps);
  assert.deepEqual(consultas, [
    { texto: "lucía", salto: 15, cantidad: 15 },
    { texto: undefined, salto: 0, cantidad: 15 },
  ]);
});

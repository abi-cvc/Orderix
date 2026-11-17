import assert from "node:assert/strict";
import { test } from "node:test";
import { Rol } from "@/generated/prisma/enums";
import { ErrorProhibido, ErrorValidacion } from "@/lib/errores";
import { validar } from "@/lib/validacion";
import { listarProductos } from "./servicio";
import { esquemaCrearProducto, esquemaFiltroProductos } from "./validadores";

test("el servicio del menú rechaza roles distintos de administrador antes de tocar datos", async () => {
  await assert.rejects(
    () => listarProductos({ id: 1, nombre: "Mesero", rol: Rol.MESERO }, {}),
    ErrorProhibido,
  );
});

test("el validador del menú normaliza precio y filtros", () => {
  const producto = validar(esquemaCrearProducto, {
    nombre: "  Ceviche  ",
    descripcion: "",
    categoria: "Mariscos",
    precio: "8.9",
  });
  assert.deepEqual(producto, {
    nombre: "Ceviche",
    descripcion: undefined,
    categoria: "Mariscos",
    precio: "8.90",
  });

  assert.deepEqual(
    validar(esquemaFiltroProductos, {
      pagina: "2",
      nombre: "  ceviche ",
      categoria: "",
      disponible: "false",
    }),
    { pagina: 2, nombre: "ceviche", categoria: undefined, disponible: false },
  );
});

test("el validador del menú rechaza precios negativos", () => {
  assert.throws(
    () =>
      validar(esquemaCrearProducto, {
        nombre: "Ceviche",
        categoria: "Mariscos",
        precio: "-1",
      }),
    ErrorValidacion,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { comoResponder } from "./ack";

test("comoResponder usa el callback cuando el cliente manda una función", () => {
  const recibidas: unknown[] = [];
  comoResponder((r: unknown) => recibidas.push(r))({ ok: true });
  assert.deepEqual(recibidas, [{ ok: true }]);
});

test("comoResponder ignora cualquier otro valor sin lanzar error", () => {
  for (const valor of ["texto", 42, null, undefined, {}, []]) {
    assert.doesNotThrow(() => comoResponder(valor)({ ok: true }));
  }
});

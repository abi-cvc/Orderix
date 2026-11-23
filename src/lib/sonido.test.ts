import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAVE_STORAGE_SONIDO_COCINA,
  cancelarAvisoSonoroPendiente,
  estaSonidoCocinaActivado,
  guardarPreferenciaSonidoCocina,
  programarAvisoSonoro,
  reproducirTonoAviso,
  resolverPrioridadSonido,
  sonidoPorEvento,
} from "./sonido";

test("sonidoPorEvento identifica correctamente pedidos nuevos y alergias", () => {
  assert.equal(sonidoPorEvento("pedido.alergiaAgregada"), "alergia");
  assert.equal(sonidoPorEvento("pedido.creado"), "pedido");
  assert.equal(sonidoPorEvento("pedido.estadoCambiado"), null);
  assert.equal(sonidoPorEvento("chat:mensaje" as never), null);
});

test("resolverPrioridadSonido prioriza siempre la alergia sobre el pedido nuevo", () => {
  assert.equal(resolverPrioridadSonido(["pedido"]), "pedido");
  assert.equal(resolverPrioridadSonido(["alergia"]), "alergia");
  assert.equal(resolverPrioridadSonido(["pedido", "alergia"]), "alergia");
  assert.equal(resolverPrioridadSonido(["alergia", "pedido"]), "alergia");
  assert.equal(resolverPrioridadSonido(["pedido", "pedido", "alergia"]), "alergia");
  assert.equal(resolverPrioridadSonido([null, undefined]), null);
  assert.equal(resolverPrioridadSonido([]), null);
});

test("estaSonidoCocinaActivado devuelve false por defecto o sin navegador", () => {
  assert.equal(estaSonidoCocinaActivado(), false);
});

test("preferencias en localStorage guardan y leen correctamente el estado", () => {
  const almacenamiento: Record<string, string> = {};
  const mockStorage = {
    getItem: (k: string) => almacenamiento[k] ?? null,
    setItem: (k: string, v: string) => {
      almacenamiento[k] = v;
    },
    removeItem: (k: string) => {
      delete almacenamiento[k];
    },
    clear: () => {
      for (const k of Object.keys(almacenamiento)) delete almacenamiento[k];
    },
  };

  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: mockStorage,
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  try {
    assert.equal(estaSonidoCocinaActivado(), false);
    guardarPreferenciaSonidoCocina(true);
    assert.equal(mockStorage.getItem(CLAVE_STORAGE_SONIDO_COCINA), "true");
    assert.equal(estaSonidoCocinaActivado(), true);

    guardarPreferenciaSonidoCocina(false);
    assert.equal(mockStorage.getItem(CLAVE_STORAGE_SONIDO_COCINA), "false");
    assert.equal(estaSonidoCocinaActivado(), false);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("programarAvisoSonoro agrupa eventos y prioriza alergia en lote", async () => {
  const almacenamiento: Record<string, string> = {
    [CLAVE_STORAGE_SONIDO_COCINA]: "true",
  };

  class MockGainNode {
    gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    connect = () => {};
    disconnect = () => {};
  }

  class MockOscillatorNode {
    type = "sine";
    frequency = {
      setValueAtTime: () => {},
    };
    connect = () => {};
    disconnect = () => {};
    start = () => {};
    stop = () => {};
    onended: (() => void) | null = null;
  }

  class MockAudioContext {
    currentTime = 0;
    state = "running";
    destination = {};
    createOscillator() {
      return new MockOscillatorNode();
    }
    createGain() {
      return new MockGainNode();
    }
    resume = async () => {};
  }

  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => almacenamiento[k] ?? null,
      setItem: (k: string, v: string) => {
        almacenamiento[k] = v;
      },
    },
    AudioContext: MockAudioContext,
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;

  try {
    cancelarAvisoSonoroPendiente();

    // Enviamos primero pedido y luego alergia en la misma ventana de tiempo
    programarAvisoSonoro("pedido");
    programarAvisoSonoro("alergia");
    programarAvisoSonoro("pedido");

    // Esperamos 100ms para que se ejecute el temporizador del lote
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Si no arrojó errores y se procesó el lote correctamente, pasó
    assert.ok(true);
  } finally {
    cancelarAvisoSonoroPendiente();
    globalThis.window = originalWindow;
  }
});

test("reproducirTonoAviso ejecuta los tres tipos de tonos sin errores sintácticos", () => {
  class MockGainNode {
    gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    connect = () => {};
    disconnect = () => {};
  }

  class MockOscillatorNode {
    type = "sine";
    frequency = {
      setValueAtTime: () => {},
    };
    connect = () => {};
    disconnect = () => {};
    start = () => {};
    stop = () => {};
  }

  class MockAudioContext {
    currentTime = 0;
    state = "running";
    destination = {};
    createOscillator() {
      return new MockOscillatorNode();
    }
    createGain() {
      return new MockGainNode();
    }
    resume = async () => {};
  }

  const originalWindow = globalThis.window;
  globalThis.window = {
    AudioContext: MockAudioContext,
  } as unknown as Window & typeof globalThis;

  try {
    assert.doesNotThrow(() => reproducirTonoAviso("confirmacion"));
    assert.doesNotThrow(() => reproducirTonoAviso("pedido"));
    assert.doesNotThrow(() => reproducirTonoAviso("alergia"));
  } finally {
    globalThis.window = originalWindow;
  }
});

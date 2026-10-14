// @ts-check
/**
 * @file Contains the integration tests for Kernel.
 *
 * @module test/integration/application/Kernel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Kernel from '#Kernel';
import Router from '#routing/Router';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Data emitted with the listen event.
 *
 * @typedef {import('#Kernel').ListenEventData} ListenEventData
 */

/**
 * Data emitted with the close event.
 *
 * @typedef {import('#Kernel').CloseEventData} CloseEventData
 */

/**
 * Data emitted with the exchange lifecycle events.
 *
 * @typedef {import('#Kernel').ExchangeStartInfo} ExchangeStartInfo
 */

/**
 * Data emitted with the exchange error event.
 *
 * @typedef {import('#Kernel').ExchangeErrorInfo} ExchangeErrorInfo
 */

/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#Kernel').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Registers a listener for an exchange lifecycle event.
 *
 * @template T
 * @typedef {(listener: (data: T) => void) => unknown} EventSubscriber
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a Kernel bound to a random free port.
 *
 * @returns {Kernel} A kernel instance.
 */
function makeKernel() {
  const configuration = new HttpServerConfiguration({
    listen: {
      host: '127.0.0.1',
      port: 0,
    },
  });

  return new Kernel(configuration);
}

/**
 * Creates middleware that resolves the exchange with a JSON response.
 *
 * @param {object} body - JSON response body.
 * @returns {MiddlewareFunction} Middleware that sends the response.
 */
function respondWith(body) {
  return async function middleware(exchange, _next) {
    exchange.response.status(200).json(body);
  };
}

/**
 * Creates middleware that throws the provided error.
 *
 * @param {Error} error - Error thrown during exchange processing.
 * @returns {MiddlewareFunction} Middleware that throws.
 */
function throwWith(error) {
  return async function middleware(_exchange, _next) {
    throw error;
  };
}

/**
 * Creates a request URL from a listening endpoint.
 *
 * @param {string} endpoint - Server endpoint.
 * @param {string} pathname - Request pathname.
 * @returns {string} The request URL.
 */
function createRequestUrl(endpoint, pathname) {
  return new URL(pathname, endpoint).href;
}

/**
 * Resolves with the first payload emitted through the provided subscription.
 *
 * @template T
 * @param {EventSubscriber<T>} subscribe - Registers the listener.
 * @returns {Promise<T>} Resolves with the first emitted payload.
 */
function nextEvent(subscribe) {
  return new Promise(resolve => {
    subscribe(data => resolve(data));
  });
}

/**
 * Creates a Router with a single GET route registered.
 *
 * @param {string} pathname - Route pathname.
 * @param {object} body - JSON response body.
 * @returns {Router} A router instance with the route registered.
 */
function makeRouter(pathname, body) {
  const router = new Router();

  router.get(pathname, respondWith(body));

  return router;
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Kernel (integration)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Lifecycle', async sub => {
    await sub.test('should start and stop the server', async () => {
      const kernel = makeKernel();
      const state = {
        /** @type {ListenEventData|null} */
        listenEvent: null,
      };

      try {
        kernel.onListen(data => {
          state.listenEvent = data;
        });

        await kernel.listen();

        assert.ok(state.listenEvent);
        assert.strictEqual(typeof state.listenEvent.endpoint.port, 'number');
        assert.strictEqual(typeof state.listenEvent.endpoint.address, 'string');
        assert.strictEqual(typeof state.listenEvent.elapsed, 'number');
        assert.strictEqual(kernel.listening, true);
      } finally {
        await kernel.close();
      }

      assert.strictEqual(kernel.listening, false);
    });

    await sub.test('should emit close event', async () => {
      const kernel = makeKernel();
      const state = {
        /** @type {CloseEventData|null} */
        closeEvent: null,
      };

      try {
        kernel.onClose(data => {
          state.closeEvent = data;
        });

        await kernel.listen();
        await kernel.close();

        assert.ok(state.closeEvent);
        assert.strictEqual(typeof state.closeEvent.elapsed, 'number');
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Route handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Route handling', async sub => {
    await sub.test('should respond to a registered route', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerRouteEntry('GET', '/users', [respondWith({ users: [] })]);

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/users'));

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { users: [] });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });

    await sub.test('should return default 404 for an unregistered route', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerRouteEntry('GET', '/users', [respondWith({ users: [] })]);

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/missing'));

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(await response.json(), { error: 'Not Found' });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });

    await sub.test('should use custom notFound handler', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.notFound(exchange => {
          exchange.response.status(404).json({ error: 'Custom Not Found' });
        });

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/missing'));

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(await response.json(), { error: 'Custom Not Found' });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Mount entries
  // ───────────────────────────────────────────────────────────────────────────
  test('Mount entries', async sub => {
    await sub.test('should serve routes from a mounted router', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerMountEntry('/api', makeRouter('/users', { users: [] }));

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/api/users'));

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { users: [] });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Error handling', async sub => {
    await sub.test('should use default 500 when middleware throws', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerRouteEntry('GET', '/boom', [throwWith(new Error('Something went wrong'))]);

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 500);
        assert.deepStrictEqual(await response.json(), { error: 'Internal Server Error' });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });

    await sub.test('should use custom systemError handler', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.systemError((error, exchange) => {
          exchange.response.status(503).json({
            error: 'Service Unavailable',
            message: error.message,
          });
        });

        kernel.registerRouteEntry('GET', '/boom', [throwWith(new Error('Database down'))]);

        await kernel.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 503);
        assert.deepStrictEqual(await response.json(), {
          error: 'Service Unavailable',
          message: 'Database down',
        });
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Exchange lifecycle events
  // ───────────────────────────────────────────────────────────────────────────
  test('Exchange lifecycle events', async sub => {
    await sub.test('should emit exchange:start and exchange:end on success', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerRouteEntry('GET', '/ok', [respondWith({ ok: true })]);

        await kernel.listen();

        const startPromise = nextEvent(kernel.onExchangeStart.bind(kernel));
        const endPromise = nextEvent(kernel.onExchangeEnd.bind(kernel));

        const response = await fetch(createRequestUrl(state.endpoint, '/ok'));

        assert.strictEqual(response.status, 200);

        const startData = await startPromise;
        const endData = await endPromise;

        assert.strictEqual(typeof startData.id, 'string');
        assert.strictEqual(typeof startData.traceId, 'string');
        assert.strictEqual(typeof startData.timing?.startedAt, 'number');

        assert.strictEqual(endData.id, startData.id);
        assert.strictEqual(endData.traceId, startData.traceId);
        assert.strictEqual(typeof endData.timing?.endedAt, 'number');
        assert.strictEqual(typeof endData.timing?.duration, 'number');
        assert.ok((endData.timing?.duration ?? -1) >= 0);
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });

    await sub.test('should emit exchange:error when middleware throws', async () => {
      const kernel = makeKernel();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        kernel.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        kernel.registerRouteEntry('GET', '/boom', [throwWith(new Error('Expected failure'))]);

        await kernel.listen();

        const errorPromise = nextEvent(kernel.onExchangeError.bind(kernel));
        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 500);

        const errorData = await errorPromise;

        assert.ok(errorData.error instanceof Error);
        assert.strictEqual(errorData.error.message, 'Expected failure');
        assert.strictEqual(typeof errorData.id, 'string');
        assert.strictEqual(typeof errorData.traceId, 'string');
      } finally {
        if (kernel.listening) {
          await kernel.close();
        }
      }
    });
  });
});

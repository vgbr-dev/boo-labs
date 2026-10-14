// @ts-check
/**
 * @file Contains the integration tests for Server.
 *
 * @module test/integration/application/Server
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Server from '#Server';
import Router from '#routing/Router';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Data emitted with the listen event.
 *
 * @typedef {import('#Server').ListenEventData} ListenEventData
 */

/**
 * Data emitted with the close event.
 *
 * @typedef {import('#Server').CloseEventData} CloseEventData
 */

/**
 * Data emitted with the exchange lifecycle events.
 *
 * @typedef {import('#Server').ExchangeStartInfo} ExchangeLifecycleData
 */

/**
 * Data emitted with the exchange error event.
 *
 * @typedef {import('#Server').ExchangeErrorInfo} ExchangeErrorData
 */

/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#Server').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Registers a listener for an event that carries a typed payload.
 *
 * @template T
 * @typedef {(listener: (data: T) => void) => unknown} EventSubscriber
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a Server bound to a random free port.
 *
 * @returns {Server} A server instance.
 */
function makeServer() {
  const configuration = new HttpServerConfiguration({
    listen: {
      host: '127.0.0.1',
      port: 0,
    },
  });

  return new Server(configuration);
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
suite('Server (integration)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Lifecycle', async sub => {
    await sub.test('should start and stop correctly', async () => {
      const server = makeServer();
      const state = {
        /** @type {ListenEventData|null} */
        listenEvent: null,
      };

      try {
        server.onListen(data => {
          state.listenEvent = data;
        });

        assert.strictEqual(server.state, 'idle');
        assert.strictEqual(server.listening, false);

        await server.listen();

        assert.strictEqual(server.state, 'listening');
        assert.strictEqual(server.listening, true);
        assert.ok(state.listenEvent);
        assert.strictEqual(typeof state.listenEvent.endpoint.displayUrl, 'string');
        assert.strictEqual(typeof state.listenEvent.elapsed, 'number');
        assert.ok(server.ipc);
      } finally {
        if (server.listening) {
          await server.close();
        }
      }

      assert.strictEqual(server.state, 'closed');
      assert.strictEqual(server.listening, false);
    });

    await sub.test('should emit close event', async () => {
      const server = makeServer();
      const state = {
        /** @type {CloseEventData|null} */
        closeEvent: null,
      };

      try {
        server.onClose(data => {
          state.closeEvent = data;
        });

        await server.listen();
        await server.close();

        assert.ok(state.closeEvent);
        assert.strictEqual(typeof state.closeEvent.elapsed, 'number');
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });

    await sub.test('should throw when accessing ipc while idle', () => {
      const server = makeServer();

      assert.throws(() => server.ipc);
    });

    await sub.test('Symbol.asyncDispose should close when listening', async () => {
      const server = makeServer();

      try {
        await server.listen();

        assert.strictEqual(server.state, 'listening');

        await server[Symbol.asyncDispose]();

        assert.strictEqual(server.state, 'closed');
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Route handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Route handling', async sub => {
    await sub.test('should respond to a registered route', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.get('/users', respondWith({ users: [] }));

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/users'));

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { users: [] });
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });

    await sub.test('should return default 404 for an unregistered route', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.get('/users', respondWith({ users: [] }));

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/missing'));

        assert.strictEqual(response.status, 404);
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });

    await sub.test('should use custom notFound handler', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.notFound(exchange => {
          exchange.response.status(404).json({ error: 'Custom Not Found' });
        });

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/missing'));

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(await response.json(), { error: 'Custom Not Found' });
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Mount entries
  // ───────────────────────────────────────────────────────────────────────────
  test('Mount entries', async sub => {
    await sub.test('should serve routes from a mounted router', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.mount('/api', makeRouter('/users', { users: [] }));

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/api/users'));

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), { users: [] });
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Error handling', async sub => {
    await sub.test('should use default 500 when middleware throws', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.get('/boom', throwWith(new Error('Something went wrong')));

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 500);
        assert.deepStrictEqual(await response.json(), { error: 'Internal Server Error' });
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });

    await sub.test('should use custom systemError handler', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.systemError((error, exchange) => {
          exchange.response.status(503).json({
            error: 'Service Unavailable',
            message: error.message,
          });
        });

        server.get('/boom', throwWith(new Error('Database down')));

        await server.listen();

        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 503);
        assert.deepStrictEqual(await response.json(), {
          error: 'Service Unavailable',
          message: 'Database down',
        });
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Exchange lifecycle events
  // ───────────────────────────────────────────────────────────────────────────
  test('Exchange lifecycle events', async sub => {
    await sub.test('should emit exchange:start and exchange:end on success', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.get('/ok', respondWith({ ok: true }));

        await server.listen();

        const startPromise = nextEvent(server.onExchangeStart.bind(server));
        const endPromise = nextEvent(server.onExchangeEnd.bind(server));

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
        if (server.listening) {
          await server.close();
        }
      }
    });

    await sub.test('should emit exchange:error when middleware throws', async () => {
      const server = makeServer();
      /** @type {{ endpoint: string }} */
      const state = {
        endpoint: '',
      };

      try {
        server.onListen(data => {
          state.endpoint = data.endpoint.displayUrl;
        });

        server.get('/boom', throwWith(new Error('Expected failure')));

        await server.listen();

        const errorPromise = nextEvent(server.onExchangeError.bind(server));

        const response = await fetch(createRequestUrl(state.endpoint, '/boom'));

        assert.strictEqual(response.status, 500);

        const errorData = await errorPromise;

        assert.ok(errorData.error instanceof Error);
        assert.strictEqual(errorData.error.message, 'Expected failure');
        assert.strictEqual(typeof errorData.id, 'string');
        assert.strictEqual(typeof errorData.traceId, 'string');
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });
});

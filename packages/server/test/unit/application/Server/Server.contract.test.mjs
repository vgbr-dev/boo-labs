// @ts-check
/**
 * @file Contains the contract tests for Server.
 *
 * @module test/unit/application/Server/Server.contract
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Server from '#Server';
import Router from '#routing/Router';
import ServerError from '#shared/errors/ServerError';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#Kernel').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Callback invoked to resolve a not-found exchange.
 *
 * @typedef {import('#Server').NotFoundHandler} NotFoundHandler
 */

/**
 * Callback invoked to resolve a system error exchange.
 *
 * @typedef {import('#Server').SystemErrorHandler} SystemErrorHandler
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a Server with a minimal HTTP configuration.
 *
 * @returns {Server} A server instance.
 */
function makeServer() {
  const configuration = new HttpServerConfiguration({
    listen: { port: 0 },
  });

  return new Server(configuration);
}

/**
 * No-op middleware used only to exercise the fluent API.
 *
 * @type {MiddlewareFunction}
 */
const noopMiddleware = (_exchange, next) => next();

/**
 * No-op not-found handler used only to exercise the fluent API.
 *
 * @type {NotFoundHandler}
 */
const noopNotFoundHandler = _exchange => {};

/**
 * No-op system error handler used only to exercise the fluent API.
 *
 * @type {SystemErrorHandler}
 */
const noopSystemErrorHandler = (_error, _exchange) => {};

/**
 * Creates a router instance for fluent API contract tests.
 *
 * A real Router is used instead of a stub because `mount` delegates to
 * the routing system, which validates the router instance.
 *
 * @returns {Router} A router instance.
 */
function makeRouter() {
  return new Router();
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Server (contract)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should start in idle state', () => {
      const server = makeServer();

      assert.strictEqual(server.state, 'idle');
      assert.strictEqual(server.listening, false);
    });

    await sub.test('should throw when accessing ipc while not listening', () => {
      const server = makeServer();

      assert.throws(
        () => server.ipc,
        error => {
          assert.ok(error instanceof ServerError);
          assert.strictEqual(error.code, 'SERVER_NOT_LISTENING');
          return true;
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fluent API (idle state)
  // ───────────────────────────────────────────────────────────────────────────
  test('Fluent API', async sub => {
    /**
     * Methods that must return the Server instance to preserve the fluent API.
     *
     * @type {Array<[Exclude<keyof Server, symbol>, unknown[]]>}
     */
    const methods = [
      ['use', [noopMiddleware]],
      ['use', ['/api', noopMiddleware]],
      ['get', ['/users', noopMiddleware]],
      ['query', ['/users', noopMiddleware]],
      ['post', ['/users', noopMiddleware]],
      ['put', ['/users/:id', noopMiddleware]],
      ['patch', ['/users/:id', noopMiddleware]],
      ['delete', ['/users/:id', noopMiddleware]],
      ['head', ['/users', noopMiddleware]],
      ['trace', ['/debug', noopMiddleware]],
      ['mount', ['/api', makeRouter()]],
      ['notFound', [noopNotFoundHandler]],
      ['systemError', [noopSystemErrorHandler]],
      ['on', ['listen', () => {}]],
      ['once', ['listen', () => {}]],
      ['off', ['listen', () => {}]],
      ['onListen', [() => {}]],
      ['onClose', [() => {}]],
      ['onError', [() => {}]],
      ['onExchangeStart', [() => {}]],
      ['onExchangeEnd', [() => {}]],
      ['onExchangeError', [() => {}]],
    ];

    for (const [method, args] of methods) {
      await sub.test(`${method}() should return the server instance`, () => {
        const server = makeServer();

        // Dynamic dispatch over the fluent API: each entry provides the
        // arguments expected by the corresponding method.
        // @ts-expect-error - dynamic dispatch over keyof Server.
        const result = server[method](...args);

        assert.strictEqual(result, server);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // State guards
  // ───────────────────────────────────────────────────────────────────────────
  test('State guards', async sub => {
    await sub.test('configuration methods should throw when not idle', async () => {
      const server = makeServer();

      await server.listen();

      try {
        assert.throws(
          () => server.get('/x', noopMiddleware),
          error => {
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.code, 'SERVER_ALREADY_LISTENING');
            return true;
          },
        );
      } finally {
        await server.close();
      }
    });

    await sub.test('listen() should throw when already listening', async () => {
      const server = makeServer();

      await server.listen();

      try {
        await assert.rejects(
          () => server.listen(),
          error => {
            assert.ok(error instanceof ServerError);
            assert.strictEqual(error.code, 'SERVER_ALREADY_LISTENING');
            return true;
          },
        );
      } finally {
        await server.close();
      }
    });

    await sub.test('close() should throw when not listening', async () => {
      const server = makeServer();

      await assert.rejects(
        () => server.close(),
        error => {
          assert.ok(error instanceof ServerError);
          assert.strictEqual(error.code, 'SERVER_NOT_LISTENING');
          return true;
        },
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // listen() and close()
  // ───────────────────────────────────────────────────────────────────────────
  test('listen() and close()', async sub => {
    await sub.test('listen() should return a promise', async () => {
      const server = makeServer();

      const result = server.listen();

      assert.ok(result instanceof Promise);

      await result;
      await server.close();
    });

    await sub.test('close() should return a promise', async () => {
      const server = makeServer();

      await server.listen();

      try {
        const result = server.close();

        assert.ok(result instanceof Promise);

        await result;
      } finally {
        if (server.listening) {
          await server.close();
        }
      }
    });
  });
});

// @ts-check
/**
 * @file Contains the unit tests for RouterSystem.
 *
 * @module test/unit/routing/RouterSystem
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import RouterSystem from '#routing/RouterSystem';
import Router from '#routing/Router';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @import Exchange from '#Exchange';
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents a middleware function used by the router system.
 *
 * @typedef {(exchange: Exchange, next: NextFunction) => void | Promise<void>} MiddlewareFunction
 */

/**
 * Options accepted by the `makeExchange` helper.
 *
 * @typedef  {object} MakeExchangeOptions
 * @property {string} [method='GET']      - HTTP method for the fake request.
 * @property {string} [pathname='/']      - Pathname for the fake request.
 */

/**
 * Represents the result of `makeMiddleware` and `makeTerminalMiddleware`.
 *
 * @typedef  {object}             MiddlewareRecorder
 * @property {number}             calls              - Number of times the middleware was invoked.
 * @property {MiddlewareFunction} middleware         - The middleware function.
 */

/**
 * Represents the state captured by a mock response.
 *
 * @typedef  {object}      CapturedResponse
 * @property {string|null} allowHeader      - Value recorded for the `Allow` header.
 * @property {boolean}     ended            - Whether `end()` was called.
 */

/**
 * Represents a mock response used by RouterSystem tests.
 *
 * @typedef  {object}                                         MockResponse
 * @property {(code: number) => MockResponse}                 status       - Records the status code.
 * @property {(name: string, value: unknown) => MockResponse} setHeader    - Records a header.
 * @property {() => MockResponse}                             end          - Marks the response as ended.
 */

/**
 * Represents the result of `makeResponse`.
 *
 * @typedef  {object}           MakeResponseResult
 * @property {MockResponse}     response           - The mock response.
 * @property {CapturedResponse} captured           - The recorded response state.
 */

/**
 * Represents the fallback handler invoked when no layer resolves
 * the exchange.
 *
 * @typedef {(exchange: Exchange) => void | Promise<void>} NotFoundHandler
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a minimal exchange mock.
 *
 * @param {MakeExchangeOptions} [options] - Exchange options.
 * @returns {Exchange} The exchange mock.
 */
function makeExchange({ method = 'GET', pathname = '/' } = {}) {
  return /** @type {Exchange} */ (
    /** @type {unknown} */ ({
      request: {
        method,
        pathname,
      },
    })
  );
}

/**
 * Creates a middleware function that records invocations and delegates.
 *
 * @returns {MiddlewareRecorder} The recorder with the middleware and call count.
 */
function makeMiddleware() {
  /** @type {MiddlewareRecorder} */
  const recorder = {
    calls: 0,
    middleware: async function middleware(_exchange, next) {
      recorder.calls += 1;
      await next();
    },
  };

  return recorder;
}

/**
 * Creates a terminal middleware function that records invocations and does
 * not call `next()`.
 *
 * @returns {MiddlewareRecorder} The recorder with the middleware and call count.
 */
function makeTerminalMiddleware() {
  /** @type {MiddlewareRecorder} */
  const recorder = {
    calls: 0,
    middleware: async function middleware(_exchange, _next) {
      recorder.calls += 1;
      // intentionally does not call next
    },
  };

  return recorder;
}

/**
 * Creates a response mock that records the `Allow` header and the ended state.
 *
 * @returns {MakeResponseResult} The mock response and its captured state.
 */
function makeResponse() {
  /** @type {CapturedResponse} */
  const captured = {
    allowHeader: null,
    ended: false,
  };

  /** @type {MockResponse} */
  const response = {
    status(_code) {
      return response;
    },
    setHeader(name, value) {
      if (name === 'Allow') {
        captured.allowHeader = String(value);
      }
      return response;
    },
    end() {
      captured.ended = true;
      return response;
    },
  };

  return { response, captured };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('RouterSystem', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // registerLayerOptionsBatch()
  // ───────────────────────────────────────────────────────────────────────────
  test('registerLayerOptionsBatch()', async sub => {
    await sub.test('should register layers into the pipeline', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/users' });
      const mw = makeMiddleware();

      system.registerLayerOptionsBatch([
        { method: 'GET', pathnamePattern: '/users', middleware: mw.middleware },
      ]);

      await system.executePipeline(exchange, async () => {});

      assert.strictEqual(mw.calls, 1);
    });

    await sub.test('should register multiple layers preserving order', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/users' });
      /** @type {string[]} */
      const order = [];

      system.registerLayerOptionsBatch([
        {
          method: 'GET',
          pathnamePattern: '/users',
          middleware: async (_exchange, next) => {
            order.push('a');
            await next();
          },
        },
        {
          method: 'GET',
          pathnamePattern: '/users',
          middleware: async (_exchange, next) => {
            order.push('b');
            await next();
          },
        },
      ]);

      await system.executePipeline(exchange, async () => {});

      assert.deepStrictEqual(order, ['a', 'b']);
    });

    await sub.test('should register global layers with undefined method and pathname', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'DELETE', pathname: '/anything' });
      const mw = makeMiddleware();

      system.registerLayerOptionsBatch([
        { method: undefined, pathnamePattern: undefined, middleware: mw.middleware },
      ]);

      await system.executePipeline(exchange, async () => {});

      assert.strictEqual(mw.calls, 1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // registerRouteEntry()
  // ───────────────────────────────────────────────────────────────────────────
  test('registerRouteEntry()', async sub => {
    await sub.test('should execute the middleware when the exchange matches', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/users' });
      const mw = makeMiddleware();

      system.registerRouteEntry('GET', '/users', [mw.middleware]);

      await system.executePipeline(exchange, async () => {});

      assert.strictEqual(mw.calls, 1);
    });

    await sub.test('should create one layer per middleware', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'POST', pathname: '/users' });
      /** @type {string[]} */
      const order = [];

      system.registerRouteEntry('POST', '/users', [
        async (_exchange, next) => {
          order.push('first');
          await next();
        },
        async (_exchange, next) => {
          order.push('second');
          await next();
        },
      ]);

      await system.executePipeline(exchange, async () => {});

      assert.deepStrictEqual(order, ['first', 'second']);
    });

    await sub.test('should not execute middleware when the method does not match', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'POST', pathname: '/users' });
      const mw = makeMiddleware();

      system.registerRouteEntry('GET', '/users', [mw.middleware]);

      let notFoundCalled = false;

      await system.executePipeline(exchange, async () => {
        notFoundCalled = true;
      });

      assert.strictEqual(mw.calls, 0);
      assert.strictEqual(notFoundCalled, true);
    });

    await sub.test('should not execute middleware when the pathname does not match', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/posts' });
      const mw = makeMiddleware();

      system.registerRouteEntry('GET', '/users', [mw.middleware]);

      let notFoundCalled = false;

      await system.executePipeline(exchange, async () => {
        notFoundCalled = true;
      });

      assert.strictEqual(mw.calls, 0);
      assert.strictEqual(notFoundCalled, true);
    });

    await sub.test(
      'should not invoke notFound when a matching middleware resolves the exchange',
      async () => {
        const system = new RouterSystem();
        const exchange = makeExchange({ method: 'GET', pathname: '/users' });
        const terminal = makeTerminalMiddleware();

        system.registerRouteEntry('GET', '/users', [terminal.middleware]);

        let notFoundCalled = false;

        await system.executePipeline(exchange, async () => {
          notFoundCalled = true;
        });

        assert.strictEqual(terminal.calls, 1);
        assert.strictEqual(notFoundCalled, false);
      },
    );

    await sub.test('should register an automatic OPTIONS layer', async () => {
      const system = new RouterSystem();
      const mw = makeMiddleware();

      system.registerRouteEntry('GET', '/users', [mw.middleware]);

      const { response, captured } = makeResponse();

      /** @type {any} */
      const exchange = {
        request: { method: 'OPTIONS', pathname: '/users' },
        response,
      };

      let notFoundCalled = false;

      await system.executePipeline(exchange, async () => {
        notFoundCalled = true;
      });

      assert.strictEqual(mw.calls, 0);
      assert.strictEqual(notFoundCalled, false);
      assert.ok(captured.allowHeader);
      assert.ok(captured.allowHeader.includes('GET'));
      assert.ok(captured.allowHeader.includes('OPTIONS'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // registerMountEntry()
  // ───────────────────────────────────────────────────────────────────────────
  test('registerMountEntry()', async sub => {
    await sub.test('should mount child routes with the base prefix', async () => {
      const system = new RouterSystem();
      const router = new Router();
      const mw = makeMiddleware();

      router.get('/users', mw.middleware);

      system.registerMountEntry('/api', router);

      const exchange = makeExchange({ method: 'GET', pathname: '/api/users' });

      await system.executePipeline(exchange, async () => {});

      assert.strictEqual(mw.calls, 1);
    });

    await sub.test('should not match child routes without the base prefix', async () => {
      const system = new RouterSystem();
      const router = new Router();
      const mw = makeMiddleware();

      router.get('/users', mw.middleware);

      system.registerMountEntry('/api', router);

      const exchange = makeExchange({ method: 'GET', pathname: '/users' });

      let notFoundCalled = false;

      await system.executePipeline(exchange, async () => {
        notFoundCalled = true;
      });

      assert.strictEqual(mw.calls, 0);
      assert.strictEqual(notFoundCalled, true);
    });

    await sub.test('should mount router global middlewares under the base pattern', async () => {
      const system = new RouterSystem();
      const router = new Router();
      const globalMw = makeMiddleware();
      const routeMw = makeMiddleware();

      router.use(globalMw.middleware);
      router.get('/users', routeMw.middleware);

      system.registerMountEntry('/api', router);

      const exchange = makeExchange({ method: 'GET', pathname: '/api/users' });

      await system.executePipeline(exchange, async () => {});

      // El middleware global del router se registra con `pathnamePattern: '/api'`
      // (exacto), así que NO se ejecuta para `/api/users`.
      assert.strictEqual(globalMw.calls, 0);
      assert.strictEqual(routeMw.calls, 1);
    });

    await sub.test(
      'should execute router global middlewares for the exact base pathname',
      async () => {
        const system = new RouterSystem();
        const router = new Router();
        const state = {
          middlewareCalled: false,
          notFoundCalled: false,
        };

        router.use(async (_exchange, _next) => {
          state.middlewareCalled = true;
          // no llama a next(): corta la cadena
        });

        system.registerMountEntry('/api', router);

        const exchange = makeExchange({ method: 'GET', pathname: '/api' });

        await system.executePipeline(exchange, async () => {
          state.notFoundCalled = true;
        });

        assert.strictEqual(state.middlewareCalled, true);
        assert.strictEqual(state.notFoundCalled, false);
      },
    );

    await sub.test('should mount multiple routers independently', async () => {
      const system = new RouterSystem();
      const usersRouter = new Router();
      const postsRouter = new Router();
      const usersMw = makeMiddleware();
      const postsMw = makeMiddleware();

      usersRouter.use(usersMw.middleware);
      postsRouter.use(postsMw.middleware);

      system.registerMountEntry('/users', usersRouter);
      system.registerMountEntry('/posts', postsRouter);

      await system.executePipeline(
        makeExchange({ method: 'GET', pathname: '/users' }),
        async () => {},
      );
      await system.executePipeline(
        makeExchange({ method: 'GET', pathname: '/posts' }),
        async () => {},
      );

      assert.strictEqual(usersMw.calls, 1);
      assert.strictEqual(postsMw.calls, 1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // executePipeline()
  // ───────────────────────────────────────────────────────────────────────────
  test('executePipeline()', async sub => {
    await sub.test('should invoke notFoundHandler when no layer matches', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/missing' });

      /** @type {Exchange | null} */
      let received = null;

      /**
       * Captures the exchange forwarded to the not-found fallback.
       *
       * @type {NotFoundHandler}
       */
      const notFoundHandler = exc => {
        received = exc;
      };

      await system.executePipeline(exchange, notFoundHandler);

      assert.strictEqual(received, exchange);
    });

    await sub.test('should return a promise', () => {
      const system = new RouterSystem();
      const exchange = makeExchange();

      const result = system.executePipeline(exchange, async () => {});

      assert.strictEqual(result instanceof Promise, true);
    });

    await sub.test('should propagate errors from a middleware', async () => {
      const system = new RouterSystem();
      const exchange = makeExchange({ method: 'GET', pathname: '/users' });

      const failingMiddleware = async function middleware() {
        throw new Error('middleware failure');
      };

      system.registerRouteEntry('GET', '/users', [failingMiddleware]);

      await assert.rejects(
        () => system.executePipeline(exchange, async () => {}),
        /middleware failure/,
      );
    });

    await sub.test('should respect registration order across multiple entries', async () => {
      const system = new RouterSystem();
      /** @type {string[]} */
      const order = [];

      system.registerRouteEntry('GET', '/a', [
        async (_exchange, next) => {
          order.push('a');
          await next();
        },
      ]);
      system.registerRouteEntry('GET', '/b', [
        async (_exchange, next) => {
          order.push('b');
          await next();
        },
      ]);

      await system.executePipeline(makeExchange({ method: 'GET', pathname: '/a' }), async () => {});
      await system.executePipeline(makeExchange({ method: 'GET', pathname: '/b' }), async () => {});

      assert.deepStrictEqual(order, ['a', 'b']);
    });
  });
});

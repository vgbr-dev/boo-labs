// @ts-check
/**
 * @file Contains the unit tests for Router.
 *
 * @module test/unit/core/routing/Router
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Router from '#routing/Router';
import { ROUTER_BRAND } from '#shared/constants/symbols/brands';

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
 * Represents a middleware function used by the router.
 *
 * @typedef {(exchange: Exchange, next: NextFunction) => void | Promise<void>} MiddlewareFunction
 */

/**
 * Represents the HTTP method shortcuts exposed by `Router`.
 *
 * @typedef {'get'|'post'|'put'|'patch'|'delete'|'head'|'trace'|'query'} RouterMethod
 */

/**
 * Represents the signature of an HTTP method shortcut on `Router`.
 *
 * @typedef {(path: string, ...middleware: MiddlewareFunction[]) => Router} RouterMethodShortcut
 */

/**
 * Represents a middleware with an invalid signature, used to test
 * validation errors.
 *
 * @typedef {() => void} InvalidMiddleware
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a no-op middleware function for route tests.
 *
 * @returns {MiddlewareFunction} A middleware that ignores its arguments.
 */
function mw() {
  return function middleware(exchange, next) {
    void exchange;
    void next;
  };
}

/**
 * Creates an invalid middleware that declares no parameters.
 *
 * Used to assert that `Router` rejects middleware whose arity does not
 * match the expected `(exchange, next)` signature.
 *
 * @returns {InvalidMiddleware} A parameterless middleware stub.
 */
function invalidMiddleware() {
  return () => {};
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Router', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Brand
  // ───────────────────────────────────────────────────────────────────────────
  test('Brand', async sub => {
    await sub.test('should expose the ROUTER_BRAND', () => {
      const router = new Router();

      assert.strictEqual(router[ROUTER_BRAND], true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Fluent API
  // ───────────────────────────────────────────────────────────────────────────
  test('Fluent API', async sub => {
    await sub.test('use() should return the router instance', () => {
      const router = new Router();

      assert.strictEqual(router.use(mw()), router);
    });

    await sub.test('all() should return the router instance', () => {
      const router = new Router();

      assert.strictEqual(router.all('/users', mw()), router);
    });

    /** @type {RouterMethod[]} */
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'trace', 'query'];

    for (const method of methods) {
      await sub.test(`${method}() should return the router instance`, () => {
        const router = new Router();

        assert.strictEqual(router[method]('/users', mw()), router);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // use()
  // ───────────────────────────────────────────────────────────────────────────
  test('use()', async sub => {
    await sub.test('should register global middlewares', () => {
      const router = new Router();
      const a = mw();
      const b = mw();

      router.use(a, b);

      const { middlewares } = router.compose();

      assert.deepStrictEqual(middlewares, [a, b]);
    });

    await sub.test('should accumulate middlewares across calls', () => {
      const router = new Router();
      const a = mw();
      const b = mw();

      router.use(a);
      router.use(b);

      const { middlewares } = router.compose();

      assert.deepStrictEqual(middlewares, [a, b]);
    });

    await sub.test('should throw when a middleware is not a function', () => {
      const router = new Router();

      assert.throws(() => router.use(/** @type {any} */ ('not-a-function')), {
        name: 'MiddlewareError',
      });
    });

    await sub.test('should throw when a middleware does not declare two parameters', () => {
      const router = new Router();

      assert.throws(() => router.use(invalidMiddleware()), {
        name: 'MiddlewareError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Method registration
  // ───────────────────────────────────────────────────────────────────────────
  test('Method registration', async sub => {
    await sub.test('should register middleware for a specific method and pathname', () => {
      const router = new Router();
      const a = mw();

      router.get('/users', a);

      const { layersOptions } = router.compose();

      assert.strictEqual(layersOptions.length, 1);
      assert.strictEqual(layersOptions[0].method, 'GET');
      assert.strictEqual(layersOptions[0].pathnamePattern, '/users');
      assert.strictEqual(layersOptions[0].middleware, a);
    });

    await sub.test('should register multiple middlewares for the same method and pathname', () => {
      const router = new Router();
      const a = mw();
      const b = mw();

      router.get('/users', a, b);

      const { layersOptions } = router.compose();

      assert.strictEqual(layersOptions.length, 2);
      assert.deepStrictEqual(
        layersOptions.map(layer => layer.middleware),
        [a, b],
      );
    });

    await sub.test('should group registrations by pathname pattern', () => {
      const router = new Router();

      router.get('/users', mw());
      router.post('/users', mw());
      router.get('/posts', mw());

      const { layersOptions } = router.compose();

      assert.strictEqual(layersOptions.length, 3);

      const methodsByPattern = layersOptions.map(
        layer => `${layer.method}:${layer.pathnamePattern}`,
      );

      assert.deepStrictEqual(methodsByPattern.sort(), ['GET:/posts', 'GET:/users', 'POST:/users']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // all()
  // ───────────────────────────────────────────────────────────────────────────
  test('all()', async sub => {
    await sub.test('should apply all-method middleware to every method registered', () => {
      const router = new Router();
      const all = mw();
      const get = mw();
      const post = mw();

      router.all('/users', all);
      router.get('/users', get);
      router.post('/users', post);

      const { layersOptions } = router.compose();

      const byMethod = {
        GET: layersOptions.filter(layer => layer.method === 'GET').map(layer => layer.middleware),
        POST: layersOptions.filter(layer => layer.method === 'POST').map(layer => layer.middleware),
      };

      assert.deepStrictEqual(byMethod.GET, [all, get]);
      assert.deepStrictEqual(byMethod.POST, [all, post]);
    });

    await sub.test('should only register all-method middleware once per pattern', () => {
      const router = new Router();
      const all = mw();

      router.all('/users', all);
      router.get('/users', mw());

      const { layersOptions } = router.compose();

      const getLayers = layersOptions.filter(layer => layer.method === 'GET');

      assert.strictEqual(getLayers.length, 2);
      assert.strictEqual(getLayers[0].middleware, all);
    });

    await sub.test('should throw when all() is registered twice for the same pattern', () => {
      const router = new Router();

      router.all('/users', mw());

      assert.throws(() => router.all('/users', mw()), {
        name: 'RouterError',
        code: 'DUPLICATE_ALL_METHOD',
      });
    });

    await sub.test('should not throw when all() is registered for different patterns', () => {
      const router = new Router();

      router.all('/a', mw());
      router.all('/b', mw());

      assert.doesNotThrow(() => router.compose());
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Duplicate route detection
  // ───────────────────────────────────────────────────────────────────────────
  test('Duplicate route detection', async sub => {
    await sub.test('should throw when the same method and pathname are registered twice', () => {
      const router = new Router();

      router.get('/users', mw());

      assert.throws(() => router.get('/users', mw()), {
        name: 'RouterError',
        code: 'DUPLICATE_ROUTE',
      });
    });

    await sub.test('should allow the same pathname for different methods', () => {
      const router = new Router();

      router.get('/users', mw());

      assert.doesNotThrow(() => router.post('/users', mw()));
    });

    await sub.test('should allow the same method for different pathnames', () => {
      const router = new Router();

      router.get('/a', mw());

      assert.doesNotThrow(() => router.get('/b', mw()));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invalid inputs
  // ───────────────────────────────────────────────────────────────────────────
  test('Invalid inputs', async sub => {
    await sub.test('should throw when pathname pattern is not a string', () => {
      const router = new Router();

      assert.throws(() => router.get(/** @type {any} */ (42), mw()), {
        name: 'PathnamePatternError',
      });
    });

    await sub.test('should throw when pathname pattern is empty', () => {
      const router = new Router();

      assert.throws(() => router.get('', mw()), {
        name: 'PathnamePatternError',
      });
    });

    await sub.test('should throw when a middleware is not a function', () => {
      const router = new Router();

      assert.throws(() => router.get('/users', /** @type {any} */ ('nope')), {
        name: 'MiddlewareError',
      });
    });

    await sub.test('should throw when a middleware does not declare two parameters', () => {
      const router = new Router();

      assert.throws(() => router.get('/users', invalidMiddleware()), {
        name: 'MiddlewareError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // compose()
  // ───────────────────────────────────────────────────────────────────────────
  test('compose()', async sub => {
    await sub.test('should return empty arrays when nothing is registered', () => {
      const router = new Router();

      const composed = router.compose();

      assert.deepStrictEqual(composed.middlewares, []);
      assert.deepStrictEqual(composed.layersOptions, []);
    });

    await sub.test('should return a fresh middlewares array on each call', () => {
      const router = new Router();
      const a = mw();

      router.use(a);

      const first = router.compose();
      const second = router.compose();

      assert.notStrictEqual(first.middlewares, second.middlewares);
      assert.deepStrictEqual(first.middlewares, second.middlewares);
    });

    await sub.test('should not mutate internal state when the caller mutates the result', () => {
      const router = new Router();
      const a = mw();

      router.use(a);

      const composed = router.compose();
      composed.middlewares.push(mw());

      const next = router.compose();

      assert.strictEqual(next.middlewares.length, 1);
    });
  });
});

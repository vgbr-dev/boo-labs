// @ts-check
/**
 * @file Contains the unit tests for Route.
 *
 * @module test/unit/core/routing/Route
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Route from '../../../../source/core/routing/Router/Route.mjs';

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

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Route', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // methods getter
  // ───────────────────────────────────────────────────────────────────────────
  test('methods getter', async sub => {
    await sub.test('should return an empty array when no methods are registered', () => {
      const route = new Route('/users');

      assert.deepStrictEqual(route.methods, []);
    });

    await sub.test('should return registered methods', () => {
      const route = new Route('/users');

      route.add('GET', [mw()]);
      route.add('POST', [mw()]);

      assert.deepStrictEqual(route.methods.sort(), ['GET', 'POST']);
    });

    await sub.test('should not expose the internal Map', () => {
      const route = new Route('/users');

      route.add('GET', [mw()]);

      const first = route.methods;
      first.push('POST');

      assert.deepStrictEqual(route.methods, ['GET']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // all()
  // ───────────────────────────────────────────────────────────────────────────
  test('all()', async sub => {
    await sub.test('should accumulate all-method middleware', () => {
      const route = new Route('/users');
      const a = mw();
      const b = mw();

      route.all(a);
      route.all(b);

      route.add('GET', [mw()]);

      const composed = route.compose();

      const allLayers = composed.filter(layer => layer.middleware === a || layer.middleware === b);

      assert.strictEqual(allLayers.length, 2);
    });

    await sub.test('should not emit all-method middleware when no method is registered', () => {
      const route = new Route('/users');

      route.all(mw());

      assert.deepStrictEqual(route.compose(), []);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // add()
  // ───────────────────────────────────────────────────────────────────────────
  test('add()', async sub => {
    await sub.test('should store middleware for a method', () => {
      const route = new Route('/users');
      const a = mw();

      route.add('GET', [a]);

      const composed = route.compose();

      assert.strictEqual(composed.length, 1);
      assert.strictEqual(composed[0].method, 'GET');
      assert.strictEqual(composed[0].pathnamePattern, '/users');
      assert.strictEqual(composed[0].middleware, a);
    });

    await sub.test('should replace middleware for the same method', () => {
      const route = new Route('/users');
      const a = mw();
      const b = mw();

      route.add('GET', [a]);
      route.add('GET', [b]);

      const composed = route.compose();

      assert.strictEqual(composed.length, 1);
      assert.strictEqual(composed[0].middleware, b);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // compose()
  // ───────────────────────────────────────────────────────────────────────────
  test('compose()', async sub => {
    await sub.test('should return an empty array when nothing is registered', () => {
      const route = new Route('/users');

      assert.deepStrictEqual(route.compose(), []);
    });

    await sub.test('should compose middleware for a single method', () => {
      const route = new Route('/users');
      const a = mw();
      const b = mw();

      route.add('GET', [a, b]);

      const composed = route.compose();

      assert.strictEqual(composed.length, 2);
      assert.deepStrictEqual(
        composed.map(layer => layer.middleware),
        [a, b],
      );
    });

    await sub.test('should emit all-method middleware before method-specific middleware', () => {
      const route = new Route('/users');
      const all = mw();
      const get = mw();

      route.all(all);
      route.add('GET', [get]);

      const composed = route.compose();

      assert.strictEqual(composed.length, 2);
      assert.strictEqual(composed[0].middleware, all);
      assert.strictEqual(composed[1].middleware, get);
    });

    await sub.test('should repeat all-method middleware for each registered method', () => {
      const route = new Route('/users');
      const all = mw();
      const get = mw();
      const post = mw();

      route.all(all);
      route.add('GET', [get]);
      route.add('POST', [post]);

      const composed = route.compose();

      const getLayers = composed.filter(layer => layer.method === 'GET');
      const postLayers = composed.filter(layer => layer.method === 'POST');

      assert.strictEqual(getLayers.length, 2);
      assert.strictEqual(postLayers.length, 2);
      assert.strictEqual(getLayers[0].middleware, all);
      assert.strictEqual(getLayers[1].middleware, get);
      assert.strictEqual(postLayers[0].middleware, all);
      assert.strictEqual(postLayers[1].middleware, post);
    });

    await sub.test('should preserve pathnamePattern in every composed layer', () => {
      const route = new Route('/posts/:id');

      route.add('GET', [mw()]);

      const composed = route.compose();

      assert.ok(composed.every(layer => layer.pathnamePattern === '/posts/:id'));
    });
  });
});

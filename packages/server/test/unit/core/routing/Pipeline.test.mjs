// @ts-check
/**
 * @file Contains the unit tests for Pipeline.
 *
 * @module test/unit/core/routing/Pipeline
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Pipeline from '#routing/Pipeline';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an executable layer for HTTP exchange processing.
 *
 * @typedef {import('#routing/ExchangeLayer').default} ExchangeLayer
 */

/**
 * Represents the fallback handler invoked when no layer resolves the exchange.
 *
 * @typedef {import('#routing/Pipeline').NotFoundHandler} NotFoundHandler
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {import('#routing/ExchangeLayer').NextFunction} NextFunction
 */

/**
 * Represents the handle method signature of a fake exchange layer.
 *
 * @typedef {(exchange: Exchange, next: NextFunction) => Promise<void>} FakeLayerHandle
 */

/**
 * Represents a fake exchange layer used in unit tests.
 *
 * @typedef  {object}          FakeLayer
 * @property {FakeLayerHandle} handle    - Fake handle method.
 */

/**
 * Represents a custom handler invoked by a fake layer.
 *
 * @typedef {(exchange: Exchange, next: NextFunction) => void | Promise<void>} FakeLayerHandler
 */

/**
 * Options accepted by the `makeLayer` helper.
 *
 * @typedef  {object}           MakeLayerOptions
 * @property {boolean}          [delegates=true] - Whether the layer calls `next()`.
 * @property {FakeLayerHandler} [onHandle]       - Custom handler.
 */

/**
 * @typedef  {object}        MakeLayerResult
 * @property {Exchange[]}    calls           - Recorded exchanges.
 * @property {ExchangeLayer} layer           - The fake layer.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a fake exchange layer that records invocations and delegates
 * optionally.
 *
 * @param {MakeLayerOptions} [options] - Configuration for the fake layer.
 * @returns {MakeLayerResult} The fake layer and its recorded calls.
 */
function makeLayer(options = {}) {
  const { delegates = true, onHandle } = options;
  /** @type {Exchange[]} */
  const calls = [];

  return {
    calls,
    layer: /** @type {ExchangeLayer} */ (
      /** @type {unknown} */ ({
        /**
         * Records the exchange and delegates according to the options.
         *
         * @param {Exchange} exchange - The current exchange.
         * @param {NextFunction} next - The delegation function.
         * @returns {Promise<void>} Resolves when the layer finishes.
         */
        async handle(exchange, next) {
          calls.push(exchange);

          if (onHandle) {
            await onHandle(exchange, next);
            return;
          }

          if (delegates) {
            await next();
          }
        },
      })
    ),
  };
}

/**
 * Creates a fake exchange.
 *
 * @returns {Exchange} A fake exchange usable by the pipeline.
 */
function makeExchange() {
  return /** @type {Exchange} */ (/** @type {unknown} */ ({ id: Symbol('exchange') }));
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Pipeline', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // add()
  // ───────────────────────────────────────────────────────────────────────────
  test('add()', async sub => {
    await sub.test('should return the pipeline instance for chaining', () => {
      const pipeline = new Pipeline();
      const { layer } = makeLayer();

      assert.strictEqual(pipeline.add(layer), pipeline);
    });

    await sub.test(
      'should execute a single layer without invoking notFound when it does not delegate',
      async () => {
        const pipeline = new Pipeline();
        const exchange = makeExchange();
        const { layer, calls } = makeLayer({ delegates: false });

        pipeline.add(layer);

        let notFoundCalled = false;

        await pipeline.execute(exchange, async () => {
          notFoundCalled = true;
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0], exchange);
        assert.strictEqual(notFoundCalled, false);
      },
    );

    await sub.test(
      'should invoke notFound when a single layer delegates past the end',
      async () => {
        const pipeline = new Pipeline();
        const exchange = makeExchange();
        const { layer, calls } = makeLayer({ delegates: true });

        pipeline.add(layer);

        let notFoundCalled = false;

        await pipeline.execute(exchange, async () => {
          notFoundCalled = true;
        });

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0], exchange);
        assert.strictEqual(notFoundCalled, true);
      },
    );

    await sub.test('should execute multiple layers in registration order', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {string[]} */
      const order = [];

      const a = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('a');
          await next();
        },
      }).layer;

      const b = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('b');
          await next();
        },
      }).layer;

      const c = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('c');
          await next();
        },
      }).layer;

      pipeline.add(a).add(b).add(c);

      await pipeline.execute(exchange, async () => {});

      assert.deepStrictEqual(order, ['a', 'b', 'c']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // addBatch()
  // ───────────────────────────────────────────────────────────────────────────
  test('addBatch()', async sub => {
    await sub.test('should return the pipeline instance for chaining', () => {
      const pipeline = new Pipeline();

      assert.strictEqual(pipeline.addBatch([]), pipeline);
    });

    await sub.test('should register multiple layers preserving order', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {number[]} */
      const order = [];

      const layers = [
        makeLayer({
          onHandle: async (_exchange, next) => {
            order.push(1);
            await next();
          },
        }).layer,
        makeLayer({
          onHandle: async (_exchange, next) => {
            order.push(2);
            await next();
          },
        }).layer,
        makeLayer({
          onHandle: async (_exchange, next) => {
            order.push(3);
            await next();
          },
        }).layer,
      ];

      pipeline.addBatch(layers);

      await pipeline.execute(exchange, async () => {});

      assert.deepStrictEqual(order, [1, 2, 3]);
    });

    await sub.test('should append to existing layers', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {string[]} */
      const order = [];

      const first = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('first');
          await next();
        },
      }).layer;

      const second = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('second');
          await next();
        },
      }).layer;

      pipeline.add(first);
      pipeline.addBatch([second]);

      await pipeline.execute(exchange, async () => {});

      assert.deepStrictEqual(order, ['first', 'second']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // next() delegation
  // ───────────────────────────────────────────────────────────────────────────
  test('next() delegation', async sub => {
    await sub.test('should stop the chain when a layer does not call next()', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {string[]} */
      const order = [];

      const a = makeLayer({
        onHandle: async () => {
          order.push('a');
          /* no next */
        },
      }).layer;

      const b = makeLayer({
        onHandle: async (_exchange, next) => {
          order.push('b');
          await next();
        },
      }).layer;

      pipeline.add(a).add(b);

      await pipeline.execute(exchange, async () => {
        order.push('notFound');
      });

      assert.deepStrictEqual(order, ['a']);
    });

    await sub.test('should invoke notFoundHandler when the chain is exhausted', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {string[]} */
      const order = [];

      pipeline.add(
        makeLayer({
          onHandle: async (_exchange, next) => {
            order.push('a');
            await next();
          },
        }).layer,
      );

      pipeline.add(
        makeLayer({
          onHandle: async (_exchange, next) => {
            order.push('b');
            await next();
          },
        }).layer,
      );

      /**
       * Fallback handler that records the not-found outcome and asserts the
       * forwarded exchange.
       *
       * @type {NotFoundHandler}
       */
      const notFoundHandler = passedExchange => {
        order.push('notFound');
        assert.strictEqual(passedExchange, exchange);
      };

      await pipeline.execute(exchange, notFoundHandler);

      assert.deepStrictEqual(order, ['a', 'b', 'notFound']);
    });

    await sub.test('should invoke notFoundHandler when the pipeline is empty', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      let received = null;

      await pipeline.execute(exchange, async passedExchange => {
        received = passedExchange;
      });

      assert.strictEqual(received, exchange);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // next() guard
  // ───────────────────────────────────────────────────────────────────────────
  test('next() guard', async sub => {
    await sub.test('should throw when a layer calls next() more than once', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();

      const layer = makeLayer({
        onHandle: async (_exchange, next) => {
          await next();
          await next();
        },
      }).layer;

      pipeline.add(layer);

      await assert.rejects(
        () => pipeline.execute(exchange, async () => {}),
        /next\(\) called multiple times/,
      );
    });

    await sub.test(
      'should allow the same index to be reached again through a fresh dispatch',
      async () => {
        const pipeline = new Pipeline();
        const exchange = makeExchange();
        let executions = 0;

        const layer = makeLayer({
          onHandle: async (_exchange, next) => {
            executions += 1;
            await next();
          },
        }).layer;

        pipeline.add(layer);

        await pipeline.execute(exchange, async () => {});
        await pipeline.execute(exchange, async () => {});

        assert.strictEqual(executions, 2);
      },
    );

    await sub.test('should allow different layers to each call next() once', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();

      pipeline.add(makeLayer().layer).add(makeLayer().layer).add(makeLayer().layer);

      await assert.doesNotReject(() => pipeline.execute(exchange, async () => {}));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Async behavior
  // ───────────────────────────────────────────────────────────────────────────
  test('Async behavior', async sub => {
    await sub.test('should await async layers sequentially', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      /** @type {string[]} */
      const order = [];

      /**
       * Waits for the specified number of milliseconds.
       *
       * @param {number} ms - Milliseconds to wait before resolving.
       * @returns {Promise<void>} Resolves after the delay elapses.
       */
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

      const a = makeLayer({
        onHandle: async (_exchange, next) => {
          await delay(5);
          order.push('a');
          await next();
        },
      }).layer;

      const b = makeLayer({
        onHandle: async (_exchange, next) => {
          await delay(1);
          order.push('b');
          await next();
        },
      }).layer;

      pipeline.add(a).add(b);

      await pipeline.execute(exchange, async () => {});

      assert.deepStrictEqual(order, ['a', 'b']);
    });

    await sub.test('should propagate errors thrown by a layer', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();
      const boom = new Error('boom');

      const layer = makeLayer({
        onHandle: async () => {
          throw boom;
        },
      }).layer;

      pipeline.add(layer);

      await assert.rejects(() => pipeline.execute(exchange, async () => {}), /boom/);
    });

    await sub.test('should propagate errors thrown by the notFoundHandler', async () => {
      const pipeline = new Pipeline();
      const exchange = makeExchange();

      const notFoundHandler = async () => {
        throw new Error('no route');
      };

      await assert.rejects(() => pipeline.execute(exchange, notFoundHandler), /no route/);
    });
  });
});

// @ts-check
/**
 * @file Defines the Pipeline execution component for HTTP exchanges.
 *
 * @description Manages and executes an ordered chain of middleware layers.
 * It acts as the core dispatch mechanism, handling control flow and safe
 * delegation through `next()`. It is transport-agnostic.
 *
 * @module Pipeline
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an executable layer for HTTP exchange processing.
 *
 * @typedef {import('#routing/ExchangeLayer').default} ExchangeLayer
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#routing/ExchangeLayer').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents the fallback handler invoked when no layer resolves
 * the exchange.
 *
 * @typedef {(exchange: Exchange) => void | Promise<void>} NotFoundHandler
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an ordered processing pipeline for HTTP exchanges.
 *
 * @classdesc Stores processing layers and executes their handlers in
 * registration order. Each layer is responsible for determining whether
 * it applies to the current exchange.
 */
class Pipeline {
  /**
   * Stores the middleware layer instances in execution order.
   *
   * @type {ExchangeLayer[]}
   */
  #layers = [];

  /**
   * Appends a single middleware layer to the end of the execution chain.
   *
   * @param {ExchangeLayer} layer - The middleware layer instance to add.
   * @returns {Pipeline} The current pipeline instance for method chaining.
   * @example
   * ```js
   * const layer = new ExchangeLayer({
   *  method: undefined,
   *  pathnamePattern: '/api/v1/users',
   *  middleware: authMiddleware
   * });
   *
   * pipeline.add(layer);
   * ```
   */
  add(layer) {
    this.#layers.push(layer);
    return this;
  }

  /**
   * Appends multiple middleware layers to the execution chain at once.
   *
   * This is particularly useful when mounting an entire router or a
   * predefined set of middleware into the main server pipeline.
   *
   * @param {ExchangeLayer[]} layers - The middleware layer instances to add.
   * @returns {Pipeline} The current pipeline instance for method chaining.
   * @example
   * ```js
   * const routerLayers = [
   *  new ExchangeLayer({
   *    method: undefined,
   *    pathnamePattern: '/api/v1/users',
   *    middleware: authMiddleware
   *  }),
   *  new ExchangeLayer({
   *    method: 'GET',
   *    pathnamePattern: '/api/v1/users',
   *    middleware: listUsers
   *  }),
   * ];
   * pipeline.addBatch(routerLayers);
   * ```
   */
  addBatch(layers) {
    this.#layers.push(...layers);
    return this;
  }

  /**
   * Executes the middleware pipeline for a given exchange.
   *
   * Layers are processed sequentially in registration order. Each matching
   * layer receives the exchange and a `next()` function that delegates
   * execution to the following layer. If no layer resolves the exchange,
   * the `notFoundHandler` is invoked.
   *
   * @param {Exchange} exchange - The current exchange.
   * @param {NotFoundHandler} notFoundHandler - The fallback async function to execute, if no layer resolves the exchange.
   * @returns {Promise<void>} Resolves when the processing chain completes.
   * @throws {Error} If a middleware layer calls `next()` more than once.
   * @example
   * ```js
   * await pipeline.execute(exchange, async exchange => {
   *   exchange.response.status(404).json({ error: 'Not Found' });
   * });
   * ```
   */
  async execute(exchange, notFoundHandler) {
    const called = new Set();

    /**
     * Dispatches middleware execution by index.
     *
     * @private
     * @param {number} index - The current layer index in the pipeline.
     * @returns {Promise<void>}
     */
    const dispatch = async index => {
      if (index >= this.#layers.length) {
        await notFoundHandler(exchange);
      } else {
        const layer = this.#layers[index];

        const next = async () => {
          if (called.has(index)) {
            throw new Error(`next() called multiple times at pipeline index ${index}.`);
          }
          called.add(index);
          await dispatch(index + 1);
        };

        await layer.handle(exchange, next);
      }
    };

    await dispatch(0);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Pipeline;

// @ts-check
/**
 * @file Defines the HTTP exchange execution layer.
 *
 * @description Provides the ExchangeLayer class for matching exchanges against
 * HTTP routing criteria and executing the associated middleware.
 *
 * @module ExchangeLayer
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';

// » IMPORT LOCAL MODULES
import ExchangeMatcher from './ExchangeMatcher.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {'GET'|'HEAD'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'QUERY'|'TRACE'} HTTPMethod
 */

/**
 * Represents a function that delegates execution to the next
 * middleware layer.
 *
 * @callback NextFunction
 * @returns {void|Promise<void>}
 */

/**
 * Represents an exchange middleware function.
 *
 * @callback MiddlewareFunction
 * @param {Exchange} exchange - Current HTTP exchange.
 * @param {NextFunction} next - The function to call the next layer.
 * @returns {void|Promise<void>}
 */

/**
 * Defines the criteria and middleware used by an exchange layer.
 *
 * @typedef  {object}               ExchangeLayerOptions
 * @property {HTTPMethod|undefined} method               - HTTP method to match. When undefined, any HTTP method is accepted.
 * @property {string|undefined}     pathnamePattern      - URL pathname pattern to match. When undefined, any pathname is accepted.
 * @property {MiddlewareFunction}   middleware           - Middleware executed when the exchange matches the layer criteria.
 */

/**
 * Represents the plain object representation of an exchange layer.
 *
 * @typedef  {object}               ExchangeLayerObject
 * @property {HTTPMethod|undefined} method              - HTTP method used by the layer.
 * @property {string|undefined}     pathnamePattern     - URL pathname pattern used by the layer.
 * @property {MiddlewareFunction}   middleware          - Middleware executed by the layer.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an executable layer for HTTP exchange processing.
 *
 * @classdesc Associates middleware with matching criteria based on an HTTP
 * method and pathname pattern.
 *
 * The layer delegates matching to an ExchangeMatcher and execution to
 * the middleware provided during construction.
 */
class ExchangeLayer {
  /**
   * The HTTP method used by the layer.
   *
   * @type {HTTPMethod|undefined}
   */
  #method;

  /**
   * The pathname pattern used by the layer.
   *
   * @type {string|undefined}
   */
  #pathnamePattern;

  /**
   * The matcher used to evaluate incoming exchanges.
   *
   * @type {ExchangeMatcher}
   */
  #matcher;

  /**
   * The middleware executed when the exchange matches the layer criteria.
   *
   * @type {MiddlewareFunction}
   */
  #middleware;

  /**
   * Creates an ExchangeLayer.
   *
   * @param {ExchangeLayerOptions} options - Configuration used to define the exchange layer.
   * @example
   * ```js
   * const authLayer = new ExchangeLayer({
   *   method: undefined,
   *   pathnamePattern: '/api/v1/users',
   *   middleware: authMiddleware,
   * });
   * ```
   */
  constructor({ method, pathnamePattern, middleware }) {
    this.#matcher = new ExchangeMatcher({ method, pathnamePattern });
    this.#method = method;
    this.#pathnamePattern = pathnamePattern;
    this.#middleware = middleware;
  }

  /**
   * The HTTP method used by the layer.
   *
   * @type {HTTPMethod|undefined}
   */
  get method() {
    return this.#method;
  }

  /**
   * The pathname pattern used by the layer.
   *
   * @type {string|undefined}
   */
  get pathnamePattern() {
    return this.#pathnamePattern;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   * @example
   * ```js
   * const exchangeLayer = new ExchangeLayer({...});
   *
   * console.log(Object.prototype.toString.call(exchangeLayer));
   * // '[object ExchangeLayer]'
   * console.log(exchangeLayer[Symbol.toStringTag]);
   * // 'ExchangeLayer'
   * ```
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }

  /**
   * Handles the exchange. If constraints match, executes the middleware.
   * Otherwise, delegates to the next layer in the pipeline.
   *
   * @param {Exchange} exchange - The current exchange.
   * @param {NextFunction} next - The function to call the next layer.
   * @returns {Promise<void>} The result of calling the next layer or the completion of the middleware execution.
   * @example
   * ```js
   * await layer.handle(exchange, next);
   * ```
   */
  async handle(exchange, next) {
    if (!this.#matcher.test(exchange)) {
      return next();
    }
    await this.#middleware(exchange, next);
  }

  /**
   * Converts the `ExchangeLayer` instance to a plain JavaScript object.
   *
   * @returns {ExchangeLayerObject} A plain object representation of the exchange layer.
   * @example
   * ```js
   * const usersLayer = new ExchangeLayer({
   *   method: 'GET',
   *   pathnamePattern: '/api/users/:id',
   *   middleware: usersRepository.find,
   * });
   *
   * console.log(usersLayer.toObject());
   * // {
   * //   method: 'GET',
   * //   pathnamePattern: '/api/users/:id',
   * //   middleware: [AsyncFunction: middleware]
   * // }
   * ```
   */
  toObject() {
    return Object.freeze({
      method: this.method,
      pathnamePattern: this.pathnamePattern,
      middleware: this.#middleware,
    });
  }

  /**
   * Converts the `ExchangeLayer` instance to a plain JavaScript object.
   *
   * @returns {ExchangeLayerObject} A plain object representation of the exchange layer.
   * @example
   * ```js
   * const usersLayer = new ExchangeLayer({
   *   method: 'DELETE',
   *   pathnamePattern: '/api/users/:id',
   *   middleware: usersRepository.delete,
   * });
   *
   * console.log(JSON.stringify(usersLayer));
   * // '{"method":"DELETE","pathnamePattern":"/api/users/:id"}'
   * ```
   */
  toJSON() {
    return this.toObject();
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   * @example
   * ```js
   * const authLayer = new ExchangeLayer({
   *   method: undefined,
   *   pathnamePattern: '/api/login',
   *   middleware: authMiddleware,
   * });
   *
   * console.log(authLayer);
   * // ExchangeLayer {
   * //   method: undefined,
   * //   pathnamePattern: '/api/login',
   * //   middleware: [AsyncFunction: middleware]
   * // }
   * ```
   */
  [inspect.custom]() {
    return `${this.constructor.name} ${inspect(this.toObject(), { colors: true })}`;
  }
}
// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ExchangeLayer;

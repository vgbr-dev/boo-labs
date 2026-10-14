// @ts-check
/**
 * @file Defines the middleware for handling automatic OPTIONS requests.
 *
 * @description Provides automatic OPTIONS responses for routes by exposing the
 * HTTP methods registered for each pathname pattern.
 *
 * @module OptionsMiddleware
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {import('#routing/ExchangeLayer').HTTPMethod} HTTPMethod
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Handles automatic OPTIONS responses for a route.
 *
 * @classdesc `OptionsMiddleware` generates an OPTIONS response containing the
 * HTTP methods registered for a pathname pattern.
 */
class OptionsMiddleware {
  /**
   * The HTTP methods registered for the route.
   *
   * `undefined` represents all methods during registration and is removed when
   * the methods are resolved.
   *
   * @type {Set<HTTPMethod|undefined>}
   */
  #methods = new Set();

  /**
   * The cached resolved HTTP methods string.
   *
   * @type {string|null}
   */
  #methodsCache = null;

  /**
   * Creates an instance of OptionsMiddleware.
   *
   * @example
   * ```js
   * const middleware = new OptionsMiddleware();
   * ```
   */
  constructor() {
    this.handle = this.handle.bind(this);
  }

  /**
   * The resolved HTTP methods string.
   *
   * @type {string}
   */
  get methods() {
    if (this.#methodsCache !== null) {
      return this.#methodsCache;
    }

    const methods = new Set(this.#methods);
    methods.delete(undefined);

    if (methods.size === 0) {
      this.#methodsCache = OptionsMiddleware.#METHODS.join(', ');
    } else {
      methods.add('OPTIONS');
      this.#methodsCache = [...methods].join(', ');
    }

    return this.#methodsCache;
  }

  /**
   * Adds an HTTP method to the allowed methods.
   *
   * `undefined` represents all methods during registration.
   *
   * @param {HTTPMethod|undefined} method - The HTTP method to allow.
   * @example
   * ```js
   * middleware.add('GET');
   * middleware.add('POST');
   * ```
   */
  add(method) {
    this.#methods.add(method);
    this.#methodsCache = null;
  }

  /**
   * Handles an OPTIONS request and terminates the exchange.
   *
   * @param {Exchange} exchange - The current exchange.
   * @param {Function} _next - The unused continuation function.
   * @example
   * ```js
   * const middleware = new OptionsMiddleware();
   * middleware.add('GET');
   * middleware.add('POST');
   * middleware.handle(exchange, next);
   *
   * // Response:
   * // 204 No Content
   * // Allow: GET, POST
   * // Access-Control-Allow-Methods: GET, POST
   * ```
   */
  handle(exchange, _next) {
    exchange.response
      .status(204)
      .setHeader('Allow', this.methods)
      .setHeader('Access-Control-Allow-Methods', this.methods)
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .end();
  }

  /**
   * The HTTP methods supported by the server.
   *
   * @type {Readonly<Array<HTTPMethod>>}
   */
  static #METHODS = Object.freeze([
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
    'QUERY',
    'TRACE',
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default OptionsMiddleware;

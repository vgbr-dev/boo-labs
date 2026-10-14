// @ts-check
/**
 * @file Defines a route grouped by pathname pattern.
 *
 * @description Stores middleware registered for a pathname pattern, grouped by
 * HTTP method. Middleware registered with `all()` applies to every method
 * registered for the route.
 *
 * When `compose()` is called, the route returns its middleware as exchange
 * layer options.
 *
 * @module Route
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
 * @typedef {'GET'|'HEAD'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'QUERY'|'TRACE'} HTTPMethod
 */

/**
 * Represents a function that delegates execution to the next middleware layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {(exchange: Exchange, next: NextFunction) => void | Promise<void>} MiddlewareFunction
 */

/**
 * Represents the options used to create an exchange layer.
 *
 * @typedef  {object}             ExchangeLayerOptions
 * @property {HTTPMethod}         method               - HTTP method to match. When undefined, any HTTP method is accepted.
 * @property {string}             pathnamePattern      - URL pathname pattern to match. When undefined, any pathname is accepted.
 * @property {MiddlewareFunction} middleware           - Middleware executed when the exchange matches the layer criteria.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Groups middleware definitions by pathname pattern.
 *
 * A route can contain middleware that applies to all registered methods and
 * middleware specific to individual HTTP methods.
 *
 * @classdesc `Route` stores middleware for a single pathname pattern and
 * composes the registered middleware into exchange layer options.
 * */
class Route {
  /**
   * Stores the pathname pattern associated with the route.
   *
   * @type {string}
   */
  #pathnamePattern;

  /**
   * Stores middleware applied to all registered methods.
   *
   * @type {MiddlewareFunction[]}
   */
  #all = [];

  /**
   * Stores middleware grouped by HTTP method.
   *
   * @type {Map<HTTPMethod, MiddlewareFunction[]>}
   */
  #methods = new Map();

  /**
   * Creates a route for a pathname pattern.
   *
   * @param {string} pathnamePattern - The pathname pattern associated with the route.
   * @example
   * ```js
   * const route = new Route('/users');
   * ```
   */
  constructor(pathnamePattern) {
    this.#pathnamePattern = pathnamePattern;
  }

  /**
   * Lists the HTTP methods registered for the route.
   *
   * @type {HTTPMethod[]}
   */
  get methods() {
    return [...this.#methods.keys()];
  }

  /**
   * Registers middleware applied to all methods in the route.
   *
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for all registered methods.
   * @example
   * ```js
   * route.all(authenticate);
   * ```
   */
  all(...middlewares) {
    this.#all.push(...middlewares);
  }

  /**
   * Registers middleware for a specific HTTP method.
   *
   * @param {HTTPMethod} method - The HTTP method.
   * @param {MiddlewareFunction[]} middlewares - The middleware functions to execute for the method.
   * @example
   * ```js
   * route.add('GET', [getUsers]);
   * ```
   */
  add(method, middlewares) {
    this.#methods.set(method, middlewares);
  }

  /**
   * Composes the registered middleware into exchange layer options.
   *
   * Middleware registered with `all()` is emitted before middleware specific
   * to each HTTP method.
   *
   * @returns {ExchangeLayerOptions[]} The exchange layer options.
   * @example
   * ```js
   * route.add('GET', [getUsers]);
   * route.add('POST', [createUser]);
   *
   * const definitions = route.compose();
   * ```
   */
  compose() {
    return this.methods.flatMap(method => [
      ...this.#getAll(method),
      ...this.#getMethodMiddlewares(method),
    ]);
  }

  /**
   * Builds exchange layer options for middleware registered with `all()`.
   *
   * @param {HTTPMethod} method - The HTTP method the options are emitted for.
   * @returns {ExchangeLayerOptions[]} The exchange layer options for all-method middleware.
   */
  #getAll(method) {
    return this.#all.map(middleware => ({
      method,
      pathnamePattern: this.#pathnamePattern,
      middleware,
    }));
  }

  /**
   * Builds exchange layer options for middleware registered for a specific method.
   *
   * @param {HTTPMethod} method - The HTTP method whose options are emitted.
   * @returns {ExchangeLayerOptions[]} The exchange layer options for the method.
   */
  #getMethodMiddlewares(method) {
    const methodMiddlewares = this.#methods.get(method) ?? [];

    return methodMiddlewares.map(middleware => ({
      method,
      pathnamePattern: this.#pathnamePattern,
      middleware,
    }));
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Route;

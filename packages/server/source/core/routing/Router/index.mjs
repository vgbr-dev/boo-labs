// @ts-check
/**
 * @file Defines the HTTP route builder.
 *
 * @description Provides a fluent interface for registering middleware functions
 * for HTTP methods and pathname patterns.
 *
 * Each instance maintains route definitions grouped by pathname pattern. A
 * pathname pattern can have one definition per HTTP method, and each definition
 * can contain multiple middleware functions.
 *
 * When `compose()` is called, the router returns the registered exchange layer
 * options.
 *
 * @module Router
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { ROUTER_BRAND } from '#shared/constants/symbols/brands';
import { assertPathnamePattern } from '#shared/validations/PathnamePattern';
import { assertMiddlewares } from '#shared/validations/Middleware';
import RouterError from '#shared/errors/RouterError';
import Route from './Route.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * This error type provides identifiable failures related to middleware validation.
 *
 * @typedef {import('#shared/errors/MiddlewareError').default} MiddlewareError
 */

/**
 * This error type provides identifiable failures related to pathname pattern syntax and validation.
 *
 * @typedef {import('#shared/errors/PathnamePatternError').default} PathnamePatternError
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {import('#routing/ExchangeLayer').HTTPMethod} HTTPMethod
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#routing/ExchangeLayer').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Represents the options used to create an exchange layer.
 *
 * @typedef  {object}             ExchangeLayerOptions
 * @property {HTTPMethod}         method               - HTTP method to match.
 * @property {string}             pathnamePattern      - URL pathname pattern to match.
 * @property {MiddlewareFunction} middleware           - Middleware executed when the exchange matches the layer criteria.
 */

/**
 * Represents the result produced by composing a router.
 *
 * @typedef  {object}                 RouterComposition
 * @property {MiddlewareFunction[]}   middlewares       - Middleware applied to all routes.
 * @property {ExchangeLayerOptions[]} layersOptions     - Exchange layer options compiled from the registered routes.
 */
// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Defines HTTP middleware pipelines by pathname pattern and method.
 *
 * @classdesc `Router` provides a fluent API for registering middleware for HTTP
 * methods. Each pathname pattern can have one definition per HTTP method, and
 * multiple middleware functions can be registered for each definition.
 *
 * When `compose()` is called, the router returns the registered exchange layer
 * options.
 */
class Router {
  /**
   * Stores middleware applied to all routes in the router.
   *
   * @type {MiddlewareFunction[]}
   */
  #middlewares = [];

  /**
   * Stores routes grouped by pathname pattern.
   *
   * @type {Map<string, Route>}
   */
  #routes;

  /**
   * Stores registered methods and pathname patterns.
   *
   * @type {Set<string>}
   */
  #registrations;

  /**
   * Creates an instance of Router.
   *
   * @example
   * ```js
   * const router = new Router();
   *
   * router
   *   .get('/users', authenticate, getUsers)
   *   .post('/users', authenticate, createUser)
   *   .get('/posts/:postId', getPost);
   * ```
   */
  constructor() {
    this.#routes = new Map();
    this.#registrations = new Set();
  }

  /**
   * Identifies the object as a router.
   *
   * This branded property provides a stable way to recognize objects that
   * implement the router contract without depending on their concrete
   * implementation.
   *
   * @type {boolean}
   */
  get [ROUTER_BRAND]() {
    return true;
  }

  /**
   * Registers middleware for all routes in the router.
   *
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for all routes.
   * @returns {Router} The router instance.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router
   *   .use(authenticate)
   *   .get('/users', getUsers)
   *   .post('/users', createUser);
   * ```
   */
  use(...middlewares) {
    this.#assertMiddlewares(middlewares);
    this.#middlewares.push(...middlewares);
    return this;
  }

  /**
   * Registers middleware for all HTTP methods.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for all matching HTTP requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If middleware has already been registered for the pathname pattern with `all()`.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router
   *   .all('/users', authenticate)
   *   .get('/users', getUsers)
   *   .post('/users', createUser);
   * ```
   */
  all(pathnamePattern, ...middlewares) {
    this.#addAll(pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for GET requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching GET requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If GET middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.get('/users', getUsers);
   * ```
   */
  get(pathnamePattern, ...middlewares) {
    this.#addRoute('GET', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for QUERY requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching QUERY requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If QUERY middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.query('/users', queryUsers);
   * ```
   */
  query(pathnamePattern, ...middlewares) {
    this.#addRoute('QUERY', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for POST requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching POST requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If POST middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.post('/users', createUser);
   * ```
   */
  post(pathnamePattern, ...middlewares) {
    this.#addRoute('POST', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for PUT requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching PUT requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If PUT middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.put('/users/:userId', updateUser);
   * ```
   */
  put(pathnamePattern, ...middlewares) {
    this.#addRoute('PUT', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for PATCH requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching PATCH requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If PATCH middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.patch('/users/:userId', patchUser);
   * ```
   */
  patch(pathnamePattern, ...middlewares) {
    this.#addRoute('PATCH', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for DELETE requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching DELETE requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If DELETE middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.delete('/users/:userId', deleteUser);
   * ```
   */
  delete(pathnamePattern, ...middlewares) {
    this.#addRoute('DELETE', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for HEAD requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching HEAD requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If HEAD middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.head('/users', checkUsers);
   * ```
   */
  head(pathnamePattern, ...middlewares) {
    this.#addRoute('HEAD', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Registers middleware for TRACE requests.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {...MiddlewareFunction} middlewares - The middleware functions to execute for matching TRACE requests.
   * @returns {Router} The router instance.
   * @throws {RouterError} If TRACE middleware has already been registered for the pathname pattern.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @example
   * ```js
   * router.trace('/debug', traceRequest);
   * ```
   */
  trace(pathnamePattern, ...middlewares) {
    this.#addRoute('TRACE', pathnamePattern, middlewares);
    return this;
  }

  /**
   * Composes the registered exchange layer options.
   *
   * @returns {RouterComposition} The composed router configuration.
   * @example
   * ```js
   * const router = new Router();
   *
   * router
   *   .get('/users', getUsers)
   *   .post('/users', createUser);
   *
   * const composition = router.compose();
   *
   * // composition.layerOptions includes:
   * // { method: 'GET', pathnamePattern: '/users', middleware: getUsers }
   * // { method: 'POST', pathnamePattern: '/users', middleware: createUser }
   * ```
   */
  compose() {
    const layersOptions = [...this.#routes.values()].flatMap(route => route.compose());
    const middlewares = [...this.#middlewares];
    return {
      middlewares,
      layersOptions,
    };
  }

  /**
   * Registers middleware for all HTTP methods on a pathname pattern.
   *
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {MiddlewareFunction[]} middlewares - The middleware functions to register.
   * @throws {PathnamePatternError} If the pathname pattern is invalid.
   * @throws {MiddlewareError} If a middleware is invalid.
   * @throws {RouterError} If middleware has already been registered for the pathname pattern with `all()`.
   */
  #addAll(pathnamePattern, middlewares) {
    this.#assertPathnamePattern(pathnamePattern);
    this.#assertMiddlewares(middlewares);
    this.#ensureRegistration(undefined, pathnamePattern);

    const route = this.#routes.get(pathnamePattern);

    if (route) {
      route.all(...middlewares);
    } else {
      this.#createRoute(pathnamePattern).all(...middlewares);
    }
  }

  /**
   * Registers middleware for a specific HTTP method and pathname pattern.
   *
   * Prevents duplicate method and pathname pattern registrations and groups
   * middleware by pathname pattern.
   *
   * @param {HTTPMethod} method - The HTTP method.
   * @param {string} pathnamePattern - The pathname pattern to match.
   * @param {MiddlewareFunction[]} middlewares - The middleware functions to register.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   * @throws {RouterError} If the method is already registered for the pathname pattern.
   */
  #addRoute(method, pathnamePattern, middlewares) {
    this.#assertPathnamePattern(pathnamePattern);
    this.#assertMiddlewares(middlewares);
    this.#ensureRegistration(method, pathnamePattern);

    const route = this.#routes.get(pathnamePattern);

    if (route) {
      route.add(method, middlewares);
    } else {
      this.#createRoute(pathnamePattern).add(method, middlewares);
    }
  }

  /**
   * Creates and stores a route for a pathname pattern.
   *
   * @param {string} pathnamePattern - The pathname pattern to associate with the route.
   * @returns {Route} The created route.
   */
  #createRoute(pathnamePattern) {
    const route = new Route(pathnamePattern);
    this.#routes.set(pathnamePattern, route);
    return route;
  }

  /**
   * Ensures that a registration is unique for a pathname pattern.
   *
   * @param {string|undefined} method - The HTTP method, or `undefined` for an `all()` registration.
   * @param {string} pathnamePattern - The pathname pattern to register.
   * @throws {RouterError} If the registration already exists.
   */
  #ensureRegistration(method, pathnamePattern) {
    const key = `${method}:${pathnamePattern}`;

    if (this.#registrations.has(key)) {
      if (method === undefined) {
        throw new RouterError('DUPLICATE_ALL_METHOD', { values: { pathnamePattern } });
      }

      throw new RouterError('DUPLICATE_ROUTE', { values: { method, pathnamePattern } });
    }

    this.#registrations.add(key);
  }

  /**
   * Validates a pathname pattern.
   *
   * @param {unknown} value - The pathname pattern to validate.
   * @throws {PathnamePatternError} If the pathname pattern is not a string.
   * @throws {PathnamePatternError} If the pathname pattern is empty.
   * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
   * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
   * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
   */
  #assertPathnamePattern(value) {
    assertPathnamePattern(value);
  }

  /**
   * Validates middleware functions.
   *
   * A middleware must be a function that declares exactly two parameters:
   * `exchange` and `next`.
   *
   * @param {unknown} value - The middleware functions to validate.
   * @throws {MiddlewareError} If a middleware is not a function.
   * @throws {MiddlewareError} If a middleware does not declare exactly two parameters.
   */
  #assertMiddlewares(value) {
    assertMiddlewares(value);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Router;

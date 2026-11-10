// @ts-check
/**
 * @file Provides the routing system for route registration and execution.
 *
 * @module RouterSystem
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Pipeline from '#routing/Pipeline';
import RouteRegister from '#routing/RouterRegister';
import ExchangeLayer from '#routing/ExchangeLayer';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Defines HTTP middleware pipelines by pathname pattern and method.
 *
 * @typedef {import('#routing/Router').default} Router
 */

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#routing/ExchangeLayer').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Represents the fallback handler invoked when no layer resolves the exchange.
 *
 * @typedef {import('#routing/Pipeline').NotFoundHandler} NotFoundHandler
 */

/**
 * Collection of route registrations.
 *
 * @typedef {import('#routing/RouterRegister').RouteRegistrations} RouteRegistrations
 */

/**
 * Defines the criteria and middleware used by an exchange layer.
 *
 * @typedef {import('#routing/ExchangeLayer').ExchangeLayerOptions} ExchangeLayerOptions
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {import('#routing/ExchangeLayer').HTTPMethod} HTTPMethod
 */

/**
 * Collection of layer options.
 *
 * @typedef {ExchangeLayerOptions[]} ExchangeLayersOptions
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Joins a mount base pathname with a child route pathname pattern.
 *
 * Avoids the naive string concatenation that turns
 * `/api/movements` + `/` into `/api/movements/`, which does not match
 * requests to `/api/movements` under `URLPattern`.
 *
 * @param {string} base - Mount base, e.g. `/api/movements`.
 * @param {string} path - Child pattern, e.g. `/` or `/:id`.
 * @returns {string} Combined pathname pattern.
 *
 * @example
 * ```js
 * joinPathnamePattern('/api/movements', '/');
 * // => '/api/movements'
 *
 * joinPathnamePattern('/api/movements', '/:id');
 * // => '/api/movements/:id'
 *
 * joinPathnamePattern('/api/movements/', '/');
 * // => '/api/movements'
 * ```
 */
function joinPathnamePattern(base, path) {
  // Child root of the mount: keep the base without a trailing slash.
  if (path === '/') {
    if (base === '/') {
      return '/';
    }

    return base.replace(/\/+$/, '') || '/';
  }

  const normalizedBase = base === '/' ? '' : base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Builds the pathname pattern used for router-level middleware after a mount.
 *
 * Matches the exact base and any subpath under it.
 *
 * @param {string} base - Mount base pathname pattern.
 * @returns {string} Pattern with an optional trailing path segment group.
 *
 * @example
 * ```js
 * mountMiddlewarePattern('/api/movements');
 * // => '/api/movements{/*}?'
 *
 * mountMiddlewarePattern('/');
 * // => '{/*}?'
 * ```
 */
function mountMiddlewarePattern(base) {
  const normalizedBase = base === '/' ? '' : base.replace(/\/+$/, '');

  if (normalizedBase === '') {
    return '{/*}?';
  }

  return `${normalizedBase}{/*}?`;
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Coordinates route registration and layer execution.
 *
 * @classdesc `RouterSystem` maintains the routing pipeline and translates
 * route registrations and layer options into executable exchange layers.
 */
class RouterSystem {
  /**
   * Pipeline containing the executable exchange layers.
   *
   * @type {Pipeline}
   */
  #pipeline = new Pipeline();

  /**
   * Route register used to maintain registered routes and compose automatic
   * OPTIONS layer options.
   *
   * @type {RouteRegister}
   */
  #routes = new RouteRegister();

  /**
   * Registers multiple exchange layers from layer options.
   *
   * @param {ExchangeLayersOptions} layersOptions - The layer options used to create
   * executable exchange layers.
   * @example
   * ```js
   * routerSystem.registerLayerOptionsBatch([
   *   { method: undefined, pathnamePattern: '/api', middleware: middleware },
   * ]);
   * ```
   */
  registerLayerOptionsBatch(layersOptions) {
    this.#registerLayerBatch(layersOptions);
  }

  /**
   * Registers a route entry by transforming method, pathname pattern, and middlewares
   * into executable exchange layers and route registrations.
   *
   * @param {HTTPMethod|undefined} method - The HTTP method to match.
   * @param {string|undefined} pathnamePattern - The URL pathname pattern to match.
   * @param {MiddlewareFunction[]} middlewares - The middleware functions to execute.
   * @example
   * ```js
   * routerSystem.registerRouteEntry('GET', '/users', [authenticate, getUsers]);
   * ```
   */
  registerRouteEntry(method, pathnamePattern, middlewares) {
    const layersOptions = middlewares.map(middleware => ({
      method,
      pathnamePattern,
      middleware,
    }));

    /** @type {RouteRegistrations} */
    const routes = layersOptions.map(layerOptions => [
      layerOptions.method,
      layerOptions.pathnamePattern,
    ]);

    this.#registerRouteBatch(routes);
    this.#registerLayerBatch(layersOptions);
  }

  /**
   * Registers a mounted router by prefixing its routes and middlewares with a base pathname pattern.
   *
   * Child route `/` is mapped to the exact base (no trailing slash). Nested
   * patterns such as `/:id` are joined as `${base}/:id`.
   *
   * @param {string} basePathnamePattern - The base URL pathname pattern to prefix.
   * @param {Router} router - The router instance to mount (must implement a `compose()` method).
   * @example
   * ```js
   * const userRouter = new Router();
   * userRouter.get('/', getUsers);
   * userRouter.get('/:id', getUser);
   * routerSystem.registerMountEntry('/api/users', userRouter);
   * // GET /api/users     → getUsers
   * // GET /api/users/42  → getUser
   * ```
   */
  registerMountEntry(basePathnamePattern, router) {
    const { middlewares, layersOptions } = router.compose();

    const mountedMiddlewares = middlewares.map(middleware => ({
      method: undefined,
      pathnamePattern: mountMiddlewarePattern(basePathnamePattern),
      middleware,
    }));

    const mountedLayers = layersOptions.map(({ method, pathnamePattern, middleware }) => ({
      method,
      pathnamePattern: joinPathnamePattern(basePathnamePattern, pathnamePattern),
      middleware,
    }));

    /** @type {RouteRegistrations} */
    const routes = mountedLayers.map(({ method, pathnamePattern }) => [method, pathnamePattern]);

    this.#registerRouteBatch(routes);
    this.#registerLayerBatch([...mountedMiddlewares, ...mountedLayers]);
  }

  /**
   * Executes the routing pipeline for an exchange.
   *
   * @param {Exchange} exchange - The exchange to process.
   * @param {NotFoundHandler} notFoundHandler - The fallback async function to execute if no layer resolves the exchange.
   * @returns {Promise<void>} A promise fulfilled when routing execution completes.
   * @example
   * ```js
   * await routerSystem.executePipeline(exchange, async (exc) => {
   *   exc.response.status(404).json({ error: 'Not Found' });
   * });
   * ```
   */
  executePipeline(exchange, notFoundHandler) {
    return this.#pipeline.execute(exchange, notFoundHandler);
  }

  /**
   * Registers multiple routes and adds their automatic OPTIONS layers to
   * the routing pipeline.
   *
   * @param {RouteRegistrations} routes - The route registrations to add.
   * @example
   * ```js
   * routerSystem.registerRouteBatch([
   *   ['GET', '/users'],
   *   ['POST', '/users'],
   * ]);
   * ```
   */
  #registerRouteBatch(routes) {
    const layersOptions = this.#routes.registerBatch(routes);

    const layers = layersOptions.map(layerOptions => new ExchangeLayer(layerOptions));

    this.#pipeline.addBatch(layers);
  }

  /**
   * Registers multiple `ExchangeLayer` instances created from the provided layer
   * options and adds them to the routing pipeline.
   *
   * @param {ExchangeLayersOptions} layersOptions - The layer options used to create the `ExchangeLayer` instances.
   * @example
   * ```js
   * routerSystem.registerLayerBatch([
   *   { method: 'GET', pathnamePattern: '/users', middleware: getUsers },
   *   { method: 'POST', pathnamePattern: '/users', middleware: createUser },
   * ]);
   * ```
   */
  #registerLayerBatch(layersOptions) {
    const layers = layersOptions.map(layerOptions => new ExchangeLayer(layerOptions));

    this.#pipeline.addBatch(layers);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RouterSystem;

// @ts-check
/**
 * @file Defines the exchange layer builder.
 *
 * @description Builds exchange layer definitions from middleware options.
 *
 * @module ExchangeLayerBuilder
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import StaticMiddleware from '#middlewares/StaticMiddleware';
import CORSMiddleware from '#middlewares/CORSMiddleware';
import RateLimitMiddleware from '#middlewares/RateLimitMiddleware';
import SecurityHeadersMiddleware from '#middlewares/SecurityHeadersMiddleware';
import CookieParserMiddleware from '#middlewares/CookieParserMiddleware';
import CookieSessionMiddleware from '#middlewares/CookieSessionMiddleware';
import CSRFMiddleware from '#middlewares/CSRFMiddleware';
import CompressMiddleware from '#middlewares/CompressMiddleware';

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

/**
 * Represents an exchange middleware function.
 *
 * @typedef {import('#routing/ExchangeLayer').MiddlewareFunction} MiddlewareFunction
 */

/**
 * Defines the criteria and middleware used by an exchange layer.
 *
 * @typedef {import('#routing/ExchangeLayer').ExchangeLayerOptions} ExchangeLayerOptions
 */

/**
 * Represents middleware options used to build an exchange layer.
 *
 * @typedef  {object}               MiddlewareOptions
 * @property {string}               name              - Middleware name.
 * @property {string|undefined}     pathnamePattern   - URL pathname pattern to match.
 * @property {HTTPMethod|undefined} method            - HTTP method to match.
 * @property {unknown}              options           - Middleware configuration options.
 */

/**
 * Represents a middleware constructor.
 *
 * @typedef {new (options: any) => {handle: MiddlewareFunction}} MiddlewareConstructor
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Builds exchange layer definitions from middleware options.
 *
 * @class
 */
class ExchangeLayerBuilder {
  /**
   * Prevents direct instantiation of the builder.
   *
   * @abstract
   * @throws {Error} Always thrown because `ExchangeLayerBuilder` exposes only static behavior.
   */
  constructor() {
    throw new Error('ExchangeLayerBuilder is a static class and cannot be instantiated');
  }

  /**
   * Builds exchange layer definitions from middleware options.
   *
   * @param {MiddlewareOptions[]} middlewareOptions - Middleware options to build.
   * @returns {ExchangeLayerOptions[]} The resulting exchange layer definitions.
   * @throws {Error} When the middleware is not supported.
   * @example
   * ```js
   * const layers = ExchangeLayerBuilder.build(middlewareOptions);
   * ```
   */
  static build(middlewareOptions) {
    return middlewareOptions.map(({ name, options, pathnamePattern, method }) => {
      const Middleware = ExchangeLayerBuilder.#middlewares.get(name);

      if (!Middleware) {
        throw new Error(`Unsupported middleware: ${name}`);
      }

      const middleware = new Middleware(options);

      return {
        method,
        pathnamePattern,
        middleware: middleware.handle.bind(middleware),
      };
    });
  }

  /**
   * Middleware constructors supported by the builder.
   *
   * @type {Array<[string, MiddlewareConstructor]>}
   */
  static #MIDDLEWARES = [
    ['cors', CORSMiddleware],
    ['static', StaticMiddleware],
    ['rateLimit', RateLimitMiddleware],
    ['securityHeaders', SecurityHeadersMiddleware],
    ['cookieParser', CookieParserMiddleware],
    ['cookieSession', CookieSessionMiddleware],
    ['csrf', CSRFMiddleware],
    ['compress', CompressMiddleware],
  ];

  /**
   * Middleware constructors indexed by middleware name.
   *
   * @type {Map<string, MiddlewareConstructor>}
   */
  static #middlewares = new Map(ExchangeLayerBuilder.#MIDDLEWARES);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ExchangeLayerBuilder;

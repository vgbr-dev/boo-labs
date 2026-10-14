// @ts-check
/**
 * @file Defines the route register.
 *
 * @description Maintains route registrations and builds automatic OPTIONS
 * middleware for each pathname pattern.
 *
 * @module RouteRegister
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import OptionsMiddleware from './OptionsMiddleware.mjs';

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
 * Route registration containing an optional HTTP method and pathname pattern.
 *
 * @typedef {[HTTPMethod|undefined, string|undefined]} RouteRegistration
 */

/**
 * Collection of route registrations.
 *
 * @typedef {RouteRegistration[]} RouteRegistrations
 */

/**
 * Represents the options used to create an exchange layer.
 *
 * @typedef  {object}             ExchangeLayerOptions
 * @property {'OPTIONS'}          method               - HTTP method to match for the automatic OPTIONS layer.
 * @property {string}             pathnamePattern      - URL pathname pattern to match.
 * @property {MiddlewareFunction} middleware           - Middleware executed when the exchange matches the layer criteria.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maintains registered routes and their automatic OPTIONS middleware.
 *
 * @classdesc `RouteRegister` groups registered HTTP methods by pathname pattern
 * and creates an OPTIONS route for each new pathname pattern.
 */
class RouteRegister {
  /**
   * OPTIONS middleware keyed by pathname pattern.
   *
   * @type {Map<string, OptionsMiddleware>}
   */
  #middlewares = new Map();

  /**
   * Registers a route by its HTTP method and pathname pattern.
   *
   * On the first registration of a pathname pattern, creates an
   * `OptionsMiddleware` and returns the OPTIONS layer options. On later
   * registrations of the same pattern, only adds the method to the existing
   * middleware and returns `undefined`.
   *
   * @param {RouteRegistration} registration - The route registration to add.
   * @returns {ExchangeLayerOptions|undefined} The OPTIONS layer options when the pathname pattern is new; otherwise `undefined`.
   * @example
   * ```js
   * register(['GET', '/users']);
   * // → { method: 'OPTIONS', pathnamePattern: '/users', middleware: handle }
   *
   * register(['POST', '/users']);
   * // → undefined (methods updated)
   * ```
   */
  register([method, pathnamePattern]) {
    if (pathnamePattern === undefined) {
      return undefined;
    }

    const optionsMiddleware = this.#middlewares.get(pathnamePattern);

    if (optionsMiddleware !== undefined) {
      optionsMiddleware.add(method);
      return undefined;
    }

    const middleware = new OptionsMiddleware();
    middleware.add(method);
    this.#middlewares.set(pathnamePattern, middleware);
    return {
      method: 'OPTIONS',
      pathnamePattern,
      middleware: middleware.handle,
    };
  }

  /**
   * Registers multiple routes.
   *
   * Only the first registration of each pathname pattern contributes an OPTIONS
   * layer. Later registrations for the same pattern update the existing
   * middleware and are omitted from the result.
   *
   * @param {RouteRegistrations} registrations - The route registrations to add.
   * @returns {ExchangeLayerOptions[]} The new OPTIONS layer options.
   * @example
   * ```js
   * registerBatch([
   *   ['GET', '/users'],
   *   ['POST', '/users'],
   *   ['GET', '/posts'],
   * ]);
   * // → [
   * //   { method: 'OPTIONS', pathnamePattern: '/users', middleware: handle },
   * //   { method: 'OPTIONS', pathnamePattern: '/posts', middleware: handle },
   * // ]
   * ```
   */
  registerBatch(registrations) {
    /** @type {ExchangeLayerOptions[]} */
    const options = [];

    for (const registration of registrations) {
      const layerOptions = this.register(registration);

      if (layerOptions !== undefined) {
        options.push(layerOptions);
      }
    }

    return options;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RouteRegister;

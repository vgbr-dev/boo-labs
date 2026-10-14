// @ts-check
/**
 * @file Defines the abstract base for middleware configuration options.
 *
 * @description MiddlewareOption identifies configuration options that
 * represent middlewares (cors, static, securityHeaders, rateLimit).
 *
 * @module MiddlewareOption
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Options from './Options.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a router HTTP method supported by the routing layer.
 *
 * @typedef {'GET'|'HEAD'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'QUERY'|'TRACE'} HTTPMethod
 */
/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef  {object}                            MiddlewareConfiguration
 * @property {string}                            name                    - Middleware name.
 * @property {Record<string, unknown>|undefined} options                 - Middleware configuration options.
 * @property {string|undefined}                  pathnamePattern         - URL pathname pattern to match.
 * @property {HTTPMethod|undefined}              method                  - HTTP method to match.
 */

/**
 * Represents a value object wrapping a normalized configuration value.
 *
 * @template {Record<string, unknown>|undefined} TValue
 * @typedef {import('./Options.mjs').ValueObject<TValue>} ValueObject
 */
// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Abstract base class for middleware configuration options.
 *
 * @abstract
 * @template {Record<string, unknown>|undefined} TValue
 * @augments Options<TValue>
 */
class MiddlewareOption extends Options {
  /**
   * Creates a server middleware configuration option instance.
   *
   * @abstract
   * @param {string} name - Option name.
   * @param {ValueObject<TValue>} value - Normalized option value.
   * @throws {TypeError} If MiddlewareOption is instantiated directly.
   */
  constructor(name, value) {
    if (new.target === MiddlewareOption) {
      throw new TypeError('MiddlewareOption is an abstract class and cannot be instantiated');
    }

    super('middleware', name, value.value);
  }

  /**
   * The URL pathname pattern the middleware is scoped to.
   *
   * Defaults to `undefined`, meaning the middleware applies to all paths.
   *
   * @readonly
   * @type {string|undefined}
   */
  get pathnamePattern() {
    return undefined;
  }

  /**
   * The HTTP method the middleware is scoped to.
   *
   * Defaults to `undefined`, meaning the middleware applies to all methods.
   *
   * @readonly
   * @type {HTTPMethod|undefined}
   */
  get method() {
    return undefined;
  }

  /**
   * Composes the middleware configuration consumed by the exchange layer
   * builder.
   *
   * Subclasses must implement this method.
   *
   * @abstract
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @throws {TypeError} If the subclass does not implement `compose`.
   */
  compose() {
    throw new TypeError('MiddlewareOption.compose must be implemented by subclasses');
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MiddlewareOption;

// @ts-check
/**
 * @file Defines the CookieSessionOptions middleware configuration option.
 *
 * @description CookieSessionOptions wraps a normalized
 * CookieSessionOptionsValue into the middleware configuration option
 * hierarchy.
 *
 * @module CookieSessionOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import CookieSessionOptionsValue from './CookieSessionOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the cookie session options accepted by the server configuration.
 *
 * @typedef {import('./CookieSessionOptionsValue.mjs').CookieSessionOptionsInput} CookieSessionOptionsInput
 */

/**
 * Represents the normalized cookie session options.
 *
 * @typedef {import('./CookieSessionOptionsValue.mjs').CookieSessionOptionsData} CookieSessionOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized cookie session
 * configuration.
 *
 * @augments {MiddlewareOption<CookieSessionOptionsData|undefined>}
 */
class CookieSessionOptions extends MiddlewareOption {
  /**
   * Creates a new {@link CookieSessionOptions}.
   *
   * @param {CookieSessionOptionsInput} [options] - The cookie session middleware options.
   * @param {boolean} [hasParser] - Whether a cookie parser is configured.
   * @example
   * ```js
   * const cookieSessionOptions = new CookieSessionOptions(
   *   { keys: ['current-secret'] },
   *   true,
   * );
   * ```
   */
  constructor(options, hasParser) {
    super('cookieSession', new CookieSessionOptionsValue(options, hasParser));
  }

  /**
   * Composes the cookie session middleware configuration consumed by the
   * exchange layer builder.
   *
   * Cookie session is a cross-cutting concern applied to every request
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = cookieSessionOptions.compose();
   * ```
   */
  compose() {
    return {
      name: this.name,
      options: this.value,
      pathnamePattern: undefined,
      method: undefined,
    };
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CookieSessionOptions;

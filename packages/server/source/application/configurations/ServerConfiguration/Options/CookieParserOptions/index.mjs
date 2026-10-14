// @ts-check
/**
 * @file Defines the CookieParserOptions middleware configuration option.
 *
 * @description CookieParserOptions wraps a normalized
 * CookieParserOptionsValue into the middleware configuration option
 * hierarchy.
 *
 * @module CookieParserOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import CookieParserOptionsValue from './CookieParserOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the cookie parser options accepted by the server configuration.
 *
 * @typedef {import('./CookieParserOptionsValue.mjs').CookieParserOptionsInput} CookieParserOptionsInput
 */

/**
 * Represents the normalized cookie parser options.
 *
 * @typedef {import('./CookieParserOptionsValue.mjs').CookieParserOptionsData} CookieParserOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized cookie parser
 * configuration.
 *
 * @augments {MiddlewareOption<CookieParserOptionsData|undefined>}
 */
class CookieParserOptions extends MiddlewareOption {
  /**
   * Creates a new {@link CookieParserOptions}.
   *
   * @param {CookieParserOptionsInput} [options] - The cookie parser middleware options.
   * @example
   * ```js
   * const cookieParserOptions = new CookieParserOptions({ decode: true });
   * ```
   */
  constructor(options) {
    super('cookieParser', new CookieParserOptionsValue(options));
  }

  /**
   * Composes the cookie parser middleware configuration consumed by the
   * exchange layer builder.
   *
   * Cookie parsing is a cross-cutting concern applied to every request
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = cookieParserOptions.compose();
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
export default CookieParserOptions;

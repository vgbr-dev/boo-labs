// @ts-check
/**
 * @file Defines the CookieParserOptionsValue value object.
 *
 * @description Normalizes and validates cookie parser middleware
 * configuration used by CookieParserMiddleware. When options are omitted,
 * the value is undefined and the middleware is not registered.
 *
 * @module CookieParserOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertCookieParserOptions } from '#shared/validations/ServerConfiguration/CookieParserOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the cookie parser options accepted by the server configuration.
 *
 * @typedef  {object}  CookieParserOptionsInput
 * @property {boolean} [decode]                 - Whether cookie values are decoded with `decodeURIComponent`.
 */

/**
 * Represents the normalized cookie parser options.
 *
 * @typedef  {object}  CookieParserOptionsData
 * @property {boolean} decode                  - Whether cookie values are decoded with `decodeURIComponent`.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default URI-decoding behavior for cookie values.
 *
 * @type {boolean}
 */
const DEFAULT_DECODE = true;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized cookie parser middleware
 * options.
 *
 * @classdesc Validates and normalizes cookie parser middleware options. When
 * options are provided, defaults are applied for any omitted property. When
 * options are omitted, the value is undefined.
 *
 * @example
 * ```js
 * const options = new CookieParserOptionsValue({ decode: false });
 *
 * options.value;
 * // => { decode: false }
 * ```
 *
 * @example
 * ```js
 * const options = new CookieParserOptionsValue();
 *
 * options.value;
 * // => undefined
 * ```
 */
class CookieParserOptionsValue {
  /**
   * The normalized cookie parser options.
   *
   * @type {Readonly<CookieParserOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link CookieParserOptionsValue}.
   *
   * @param {CookieParserOptionsInput} [options] - The cookie parser middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   */
  constructor(options) {
    assertCookieParserOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            decode: options.decode ?? DEFAULT_DECODE,
          });
  }

  /**
   * The normalized cookie parser options.
   *
   * @readonly
   * @type {Readonly<CookieParserOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CookieParserOptionsValue;

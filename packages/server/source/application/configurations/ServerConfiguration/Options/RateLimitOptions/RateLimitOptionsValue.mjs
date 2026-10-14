// @ts-check
/**
 * @file Defines the RateLimitOptionsValue value object.
 *
 * @description Normalizes and validates rate limit middleware configuration
 * used by RateLimitMiddleware. When options are omitted, the value is
 * undefined and the middleware is not registered.
 *
 * @module RateLimitOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertRateLimitOptions } from '#shared/validations/ServerConfiguration/RateLimitOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the rate limit options accepted by the server configuration.
 *
 * @typedef  {object}                  RateLimitOptionsInput
 * @property {number}                  [windowMs]            - Duration of the rate-limit window in milliseconds.
 * @property {number}                  [max]                 - Maximum number of requests allowed per window per client.
 * @property {number}                  [statusCode]          - HTTP status code returned when the limit is exceeded.
 * @property {Record<string, unknown>} [message]             - JSON body sent when the limit is exceeded.
 * @property {boolean}                 [standardHeaders]     - Whether to send the modern `RateLimit-*` headers.
 * @property {boolean}                 [legacyHeaders]       - Whether to send the legacy `X-RateLimit-*` headers.
 */

/**
 * Represents the normalized rate limit options.
 *
 * @typedef  {object}                            RateLimitOptionsData
 * @property {number}                            windowMs             - Duration of the rate-limit window in milliseconds.
 * @property {number}                            max                  - Maximum number of requests allowed per window per client.
 * @property {number}                            statusCode           - HTTP status code returned when the limit is exceeded.
 * @property {Readonly<Record<string, unknown>>} message              - JSON body sent when the limit is exceeded.
 * @property {boolean}                           standardHeaders      - Whether to send the modern `RateLimit-*` headers.
 * @property {boolean}                           legacyHeaders        - Whether to send the legacy `X-RateLimit-*` headers.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default duration of the rate-limit window in milliseconds.
 *
 * @type {number}
 */
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Default maximum number of requests allowed per window per client.
 *
 * @type {number}
 */
const DEFAULT_MAX = 100;

/**
 * Default HTTP status code returned when the limit is exceeded.
 *
 * @type {number}
 */
const DEFAULT_STATUS_CODE = 429;

/**
 * Default JSON body sent when the limit is exceeded.
 *
 * @type {Readonly<Record<string, unknown>>}
 */
const DEFAULT_MESSAGE = Object.freeze({ error: 'Too Many Requests' });

/**
 * Default behavior for modern `RateLimit-*` headers.
 *
 * @type {boolean}
 */
const DEFAULT_STANDARD_HEADERS = true;

/**
 * Default behavior for legacy `X-RateLimit-*` headers.
 *
 * @type {boolean}
 */
const DEFAULT_LEGACY_HEADERS = false;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized rate limit middleware
 * options.
 *
 * @classdesc Validates and normalizes rate limit middleware options. When
 * options are provided, defaults are applied for any omitted property. When
 * options are omitted, the value is undefined.
 *
 * @example
 * ```js
 * const options = new RateLimitOptionsValue({ windowMs: 60_000, max: 100 });
 *
 * options.value;
 * // => {
 * //   windowMs: 60_000,
 * //   max: 100,
 * //   statusCode: 429,
 * //   message: { error: 'Too Many Requests' },
 * //   standardHeaders: true,
 * //   legacyHeaders: false,
 * // }
 * ```
 *
 * @example
 * ```js
 * const options = new RateLimitOptionsValue();
 *
 * options.value;
 * // => undefined
 * ```
 */
class RateLimitOptionsValue {
  /**
   * The normalized rate limit options.
   *
   * @type {Readonly<RateLimitOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link RateLimitOptionsValue}.
   *
   * @param {RateLimitOptionsInput} [options] - The rate limit middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   */
  constructor(options) {
    assertRateLimitOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
            max: options.max ?? DEFAULT_MAX,
            statusCode: options.statusCode ?? DEFAULT_STATUS_CODE,
            message: Object.freeze({ ...(options.message ?? DEFAULT_MESSAGE) }),
            standardHeaders: options.standardHeaders ?? DEFAULT_STANDARD_HEADERS,
            legacyHeaders: options.legacyHeaders ?? DEFAULT_LEGACY_HEADERS,
          });
  }

  /**
   * The normalized rate limit options.
   *
   * @readonly
   * @type {Readonly<RateLimitOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RateLimitOptionsValue;

// @ts-check
/**
 * @file Defines the RateLimitOptions middleware configuration option.
 *
 * @description RateLimitOptions wraps a normalized RateLimitOptionsValue into
 * the middleware configuration option hierarchy.
 *
 * @module RateLimitOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import RateLimitOptionsValue from './RateLimitOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the rate limit options accepted by the server configuration.
 *
 * @typedef {import('./RateLimitOptionsValue.mjs').RateLimitOptionsInput} RateLimitOptionsInput
 */

/**
 * Represents the normalized rate limit options.
 *
 * @typedef {import('./RateLimitOptionsValue.mjs').RateLimitOptionsData} RateLimitOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized rate limit
 * configuration.
 *
 * @augments {MiddlewareOption<RateLimitOptionsData|undefined>}
 */
class RateLimitOptions extends MiddlewareOption {
  /**
   * Creates a new {@link RateLimitOptions}.
   *
   * @param {RateLimitOptionsInput} [options] - The rate limit middleware options.
   * @example
   * ```js
   * const rateLimitOptions = new RateLimitOptions({
   *   windowMs: 60_000,
   *   max: 100,
   * });
   * ```
   */
  constructor(options) {
    super('rateLimit', new RateLimitOptionsValue(options));
  }

  /**
   * Composes the rate limit middleware configuration consumed by the
   * exchange layer builder.
   *
   * Rate limiting is a cross-cutting concern applied to every request
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = rateLimitOptions.compose();
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
export default RateLimitOptions;

// @ts-check
/**
 * @file Defines the CompressOptions middleware configuration option.
 *
 * @description CompressOptions wraps a normalized CompressOptionsValue into
 * the middleware configuration option hierarchy.
 *
 * @module CompressOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import CompressOptionsValue from './CompressOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the compression options accepted by the server configuration.
 *
 * @typedef {import('./CompressOptionsValue.mjs').CompressOptionsInput} CompressOptionsInput
 */

/**
 * Represents the normalized compression options.
 *
 * @typedef {import('./CompressOptionsValue.mjs').CompressOptionsData} CompressOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized compression
 * configuration.
 *
 * @augments {MiddlewareOption<CompressOptionsData|undefined>}
 */
class CompressOptions extends MiddlewareOption {
  /**
   * Creates a new {@link CompressOptions}.
   *
   * @param {CompressOptionsInput} [options] - The compression middleware options.
   * @example
   * ```js
   * const compressOptions = new CompressOptions({ threshold: 1024, level: 6 });
   * ```
   */
  constructor(options) {
    super('compress', new CompressOptionsValue(options));
  }

  /**
   * Composes the compression middleware configuration consumed by the
   * exchange layer builder.
   *
   * Compression is a cross-cutting concern applied to every response
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = compressOptions.compose();
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
export default CompressOptions;

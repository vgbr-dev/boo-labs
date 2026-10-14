// @ts-check
/**
 * @file Defines the CORSOptions middleware configuration option.
 *
 * @description CORSOptions wraps a normalized CORSOptionsValue into the
 * middleware configuration option hierarchy.
 *
 * @module CORSOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import CORSOptionsValue from './CORSOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the CORS options accepted by the server configuration.
 *
 * @typedef {import('./CORSOptionsValue.mjs').CORSOptionsInput} CORSOptionsInput
 */

/**
 * Represents the normalized CORS options.
 *
 * @typedef {import('./CORSOptionsValue.mjs').CORSOptionsData} CORSOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized CORS configuration.
 *
 * @augments {MiddlewareOption<CORSOptionsData|undefined>}
 */
class CORSOptions extends MiddlewareOption {
  /**
   * Creates a new {@link CORSOptions}.
   *
   * @param {CORSOptionsInput} [options] - The CORS middleware options.
   * @example
   * ```js
   * const CORSOptions = new CORSOptions({
   *   origin: true,
   *   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
   *   credentials: true,
   *   maxAge: 86400,
   *   preflightContinue: false,
   *   optionsSuccessStatus: 204,
   * });
   * ```
   */
  constructor(options) {
    super('cors', new CORSOptionsValue(options));
  }

  /**
   * Composes the CORS middleware configuration consumed by the exchange
   * layer builder.
   *
   * CORS is a cross-cutting concern applied to every request regardless of
   * pathname or method, so both `pathnamePattern` and `method` are
   * `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = CORSOptions.compose();
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
export default CORSOptions;

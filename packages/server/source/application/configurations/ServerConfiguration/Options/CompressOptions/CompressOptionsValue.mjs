// @ts-check
/**
 * @file Defines the CompressOptionsValue value object.
 *
 * @description Normalizes and validates compression middleware configuration
 * used by CompressMiddleware. When options are omitted, the value is
 * undefined and the middleware is not registered.
 *
 * @module CompressOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertCompressOptions } from '#shared/validations/ServerConfiguration/CompressOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the compression options accepted by the server configuration.
 *
 * @typedef  {object}   CompressOptionsInput
 * @property {number}   [threshold]          - Minimum body size in bytes required to compress. Use `0` to compress any non-empty body.
 * @property {number}   [level]              - Compression level passed to the underlying zlib implementation.
 * @property {string[]} [types]              - Compressible media types. When omitted, the default allow-list is used.
 */

/**
 * Represents the normalized compression options.
 *
 * @typedef  {object}                       CompressOptionsData
 * @property {number}                       threshold           - Minimum body size in bytes required to compress. Use `0` to compress any non-empty body.
 * @property {number}                       level               - Compression level passed to the underlying zlib implementation.
 * @property {Readonly<string[]>|undefined} types               - Compressible media types. When `undefined`, the default allow-list is used.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default minimum body size in bytes required to compress.
 *
 * @type {number}
 */
const DEFAULT_THRESHOLD = 1024;

/**
 * Default compression level.
 *
 * `-1` delegates to the zlib default for the selected algorithm.
 *
 * @type {number}
 */
const DEFAULT_LEVEL = -1;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized compression middleware
 * options.
 *
 * @classdesc Validates and normalizes compression middleware options. When
 * options are provided, defaults are applied for any omitted property. When
 * options are omitted, the value is undefined.
 *
 * @example
 * ```js
 * const options = new CompressOptionsValue({ threshold: 2048, level: 6 });
 *
 * options.value;
 * // => {
 * //   threshold: 2048,
 * //   level: 6,
 * //   types: undefined,
 * // }
 * ```
 *
 * @example
 * ```js
 * const options = new CompressOptionsValue();
 *
 * options.value;
 * // => undefined
 * ```
 */
class CompressOptionsValue {
  /**
   * The normalized compression options.
   *
   * @type {Readonly<CompressOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link CompressOptionsValue}.
   *
   * @param {CompressOptionsInput} [options] - The compression middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   */
  constructor(options) {
    assertCompressOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            threshold: options.threshold ?? DEFAULT_THRESHOLD,
            level: options.level ?? DEFAULT_LEVEL,
            types: options.types === undefined ? undefined : Object.freeze([...options.types]),
          });
  }

  /**
   * The normalized compression options.
   *
   * @readonly
   * @type {Readonly<CompressOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CompressOptionsValue;

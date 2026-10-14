// @ts-check
/**
 * @file Defines the ResponseOptionsValue value object.
 *
 * @description Normalizes and validates response configuration used by
 * ServerConfiguration. When options are omitted, the value is undefined.
 *
 * @module ResponseOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertResponseOptions } from '#shared/validations/ServerConfiguration/ResponseOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the response options accepted by the server configuration.
 *
 * @typedef  {object}  ResponseOptionsInput
 * @property {boolean} [etag]               - Whether to generate a weak ETag for buffered bodies.
 * @property {string}  [defaultCharset]     - Charset appended to eligible Content-Type headers when none is set.
 */

/**
 * Represents the normalized response options.
 *
 * @typedef  {object}  ResponseOptionsData
 * @property {boolean} [etag]              - Whether to generate a weak ETag for buffered bodies.
 * @property {string}  [defaultCharset]    - Charset appended to eligible Content-Type headers when none is set.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized response options.
 *
 * @classdesc Validates and normalizes response options for the server.
 * When options are omitted, the value is undefined.
 */
class ResponseOptionsValue {
  /**
   * Normalized response options.
   *
   * @type {Readonly<ResponseOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link ResponseOptionsValue}.
   *
   * @param {ResponseOptionsInput} [options] - The response options.
   * @throws {ServerConfigurationError} If `options` is not a plain object.
   * @throws {ServerConfigurationError} If `etag` is defined and is not a boolean.
   * @throws {ServerConfigurationError} If `defaultCharset` is defined and is not a string.
   * @throws {ServerConfigurationError} If `defaultCharset` is defined and is an empty string.
   * @example
   * ```js
   * const options = new ResponseOptionsValue({ etag: true, defaultCharset: 'utf-8' });
   *
   * options.value;
   * // => { etag: true, defaultCharset: 'utf-8' }
   * ```
   *
   * @example
   * ```js
   * const options = new ResponseOptionsValue();
   *
   * options.value;
   * // => undefined
   * ```
   */
  constructor(options) {
    assertResponseOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            etag: options.etag,
            defaultCharset: options.defaultCharset,
          });
  }

  /**
   * The response options.
   *
   * @readonly
   * @type {Readonly<ResponseOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ResponseOptionsValue;

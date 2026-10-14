// @ts-check
/**
 * @file Defines the RequestOptionsValue value object.
 *
 * @description Normalizes and validates request configuration used by
 * ServerConfiguration. When options are omitted, the value is undefined.
 *
 * @module RequestOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertRequestOptions } from '#shared/validations/ServerConfiguration/RequestOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Whether (and how much) to trust proxy headers.
 *
 * @typedef {boolean|number} TrustProxyOption
 */

/**
 * Represents the request options accepted by the server configuration.
 *
 * @typedef  {object}           RequestOptionsInput
 * @property {number}           [bodyLimit]         - Maximum number of bytes allowed for the request body.
 * @property {TrustProxyOption} [trustProxy]        - Whether (and how much) to trust proxy headers.
 */

/**
 * Represents the normalized request options.
 *
 * @typedef  {object}           RequestOptionsData
 * @property {number}           [bodyLimit]        - Maximum number of bytes allowed for the request body.
 * @property {TrustProxyOption} [trustProxy]       - Whether (and how much) to trust proxy headers.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized request options.
 *
 * @classdesc Validates and normalizes request options for the server.
 * When options are omitted, the value is undefined.
 */
class RequestOptionsValue {
  /**
   * Normalized request options.
   *
   * @type {Readonly<RequestOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link RequestOptionsValue}.
   *
   * @param {RequestOptionsInput} [options] - The request options.
   * @throws {ServerConfigurationError} If `options` is not a plain object.
   * @throws {ServerConfigurationError} If `bodyLimit` is defined and is not a number.
   * @throws {ServerConfigurationError} If `bodyLimit` is defined and is not a positive safe integer.
   * @throws {ServerConfigurationError} If `trustProxy` is defined and is not a boolean or number.
   * @throws {ServerConfigurationError} If numeric `trustProxy` is defined and is negative or not an integer.
   * @example
   * ```js
   * const options = new RequestOptionsValue({ bodyLimit: 1_000_000, trustProxy: 1 });
   *
   * options.value;
   * // => { bodyLimit: 1_000_000, trustProxy: 1 }
   * ```
   *
   * @example
   * ```js
   * const options = new RequestOptionsValue();
   *
   * options.value;
   * // => undefined
   * ```
   */
  constructor(options) {
    assertRequestOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            bodyLimit: options.bodyLimit,
            trustProxy: options.trustProxy,
          });
  }

  /**
   * The request options.
   *
   * @readonly
   * @type {Readonly<RequestOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RequestOptionsValue;

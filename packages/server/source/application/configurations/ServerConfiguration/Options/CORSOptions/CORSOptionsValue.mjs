// @ts-check
/**
 * @file Defines the CORSOptionsValue value object.
 *
 * @description Normalizes and validates CORS middleware configuration used
 * by CORSMiddleware. When options are omitted, the value is undefined.
 *
 * @module CORSOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertCORSOptions } from '#shared/validations/ServerConfiguration/CORSOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the CORS options accepted by the server configuration.
 *
 * @typedef  {object}               CORSOptionsInput
 * @property {true|string|string[]} [origin]               - Allowed origin(s). Defaults to `'*'`.
 * @property {string[]}             [methods]              - Allowed HTTP methods for preflight responses. Defaults to a standard set.
 * @property {string[]}             [allowedHeaders]       - Headers the client is allowed to send. When omitted, the value of Access-Control-Request-Headers is reflected.
 * @property {string[]}             [exposedHeaders]       - Headers the client is allowed to read from the response.
 * @property {boolean}              [credentials]          - Whether the response may include credentials. Defaults to `false`.
 * @property {number}               [maxAge]               - How long (in seconds) the preflight response may be cached.
 * @property {boolean}              [preflightContinue]    - Whether to call `next()` on successful preflight instead of ending the response. Defaults to `false`.
 * @property {number}               [optionsSuccessStatus] - Status code used for successful preflight responses. Defaults to `204`.
 */

/**
 * Represents the normalized CORS options.
 *
 * @typedef  {object}                       CORSOptionsData
 * @property {true|string|string[]}         origin               - Allowed origin(s).
 * @property {Readonly<string[]>}           methods              - Allowed HTTP methods for preflight responses.
 * @property {Readonly<string[]>|undefined} allowedHeaders       - Headers the client is allowed to send, or `undefined` to reflect the request headers.
 * @property {Readonly<string[]>|undefined} exposedHeaders       - Headers the client is allowed to read from the response.
 * @property {boolean}                      credentials          - Whether the response may include credentials.
 * @property {number|undefined}             maxAge               - How long (in seconds) the preflight response may be cached.
 * @property {boolean}                      preflightContinue    - Whether to call `next()` on successful preflight instead of ending the response.
 * @property {number}                       optionsSuccessStatus - Status code used for successful preflight responses.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default allowed origin.
 *
 * @type {true|string|string[]}
 */
const DEFAULT_ORIGIN = '*';

/**
 * Default allowed HTTP methods for preflight responses.
 *
 * @type {readonly string[]}
 */
const DEFAULT_METHODS = Object.freeze(['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']);

/**
 * Default credentials behavior.
 *
 * @type {boolean}
 */
const DEFAULT_CREDENTIALS = false;

/**
 * Default preflight continuation behavior.
 *
 * @type {boolean}
 */
const DEFAULT_PREFLIGHT_CONTINUE = false;

/**
 * Default status code used for successful preflight responses.
 *
 * @type {number}
 */
const DEFAULT_OPTIONS_SUCCESS_STATUS = 204;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized CORS middleware options.
 *
 * @classdesc Validates and normalizes CORS middleware options.
 */
class CORSOptionsValue {
  /**
   * The normalized CORS options.
   *
   * @type {Readonly<CORSOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link CORSOptionsValue}.
   *
   * @param {CORSOptionsInput} [options] - The CORS middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   * @example
   * ```js
   * const options = new CORSOptionsValue({ origin: true, credentials: true });
   *
   * options.value;
   * // => {
   * //   origin: true,
   * //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
   * //   allowedHeaders: undefined,
   * //   exposedHeaders: undefined,
   * //   credentials: true,
   * //   maxAge: undefined,
   * //   preflightContinue: false,
   * //   optionsSuccessStatus: 204,
   * // }
   * ```
   */
  constructor(options) {
    assertCORSOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            origin: options.origin ?? DEFAULT_ORIGIN,
            methods: Object.freeze([...(options.methods ?? DEFAULT_METHODS)]),
            allowedHeaders:
              options.allowedHeaders === undefined
                ? undefined
                : Object.freeze([...options.allowedHeaders]),
            exposedHeaders:
              options.exposedHeaders === undefined
                ? undefined
                : Object.freeze([...options.exposedHeaders]),
            credentials: options.credentials ?? DEFAULT_CREDENTIALS,
            maxAge: options.maxAge,
            preflightContinue: options.preflightContinue ?? DEFAULT_PREFLIGHT_CONTINUE,
            optionsSuccessStatus: options.optionsSuccessStatus ?? DEFAULT_OPTIONS_SUCCESS_STATUS,
          });
  }

  /**
   * The normalized CORS options.
   *
   * @readonly
   * @type {Readonly<CORSOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CORSOptionsValue;

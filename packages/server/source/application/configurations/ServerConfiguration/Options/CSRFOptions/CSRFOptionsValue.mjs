// @ts-check
/**
 * @file Defines the CSRFOptionsValue value object.
 *
 * @description Normalizes and validates CSRF middleware configuration used
 * by CsrfMiddleware. When options are omitted, the value is undefined and the
 * middleware is not registered.
 *
 * @module CSRFOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertCSRFOptions } from '#shared/validations/ServerConfiguration/CSRFOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the CSRF options accepted by the server configuration.
 *
 * @typedef  {object}                CSRFOptionsInput
 * @property {string}                [cookieName]     - Name of the CSRF cookie.
 * @property {string}                [headerName]     - Name of the request header that must carry the token.
 * @property {string[]}              [safeMethods]    - HTTP methods that skip CSRF validation.
 * @property {number}                [tokenBytes]     - Number of random bytes used to generate the token.
 * @property {string}                [path]           - Cookie Path attribute.
 * @property {string}                [domain]         - Cookie Domain attribute.
 * @property {boolean}               [secure]         - Whether the cookie is marked Secure.
 * @property {'Strict'|'Lax'|'None'} [sameSite]       - Cookie SameSite attribute.
 */

/**
 * Represents the normalized CSRF options.
 *
 * @typedef  {object}                CSRFOptionsData
 * @property {string}                cookieName      - Name of the CSRF cookie.
 * @property {string}                headerName      - Name of the request header that must carry the token.
 * @property {Readonly<string[]>}    safeMethods     - HTTP methods that skip CSRF validation.
 * @property {number}                tokenBytes      - Number of random bytes used to generate the token.
 * @property {string}                path            - Cookie Path attribute.
 * @property {string|undefined}      domain          - Cookie Domain attribute.
 * @property {boolean}               secure          - Whether the cookie is marked Secure.
 * @property {'Strict'|'Lax'|'None'} sameSite        - Cookie SameSite attribute.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default CSRF cookie name.
 *
 * @type {string}
 */
const DEFAULT_COOKIE_NAME = 'csrf-token';

/**
 * Default request header name.
 *
 * @type {string}
 */
const DEFAULT_HEADER_NAME = 'x-csrf-token';

/**
 * Default safe HTTP methods.
 *
 * @type {readonly string[]}
 */
const DEFAULT_SAFE_METHODS = Object.freeze(['GET', 'HEAD', 'OPTIONS']);

/**
 * Default number of random bytes used to generate the token.
 *
 * @type {number}
 */
const DEFAULT_TOKEN_BYTES = 32;

/**
 * Default cookie path attribute.
 *
 * @type {string}
 */
const DEFAULT_PATH = '/';

/**
 * Default Secure attribute.
 *
 * @type {boolean}
 */
const DEFAULT_SECURE = true;

/**
 * Default SameSite attribute.
 *
 * @type {'Strict'|'Lax'|'None'}
 */
const DEFAULT_SAME_SITE = 'Lax';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized CSRF middleware options.
 *
 * @classdesc Validates and normalizes CSRF middleware options. When options
 * are provided, defaults are applied for any omitted property. When options
 * are omitted, the value is undefined.
 *
 * @example
 * ```js
 * const options = new CSRFOptionsValue({ cookieName: 'csrf' });
 *
 * options.value;
 * // => {
 * //   cookieName: 'csrf',
 * //   headerName: 'x-csrf-token',
 * //   safeMethods: ['GET', 'HEAD', 'OPTIONS'],
 * //   tokenBytes: 32,
 * //   path: '/',
 * //   domain: undefined,
 * //   secure: true,
 * //   sameSite: 'Lax',
 * // }
 * ```
 *
 * @example
 * ```js
 * const options = new CSRFOptionsValue();
 *
 * options.value;
 * // => undefined
 * ```
 */
class CSRFOptionsValue {
  /**
   * The normalized CSRF options.
   *
   * @type {Readonly<CSRFOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link CSRFOptionsValue}.
   *
   * @param {CSRFOptionsInput} [options] - The CSRF middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   */
  constructor(options) {
    assertCSRFOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            cookieName: options.cookieName ?? DEFAULT_COOKIE_NAME,
            headerName: options.headerName ?? DEFAULT_HEADER_NAME,
            safeMethods: Object.freeze([...(options.safeMethods ?? DEFAULT_SAFE_METHODS)]),
            tokenBytes: options.tokenBytes ?? DEFAULT_TOKEN_BYTES,
            path: options.path ?? DEFAULT_PATH,
            domain: options.domain,
            secure: options.secure ?? DEFAULT_SECURE,
            sameSite: options.sameSite ?? DEFAULT_SAME_SITE,
          });
  }

  /**
   * The normalized CSRF options.
   *
   * @readonly
   * @type {Readonly<CSRFOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CSRFOptionsValue;

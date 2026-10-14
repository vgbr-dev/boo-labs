// @ts-check
/**
 * @file Defines the CookieSessionOptionsValue value object.
 *
 * @description Normalizes and validates cookie session middleware
 * configuration used by CookieSessionMiddleware. When options are omitted,
 * the value is undefined and the middleware is not registered.
 *
 * @module CookieSessionOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertCookieSessionOptions } from '#shared/validations/ServerConfiguration/CookieSessionOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the cookie session options accepted by the server configuration.
 *
 * @typedef  {object}                CookieSessionOptionsInput
 * @property {string}                [name]                    - Name of the session cookie.
 * @property {string[]}              keys                      - Signing keys. Required when options are provided.
 * @property {number}                [maxAge]                  - Cookie max-age in milliseconds. When omitted, the cookie is a session cookie.
 * @property {string}                [path]                    - Cookie path attribute.
 * @property {string}                [domain]                  - Cookie domain attribute.
 * @property {boolean}               [secure]                  - Whether the cookie is marked Secure.
 * @property {boolean}               [httpOnly]                - Whether the cookie is marked HttpOnly.
 * @property {'Strict'|'Lax'|'None'} [sameSite]                - Cookie SameSite attribute.
 * @property {boolean}               [overwrite]               - Whether an existing Set-Cookie header with the same name should be overwritten.
 */

// eslint-disable-next-line jsdoc/check-line-alignment
/**
 * Represents the normalized cookie session options.
 *
 * @typedef  {object}                          CookieSessionOptionsData
 * @property {string}                          name                     - Name of the session cookie.
 * @property {Readonly<string[]>}              keys                     - Signing keys. The first key is used to sign; all keys are tried when verifying.
 * @property {number|undefined}                maxAge                   - Cookie max-age in milliseconds. When `undefined`, the cookie is a session cookie.
 * @property {string}                          path                     - Cookie path attribute.
 * @property {string|undefined}                domain                   - Cookie domain attribute.
 * @property {boolean}                         secure                   - Whether the cookie is marked Secure.
 * @property {boolean}                         httpOnly                 - Whether the cookie is marked HttpOnly.
 * @property {'Strict'|'Lax'|'None'}           sameSite                 - Cookie SameSite attribute.
 * @property {boolean}                         overwrite                - Whether an existing Set-Cookie header with the same name should be overwritten.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default session cookie name.
 *
 * @type {string}
 */
const DEFAULT_NAME = 'session';

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
 * Default HttpOnly attribute.
 *
 * @type {boolean}
 */
const DEFAULT_HTTP_ONLY = true;

/**
 * Default SameSite attribute.
 *
 * @type {'Strict'|'Lax'|'None'}
 */
const DEFAULT_SAME_SITE = 'Lax';

/**
 * Default overwrite behavior.
 *
 * @type {boolean}
 */
const DEFAULT_OVERWRITE = true;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized cookie session middleware
 * options.
 *
 * @classdesc Validates and normalizes cookie session middleware options.
 * When options are provided, defaults are applied for any omitted property.
 * When options are omitted, the value is undefined.
 *
 * @example
 * ```js
 * const options = new CookieSessionOptionsValue(
 *   { keys: ['current-secret', 'previous-secret'] },
 *   true,
 * );
 *
 * options.value;
 * // => {
 * //   name: 'session',
 * //   keys: ['current-secret', 'previous-secret'],
 * //   maxAge: undefined,
 * //   path: '/',
 * //   domain: undefined,
 * //   secure: true,
 * //   httpOnly: true,
 * //   sameSite: 'Lax',
 * //   overwrite: true,
 * // }
 * ```
 *
 * @example
 * ```js
 * const options = new CookieSessionOptionsValue(undefined, false);
 *
 * options.value;
 * // => undefined
 * ```
 */
class CookieSessionOptionsValue {
  /**
   * The normalized cookie session options.
   *
   * @type {Readonly<CookieSessionOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link CookieSessionOptionsValue}.
   *
   * @param {CookieSessionOptionsInput} [options] - The cookie session middleware options.
   * @param {boolean} [hasParser] - Whether a cookie parser is configured.
   * @throws {ServerConfigurationError} If `options` is invalid.
   * @throws {ServerConfigurationError} If no cookie parser is configured.
   */
  constructor(options, hasParser) {
    assertCookieSessionOptions(options, hasParser);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            name: options.name ?? DEFAULT_NAME,
            keys: Object.freeze([...options.keys]),
            maxAge: options.maxAge,
            path: options.path ?? DEFAULT_PATH,
            domain: options.domain,
            secure: options.secure ?? DEFAULT_SECURE,
            httpOnly: options.httpOnly ?? DEFAULT_HTTP_ONLY,
            sameSite: options.sameSite ?? DEFAULT_SAME_SITE,
            overwrite: options.overwrite ?? DEFAULT_OVERWRITE,
          });
  }

  /**
   * The normalized cookie session options.
   *
   * @readonly
   * @type {Readonly<CookieSessionOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CookieSessionOptionsValue;

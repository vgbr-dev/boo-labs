// @ts-check
/**
 * @file Defines the StaticOptionsValue value object.
 *
 * @description Normalizes and validates static middleware configuration used
 * by StaticMiddleware. When options are omitted, the value is undefined.
 *
 * @module StaticOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { resolve } from 'node:path';

// » IMPORT LOCAL MODULES
import { assertStaticOptions } from '#shared/validations/ServerConfiguration/StaticOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the static options accepted by the server configuration.
 *
 * @typedef  {object}                  StaticOptionsInput
 * @property {string}                  root               - Filesystem root directory for static files.
 * @property {Readonly<Array<string>>} [index]            - Ordered list of index file names.
 * @property {number}                  [maxAge]           - Cache-Control max-age value in seconds.
 * @property {boolean}                 [etag]             - Whether to generate ETag headers.
 * @property {boolean}                 [lastModified]     - Whether to generate Last-Modified headers.
 * @property {boolean}                 [fallthrough]      - Whether to delegate to the next middleware when no file is found.
 * @property {Readonly<Array<string>>} [extensions]       - Extensions to try when the request has no extension.
 * @property {boolean}                 [dotfiles]         - Whether to serve dot-prefixed paths.
 */

/**
 * Represents the normalized static options.
 *
 * @typedef  {object}                            StaticOptionsData
 * @property {string}                            root              - Absolute resolved path to the static files root directory.
 * @property {Readonly<Array<string>>}           index             - Ordered list of index file names.
 * @property {number}                            maxAge            - Cache-Control max-age value in seconds.
 * @property {boolean}                           etag              - Whether to generate ETag headers.
 * @property {boolean}                           lastModified      - Whether to generate Last-Modified headers.
 * @property {boolean}                           fallthrough       - Whether to delegate to the next middleware when no file is found.
 * @property {Readonly<Array<string>>|undefined} extensions        - Extensions to try when the request has no extension.
 * @property {boolean}                           dotfiles          - Whether to serve dot-prefixed paths.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default index file names.
 *
 * @type {readonly string[]}
 */
const DEFAULT_INDEX = Object.freeze(['index.html']);

/**
 * Default Cache-Control max-age value in seconds.
 *
 * @type {number}
 */
const DEFAULT_MAX_AGE = 0;

/**
 * Default ETag generation behavior.
 *
 * @type {boolean}
 */
const DEFAULT_ETAG = true;

/**
 * Default Last-Modified header behavior.
 *
 * @type {boolean}
 */
const DEFAULT_LAST_MODIFIED = true;

/**
 * Default fallthrough behavior.
 *
 * @type {boolean}
 */
const DEFAULT_FALLTHROUGH = true;

/**
 * Default dotfile serving behavior.
 *
 * @type {boolean}
 */
const DEFAULT_DOTFILES = false;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized static middleware options.
 *
 * @classdesc Validates and normalizes static middleware options.
 *
 */
class StaticOptionsValue {
  /**
   * The normalized static options.
   *
   * @type {Readonly<StaticOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link StaticOptionsValue}.
   *
   * @param {StaticOptionsInput} [options] - The static middleware options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   * @example
   * ```js
   * const options = new StaticOptionsValue({ root: '/var/www/public' });
   *
   * options.value;
   * // => {
   * //   root: '/var/www/public',
   * //   index: ['index.html'],
   * //   maxAge: 0,
   * //   etag: true,
   * //   lastModified: true,
   * //   fallthrough: true,
   * //   extensions: undefined,
   * //   dotfiles: false,
   * // }
   * ```
   */
  constructor(options) {
    assertStaticOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            root: resolve(options.root),
            index: Object.freeze(options.index ?? [...DEFAULT_INDEX]),
            maxAge: options.maxAge ?? DEFAULT_MAX_AGE,
            etag: options.etag ?? DEFAULT_ETAG,
            lastModified: options.lastModified ?? DEFAULT_LAST_MODIFIED,
            fallthrough: options.fallthrough ?? DEFAULT_FALLTHROUGH,
            extensions:
              options.extensions === undefined ? undefined : Object.freeze([...options.extensions]),
            dotfiles: options.dotfiles ?? DEFAULT_DOTFILES,
          });
  }

  /**
   * The normalized static options.
   *
   * @readonly
   * @type {Readonly<StaticOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default StaticOptionsValue;

// @ts-check
/**
 * @file Defines the ListenOptionsValue value object.
 *
 * @description Normalizes and validates listen configuration used by
 * ServerConfiguration. When no options are provided, the value is
 * undefined and Node applies its own defaults.
 *
 * @module ListenOptionsValue
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import { assertListenOptions } from '#shared/validations/ServerConfiguration/ListenOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Domain error thrown by server configuration validation.
 *
 * @typedef {import('#shared/errors/ServerConfigurationError').default} ServerConfigurationError
 */

/**
 * Represents the listen options accepted by the server configuration.
 *
 * @typedef  {object} ListenOptionsInput
 * @property {number} [port]             - The TCP port on which the server listens.
 * @property {string} [host]             - The hostname or IP address on which the server listens.
 * @property {number} [backlog]          - The maximum number of pending connections that may be queued.
 */

/**
 * Represents the normalized listen options.
 *
 * @typedef  {object}           ListenOptionsData
 * @property {number|undefined} port              - The TCP port on which the server listens.
 * @property {string|undefined} host              - The hostname or IP address on which the server listens.
 * @property {number|undefined} backlog           - The maximum number of pending connections that may be queued.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable value object representing normalized listen options.
 *
 * @classdesc Validates and normalizes listen options for the server.
 * When no options are provided, the value is undefined.
 */
class ListenOptionsValue {
  /**
   * The normalized listen options.
   *
   * @type {Readonly<ListenOptionsData>|undefined}
   */
  #value;

  /**
   * Creates a new {@link ListenOptionsValue}.
   *
   * @param {ListenOptionsInput} [options] - The listen options.
   * @throws {ServerConfigurationError} If `options` is invalid.
   *
   * @example
   * ```js
   * const options = new ListenOptionsValue({ port: 3000 });
   *
   * options.value;
   * // => { port: 3000, host: undefined, backlog: undefined }
   * ```
   */
  constructor(options) {
    assertListenOptions(options);

    this.#value =
      options === undefined
        ? options
        : Object.freeze({
            port: options.port,
            host: options.host,
            backlog: options.backlog,
          });
  }

  /**
   * The normalized listen options.
   *
   * @readonly
   * @type {Readonly<ListenOptionsData>|undefined}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ListenOptionsValue;

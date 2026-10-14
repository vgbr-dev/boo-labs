// @ts-check
/**
 * @file Listen options validation utilities.
 *
 * @description Validates listen options used by ServerConfiguration,
 * including port range, host presence, and backlog constraints.
 *
 * @module Validation/ServerConfiguration/ListenOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimum valid TCP port.
 *
 * @private
 * @type {number}
 */
const MIN_PORT = 0;

/**
 * Maximum valid TCP port.
 *
 * @private
 * @type {number}
 */
const MAX_PORT = 65535;

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Determines whether a value is a non-null plain object.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} `true` if the value is a plain object.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates listen options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `port`, if present, must be an integer between 0 and 65535.
 * 4. `host`, if present, must be a non-empty string.
 * 5. `backlog`, if present, must be a number.
 *
 * @param {unknown} options - Listen options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateListenOptions({ port: 3000 });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateListenOptions({});
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateListenOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_LISTEN_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('port' in options) {
    const { port } = options;

    if (typeof port !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_PORT_TYPE',
        custom: true,
        options: { values: { received: typeof port } },
      });
    }

    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_PORT_RANGE',
        custom: true,
        options: { details: { port } },
      });
    }
  }

  if ('host' in options) {
    const { host } = options;

    if (typeof host !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_HOST_TYPE',
        custom: true,
        options: { values: { received: typeof host } },
      });
    }

    if (host.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_HOST_VALUE',
        custom: true,
        options: { details: { host } },
      });
    }
  }

  if ('backlog' in options) {
    const { backlog } = options;

    if (typeof backlog !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_BACKLOG_TYPE',
        custom: true,
        options: { values: { received: typeof backlog } },
      });
    }

    if (!Number.isInteger(backlog) || backlog <= 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_BACKLOG_RANGE',
        custom: true,
        options: { details: { backlog } },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that listen options are valid.
 *
 * @param {unknown} options - Listen options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If `port` is not a number.
 * @throws {ServerConfigurationError} If `port` is outside the range 0–65535 or is not an integer.
 * @throws {ServerConfigurationError} If `host` is not a string.
 * @throws {ServerConfigurationError} If `host` is an empty string.
 * @throws {ServerConfigurationError} If `backlog` is not a number.
 * @example
 * ```js
 * assertListenOptions({ port: 3000, host: '127.0.0.1' });
 * ```
 */
export function assertListenOptions(options) {
  const validation = validateListenOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}

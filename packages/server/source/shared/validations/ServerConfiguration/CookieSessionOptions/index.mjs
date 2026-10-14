// @ts-check
/**
 * @file Cookie session options validation utilities.
 *
 * @description Validates cookie session middleware options used by
 * ServerConfiguration. Enforces the dependency on a configured cookie
 * parser and the SameSite=None → Secure relationship.
 *
 * @module Validation/ServerConfiguration/CookieSessionOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Valid values for the SameSite cookie attribute.
 *
 * @private
 * @type {readonly string[]}
 */
const SAME_SITE_VALUES = Object.freeze(['Strict', 'Lax', 'None']);

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
 * Determines whether a value is a non-empty string.
 *
 * @private
 * @param {unknown} value - Value to inspect.
 * @returns {value is string} `true` if the value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Determines whether every item in an array is a non-empty string.
 *
 * @private
 * @param {unknown[]} values - Array of values to inspect.
 * @returns {boolean} `true` if every item is a non-empty string.
 */
function everyNonEmptyString(values) {
  return values.every(isNonEmptyString);
}

/**
 * Validates cookie session options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `hasParser` must be `true`; cookie session requires a cookie parser.
 * 4. `name`, if present, must be a non-empty string.
 * 5. `keys` is required when `options` is present and must be a non-empty array of non-empty strings.
 * 6. `maxAge`, if present, must be a positive integer.
 * 7. `path`, if present, must be a non-empty string.
 * 8. `domain`, if present, must be a non-empty string.
 * 9. `secure`, if present, must be a boolean.
 * 10. `httpOnly`, if present, must be a boolean.
 * 11. `sameSite`, if present, must be `'Strict'`, `'Lax'`, or `'None'`.
 * 12. `overwrite`, if present, must be a boolean.
 * 13. `sameSite: 'None'` requires an effective `secure: true`.
 *
 * @param {unknown} options - Cookie session options to validate.
 * @param {boolean} [hasParser] - Whether a cookie parser is configured.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateCookieSessionOptions({ keys: ['secret'] }, true);
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateCookieSessionOptions({ keys: ['secret'] }, false);
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateCookieSessionOptions(options, hasParser) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_COOKIE_SESSION_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if (hasParser !== true) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'COOKIE_SESSION_REQUIRES_COOKIE_PARSER',
      custom: true,
    });
  }

  if ('name' in options) {
    const { name } = options;

    if (typeof name !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_NAME_TYPE',
        custom: true,
        options: { values: { received: typeof name } },
      });
    }

    if (name.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_NAME_VALUE',
        custom: true,
        options: { details: { name } },
      });
    }
  }

  const { keys } = options;

  if (keys === undefined) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'MISSING_COOKIE_SESSION_KEYS',
      custom: true,
    });
  }

  if (!Array.isArray(keys)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_COOKIE_SESSION_KEYS_TYPE',
      custom: true,
      options: { values: { received: typeof keys } },
    });
  }

  if (keys.length === 0) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'MISSING_COOKIE_SESSION_KEYS',
      custom: true,
    });
  }

  if (!everyNonEmptyString(keys)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_COOKIE_SESSION_KEYS_ITEM',
      custom: true,
      options: { details: { keys } },
    });
  }

  if ('maxAge' in options) {
    const { maxAge } = options;

    if (typeof maxAge !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_MAX_AGE_TYPE',
        custom: true,
        options: { values: { received: typeof maxAge } },
      });
    }

    if (!Number.isInteger(maxAge) || maxAge <= 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_MAX_AGE_RANGE',
        custom: true,
        options: { details: { maxAge } },
      });
    }
  }

  if ('path' in options) {
    const { path } = options;

    if (typeof path !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_PATH_TYPE',
        custom: true,
        options: { values: { received: typeof path } },
      });
    }

    if (path.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_PATH_VALUE',
        custom: true,
        options: { details: { path } },
      });
    }
  }

  if ('domain' in options) {
    const { domain } = options;

    if (typeof domain !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_DOMAIN_TYPE',
        custom: true,
        options: { values: { received: typeof domain } },
      });
    }

    if (domain.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_DOMAIN_VALUE',
        custom: true,
        options: { details: { domain } },
      });
    }
  }

  if ('secure' in options) {
    const { secure } = options;

    if (typeof secure !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_SECURE_TYPE',
        custom: true,
        options: { values: { received: typeof secure } },
      });
    }
  }

  if ('httpOnly' in options) {
    const { httpOnly } = options;

    if (typeof httpOnly !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_HTTP_ONLY_TYPE',
        custom: true,
        options: { values: { received: typeof httpOnly } },
      });
    }
  }

  if ('sameSite' in options) {
    const { sameSite } = options;

    if (sameSite !== undefined && !SAME_SITE_VALUES.includes(String(sameSite))) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_SAME_SITE_VALUE',
        custom: true,
        options: { details: { sameSite } },
      });
    }
  }

  if ('overwrite' in options) {
    const { overwrite } = options;

    if (typeof overwrite !== 'boolean') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_COOKIE_SESSION_OVERWRITE_TYPE',
        custom: true,
        options: { values: { received: typeof overwrite } },
      });
    }
  }

  // Effective values (after defaults) are used for the cross-field rule.
  const effectiveSameSite = options.sameSite ?? 'Lax';
  const effectiveSecure = options.secure ?? true;

  if (effectiveSameSite === 'None' && effectiveSecure === false) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'COOKIE_SESSION_NONE_REQUIRES_SECURE',
      custom: true,
    });
  }

  return Validation.success();
}

/**
 * Asserts that cookie session options are valid.
 *
 * @param {unknown} options - Cookie session options to validate.
 * @param {boolean} [hasParser] - Whether a cookie parser is configured.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If no cookie parser is configured.
 * @throws {ServerConfigurationError} If `keys` is missing or invalid.
 * @throws {ServerConfigurationError} If any other option is invalid.
 * @throws {ServerConfigurationError} If `sameSite: 'None'` is used without `secure: true`.
 * @example
 * ```js
 * assertCookieSessionOptions({ keys: ['secret'] }, true);
 * ```
 */
export function assertCookieSessionOptions(options, hasParser) {
  const validation = validateCookieSessionOptions(options, hasParser);

  if (!validation.ok) {
    throw validation.error;
  }
}

// @ts-check
/**
 * @file CSRF options validation utilities.
 *
 * @description Validates CSRF middleware options used by
 * ServerConfiguration. Enforces the SameSite=None → Secure relationship.
 *
 * @module Validation/ServerConfiguration/CSRFOptions
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
 * Validates CSRF options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. `cookieName`, if present, must be a non-empty string.
 * 4. `headerName`, if present, must be a non-empty string.
 * 5. `safeMethods`, if present, must be an array of non-empty strings.
 * 6. `tokenBytes`, if present, must be a positive integer.
 * 7. `path`, if present, must be a non-empty string.
 * 8. `domain`, if present, must be a non-empty string.
 * 9. `secure`, if present, must be a boolean.
 * 10. `sameSite`, if present, must be `'Strict'`, `'Lax'`, or `'None'`.
 * 11. `sameSite: 'None'` requires an effective `secure: true`.
 *
 * @param {unknown} options - CSRF options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateCSRFOptions({ cookieName: 'csrf' });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateCSRFOptions({ tokenBytes: 0 });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateCSRFOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_CSRF_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  if ('cookieName' in options) {
    const { cookieName } = options;

    if (typeof cookieName !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_COOKIE_NAME_TYPE',
        custom: true,
        options: { values: { received: typeof cookieName } },
      });
    }

    if (cookieName.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_COOKIE_NAME_VALUE',
        custom: true,
        options: { details: { cookieName } },
      });
    }
  }

  if ('headerName' in options) {
    const { headerName } = options;

    if (typeof headerName !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_HEADER_NAME_TYPE',
        custom: true,
        options: { values: { received: typeof headerName } },
      });
    }

    if (headerName.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_HEADER_NAME_VALUE',
        custom: true,
        options: { details: { headerName } },
      });
    }
  }

  if ('safeMethods' in options) {
    const { safeMethods } = options;

    if (!Array.isArray(safeMethods)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_SAFE_METHODS_TYPE',
        custom: true,
        options: { values: { received: typeof safeMethods } },
      });
    }

    if (!everyNonEmptyString(safeMethods)) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_SAFE_METHODS_ITEM',
        custom: true,
        options: { details: { safeMethods } },
      });
    }
  }

  if ('tokenBytes' in options) {
    const { tokenBytes } = options;

    if (typeof tokenBytes !== 'number') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_TOKEN_BYTES_TYPE',
        custom: true,
        options: { values: { received: typeof tokenBytes } },
      });
    }

    if (!Number.isInteger(tokenBytes) || tokenBytes <= 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_TOKEN_BYTES_RANGE',
        custom: true,
        options: { details: { tokenBytes } },
      });
    }
  }

  if ('path' in options) {
    const { path } = options;

    if (typeof path !== 'string') {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_PATH_TYPE',
        custom: true,
        options: { values: { received: typeof path } },
      });
    }

    if (path.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_PATH_VALUE',
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
        code: 'INVALID_CSRF_DOMAIN_TYPE',
        custom: true,
        options: { values: { received: typeof domain } },
      });
    }

    if (domain.length === 0) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_DOMAIN_VALUE',
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
        code: 'INVALID_CSRF_SECURE_TYPE',
        custom: true,
        options: { values: { received: typeof secure } },
      });
    }
  }

  if ('sameSite' in options) {
    const { sameSite } = options;

    if (sameSite !== undefined && !SAME_SITE_VALUES.includes(String(sameSite))) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_CSRF_SAME_SITE_VALUE',
        custom: true,
        options: { details: { sameSite } },
      });
    }
  }

  // Effective values (after defaults) are used for the cross-field rule.
  const effectiveSameSite = options.sameSite ?? 'Lax';
  const effectiveSecure = options.secure ?? true;

  if (effectiveSameSite === 'None' && effectiveSecure === false) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'CSRF_NONE_REQUIRES_SECURE',
      custom: true,
    });
  }

  return Validation.success();
}

/**
 * Asserts that CSRF options are valid.
 *
 * @param {unknown} options - CSRF options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If any option is invalid.
 * @throws {ServerConfigurationError} If `sameSite: 'None'` is used without `secure: true`.
 * @example
 * ```js
 * assertCSRFOptions({ cookieName: 'csrf' });
 * ```
 */
export function assertCSRFOptions(options) {
  const validation = validateCSRFOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}

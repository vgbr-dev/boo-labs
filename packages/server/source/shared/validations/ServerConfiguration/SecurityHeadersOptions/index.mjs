// @ts-check
/**
 * @file Security headers options validation utilities.
 *
 * @description Validates security headers middleware options used by
 * ServerConfiguration. Every recognized security header option must be a
 * string or `false`.
 *
 * @module Validation/ServerConfiguration/SecurityHeadersOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import ServerConfigurationError from '#shared/errors/ServerConfigurationError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Property names recognized as security header options.
 *
 * @private
 * @type {readonly string[]}
 */
const SECURITY_HEADER_KEYS = Object.freeze([
  'contentSecurityPolicy',
  'crossOriginEmbedderPolicy',
  'crossOriginOpenerPolicy',
  'crossOriginResourcePolicy',
  'originAgentCluster',
  'permissionsPolicy',
  'referrerPolicy',
  'strictTransportSecurity',
  'xContentTypeOptions',
  'xDnsPrefetchControl',
  'xDownloadOptions',
  'xFrameOptions',
  'xPermittedCrossDomainPolicies',
  'xXssProtection',
]);

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
 * Validates security headers options.
 *
 * Validation is performed in the following order:
 *
 * 1. `options` may be `undefined`, in which case validation succeeds.
 * 2. `options` must be a plain object.
 * 3. Every recognized security header option present in `options` must be a
 * string or `false`.
 *
 * Unknown properties are ignored.
 *
 * @param {unknown} options - Security headers options to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateSecurityHeadersOptions({ xFrameOptions: 'DENY' });
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validateSecurityHeadersOptions({ xFrameOptions: 123 });
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validateSecurityHeadersOptions(options) {
  if (options === undefined) {
    return Validation.success();
  }

  if (!isPlainObject(options)) {
    return Validation.failure({
      error: ServerConfigurationError,
      code: 'INVALID_SECURITY_HEADERS_OPTIONS',
      custom: true,
      options: { values: { received: typeof options } },
    });
  }

  for (const key of SECURITY_HEADER_KEYS) {
    if (!(key in options)) {
      continue;
    }

    const value = options[key];

    if (typeof value !== 'string' && value !== false) {
      return Validation.failure({
        error: ServerConfigurationError,
        code: 'INVALID_SECURITY_HEADERS_OPTION_TYPE',
        custom: true,
        options: {
          values: { key, received: typeof value },
          details: { key, value },
        },
      });
    }
  }

  return Validation.success();
}

/**
 * Asserts that security headers options are valid.
 *
 * @param {unknown} options - Security headers options to validate.
 * @throws {ServerConfigurationError} If `options` is not a plain object.
 * @throws {ServerConfigurationError} If a recognized security header option is not a string or `false`.
 * @example
 * ```js
 * assertSecurityHeadersOptions({ xFrameOptions: 'DENY' });
 * ```
 */
export function assertSecurityHeadersOptions(options) {
  const validation = validateSecurityHeadersOptions(options);

  if (!validation.ok) {
    throw validation.error;
  }
}

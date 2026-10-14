// @ts-check
/**
 * @file Pathname pattern validation utilities.
 *
 * @description Validates pathname patterns used by the HTTP router, including
 * parameter syntax, wildcard segments, length constraints, and duplicate
 * parameter names.
 *
 * @module Validation/PathnamePattern
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Validation from '#shared/outcome/Validation';
import PathnamePatternError from '#shared/errors/PathnamePatternError';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maximum number of characters allowed in a pathname pattern.
 *
 * @private
 * @type {number}
 */
const MAX_PATTERN_LENGTH = 512;

/**
 * Regular expression source for a valid pathname parameter name.
 *
 * Parameter names must begin with a letter or underscore and may contain
 * letters, digits, and underscores.
 *
 * @private
 * @type {string}
 */
const PARAM_NAME = String.raw`[A-Za-z_][A-Za-z0-9_]*`;

/**
 * Regular expression source for a literal character allowed inside a pathname
 * segment.
 *
 * @private
 * @type {string}
 */
const LITERAL_CHAR = String.raw`[A-Za-z0-9._~!$&'()+,;=@-]`;

/**
 * Regular expression source for a parameter segment using colon or brace
 * syntax.
 *
 * Supported forms are `:name` and `{name}`.
 *
 * @private
 * @type {string}
 */
const PARAM_SEGMENT = String.raw`(?::${PARAM_NAME}|\{${PARAM_NAME}\})`;

/**
 * Regular expression source for a normal pathname segment.
 *
 * A normal segment may contain literal characters and parameter segments, but
 * cannot represent `.` or `..` as complete path segments.
 *
 * @private
 * @type {string}
 */
const NORMAL_SEGMENT = String.raw`(?!\.{1,2}(?=/|$))(?:${LITERAL_CHAR}|${PARAM_SEGMENT})+`;

/**
 * Regular expression source for a wildcard pathname segment.
 *
 * @private
 * @type {string}
 */
const WILDCARD_SEGMENT = String.raw`\*`;

/**
 * Complete regular expression source for supported pathname patterns.
 *
 * The expression supports the global wildcard `*` and pathname patterns
 * beginning with `/`, including parameter and trailing wildcard segments.
 *
 * @private
 * @type {string}
 */
const PATHNAME_PATTERN_SEGMENT = String.raw`^(?:\*|/(?:${NORMAL_SEGMENT}(?:/${NORMAL_SEGMENT})*)?(?:/${WILDCARD_SEGMENT})?)$`;

/**
 * Regular expression used to validate pathname pattern syntax.
 *
 * @private
 * @type {RegExp}
 */
const PATHNAME_PATTERN_REGEXP = new RegExp(PATHNAME_PATTERN_SEGMENT);

/**
 * Regular expression used to extract pathname parameter names.
 *
 * Both `:name` and `{name}` parameter syntaxes are supported.
 *
 * @private
 * @type {RegExp}
 */
const PARAMETER_PATTERN_REGEXP = /:([A-Za-z_][A-Za-z0-9_]*)|\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates that all parameter names in a pathname pattern are unique.
 *
 * Parameter names are compared by their literal names regardless of whether
 * they use colon or brace syntax.
 *
 * @private
 * @param {string} pathnamePattern - Pathname pattern to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validateUniqueParamNames('/users/:id/posts/{postId}');
 *
 * console.log(validation.ok);
 * // => true
 * ```
 * @example
 * ```js
 * const validation = validateUniqueParamNames('/users/:id/posts/{id}');
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
function validateUniqueParamNames(pathnamePattern) {
  const names = new Set();

  for (const match of pathnamePattern.matchAll(PARAMETER_PATTERN_REGEXP)) {
    const name = match[1] ?? match[2];

    if (names.has(name)) {
      return Validation.failure({
        error: PathnamePatternError,
        code: 'DUPLICATE_PARAMETER_NAME',
        custom: true,
        options: {
          values: { name },
          details: { pathnamePattern },
        },
      });
    }

    names.add(name);
  }

  return Validation.success();
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates a pathname pattern against the supported pathname syntax and
 * semantic constraints.
 *
 * Validation is performed in the following order:
 *
 * 1. The pathname pattern must be a string.
 * 2. The pathname pattern must not be empty.
 * 3. The pathname pattern must not exceed the maximum allowed length.
 * 4. The pathname pattern must match the supported pathname syntax.
 * 5. Parameter names must be unique.
 *
 * @param {unknown} pathnamePattern - Pathname pattern to validate.
 * @returns {Validation} Validation result.
 * @example
 * ```js
 * const validation = validatePathnamePattern('/users/:id');
 *
 * console.log(validation.ok);
 * // => true
 * ```
 *
 * @example
 * ```js
 * const validation = validatePathnamePattern('/users/:id/:id');
 *
 * console.log(validation.ok);
 * // => false
 * ```
 */
export function validatePathnamePattern(pathnamePattern) {
  if (typeof pathnamePattern !== 'string') {
    return Validation.failure({
      error: PathnamePatternError,
      code: 'INVALID_PATTERN_TYPE',
      custom: true,
      options: {
        values: { expected: 'string', received: typeof pathnamePattern },
      },
    });
  }

  if (pathnamePattern.length === 0) {
    return Validation.failure({
      error: PathnamePatternError,
      code: 'EMPTY_PATTERN',
      custom: true,
    });
  }

  if (pathnamePattern.length > MAX_PATTERN_LENGTH) {
    return Validation.failure({
      error: PathnamePatternError,
      code: 'PATTERN_TOO_LONG',
      custom: true,
      options: {
        values: { maxLength: MAX_PATTERN_LENGTH, actualLength: pathnamePattern.length },
      },
    });
  }

  if (!PATHNAME_PATTERN_REGEXP.test(pathnamePattern)) {
    return Validation.failure({
      error: PathnamePatternError,
      code: 'INVALID_PATHNAME_PATTERN',
      custom: true,
      options: {
        values: { pathnamePattern },
        details: { constraint: 'Must be * or start with / and contain valid segments' },
      },
    });
  }

  return validateUniqueParamNames(pathnamePattern);
}

/**
 * Asserts that a pathname pattern is valid.
 *
 * @param {unknown} pathnamePattern - Pathname pattern to validate.
 * @throws {PathnamePatternError} If the pathname pattern is not a string.
 * @throws {PathnamePatternError} If the pathname pattern is empty.
 * @throws {PathnamePatternError} If the pathname pattern exceeds the maximum length.
 * @throws {PathnamePatternError} If the pathname pattern syntax is invalid.
 * @throws {PathnamePatternError} If the pathname pattern has duplicate parameter names.
 * @example
 * ```js
 * assertPathnamePattern('/users/:id');
 * ```
 *
 * @example
 * ```js
 * assertPathnamePattern('/users/:id/:id');
 * // throws PathnamePatternError with code 'DUPLICATE_PARAMETER_NAME'
 * ```
 */
export function assertPathnamePattern(pathnamePattern) {
  const validation = validatePathnamePattern(pathnamePattern);
  if (!validation.ok) {
    throw validation.error;
  }
}

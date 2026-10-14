// @ts-check
/**
 * @file Defines the SecurityHeadersOptions middleware configuration option.
 *
 * @description SecurityHeadersOptions wraps a normalized
 * SecurityHeadersOptionsValue into the middleware configuration option
 * hierarchy.
 *
 * @module SecurityHeadersOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import SecurityHeadersOptionsValue from './SecurityHeadersOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the security headers options accepted by the server configuration.
 *
 * @typedef {import('./SecurityHeadersOptionsValue.mjs').SecurityHeadersOptionsInput} SecurityHeadersOptionsInput
 */

/**
 * Represents the normalized security headers options.
 *
 * @typedef {import('./SecurityHeadersOptionsValue.mjs').SecurityHeadersOptionsData} SecurityHeadersOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized security headers
 * configuration.
 *
 * @augments {MiddlewareOption<SecurityHeadersOptionsData|undefined>}
 */
class SecurityHeadersOptions extends MiddlewareOption {
  /**
   * Creates a new {@link SecurityHeadersOptions}.
   *
   * @param {SecurityHeadersOptionsInput} [options] - The security headers middleware options.
   * @example
   * ```js
   * const securityHeadersOptions = new SecurityHeadersOptions({
   *   contentSecurityPolicy: "default-src 'self'",
   *   xFrameOptions: 'DENY',
   * });
   * ```
   */
  constructor(options) {
    super('securityHeaders', new SecurityHeadersOptionsValue(options));
  }

  /**
   * Composes the security headers middleware configuration consumed by the
   * exchange layer builder.
   *
   * Security headers are a cross-cutting concern applied to every request
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = securityHeadersOptions.compose();
   * ```
   */
  compose() {
    return {
      name: this.name,
      options: this.value,
      pathnamePattern: undefined,
      method: undefined,
    };
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default SecurityHeadersOptions;

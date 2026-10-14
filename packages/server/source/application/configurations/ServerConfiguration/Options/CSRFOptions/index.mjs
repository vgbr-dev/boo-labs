// @ts-check
/**
 * @file Defines the CSRFOptions middleware configuration option.
 *
 * @description CSRFOptions wraps a normalized CSRFOptionsValue into the
 * middleware configuration option hierarchy.
 *
 * @module CSRFOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import CSRFOptionsValue from './CSRFOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the CSRF options accepted by the server configuration.
 *
 * @typedef {import('./CSRFOptionsValue.mjs').CSRFOptionsInput} CSRFOptionsInput
 */

/**
 * Represents the normalized CSRF options.
 *
 * @typedef {import('./CSRFOptionsValue.mjs').CSRFOptionsData} CSRFOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized CSRF configuration.
 *
 * @augments {MiddlewareOption<CSRFOptionsData|undefined>}
 */
class CSRFOptions extends MiddlewareOption {
  /**
   * Creates a new {@link CSRFOptions}.
   *
   * @param {CSRFOptionsInput} [options] - The CSRF middleware options.
   * @example
   * ```js
   * const CSRFOptions = new CSRFOptions({ cookieName: 'csrf' });
   * ```
   */
  constructor(options) {
    super('csrf', new CSRFOptionsValue(options));
  }

  /**
   * Composes the CSRF middleware configuration consumed by the exchange
   * layer builder.
   *
   * CSRF protection is a cross-cutting concern applied to every request
   * regardless of pathname or method, so both `pathnamePattern` and `method`
   * are `undefined`.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = CSRFOptions.compose();
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
export default CSRFOptions;

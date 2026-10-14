// @ts-check
/**
 * @file Defines the StaticOption middleware configuration option.
 *
 * @description StaticOption wraps a normalized StaticOptionsValue into the
 * middleware configuration option hierarchy.
 *
 * @module StaticOption
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import MiddlewareOption from '../MiddlewareOption.mjs';
import StaticOptionsValue from './StaticOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the static options accepted by the server configuration.
 *
 * @typedef {import('./StaticOptionsValue.mjs').StaticOptionsInput} StaticOptionsInput
 */

/**
 * Represents the normalized static options.
 *
 * @typedef {import('./StaticOptionsValue.mjs').StaticOptionsData} StaticOptionsData
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef {import('../MiddlewareOption.mjs').MiddlewareConfiguration} MiddlewareConfiguration
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Middleware configuration option wrapping a normalized static configuration.
 *
 * @augments {MiddlewareOption<StaticOptionsData|undefined>}
 */
class StaticOption extends MiddlewareOption {
  /**
   * Creates a new {@link StaticOption}.
   *
   * @param {StaticOptionsInput} [options] - The static middleware options.
   * @example
   * ```js
   * const staticOptions = new StaticOption({
   *   root: '/var/www/public',
   *   index: ['index.html'],
   *   maxAge: 0,
   *   etag: true,
   *   lastModified: true,
   *   fallthrough: true,
   *   extensions: undefined,
   *   dotfiles: false,
   * });
   * ```
   */
  constructor(options) {
    super('static', new StaticOptionsValue(options));
  }

  /**
   * Composes the static middleware configuration consumed by the exchange
   * layer builder.
   *
   * The `root` option is a filesystem concern and does not translate to a
   * layer-level pathname pattern. The middleware is scoped by the surrounding
   * `use()` registration when a mount path is required.
   *
   * @returns {MiddlewareConfiguration} The composed middleware configuration.
   * @example
   * ```js
   * const configuration = staticOptions.compose();
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
export default StaticOption;

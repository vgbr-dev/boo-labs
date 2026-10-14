// @ts-check
/**
 * @file Defines the abstract base for server configuration options.
 *
 * @description ServerOption identifies configuration options that belong to
 * the server layer (listen, request, response).
 *
 * @module ServerOption
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Options from './Options.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a value object wrapping a normalized configuration value.
 *
 * @template {Record<string, unknown>|undefined} TValue
 * @typedef {import('./Options.mjs').ValueObject<TValue>} ValueObject
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Abstract base class for server configuration options.
 *
 * @abstract
 * @template {Record<string, unknown>|undefined} TValue
 * @augments Options<TValue>
 */
class ServerOption extends Options {
  /**
   * Creates a server configuration option instance.
   *
   * @abstract
   * @param {string} name - Option name.
   * @param {ValueObject<TValue>} value - Normalized option value.
   * @throws {TypeError} If ServerOption is instantiated directly.
   */
  constructor(name, value) {
    if (new.target === ServerOption) {
      throw new TypeError('ServerOption is an abstract class and cannot be instantiated');
    }

    super('server', name, value.value);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ServerOption;

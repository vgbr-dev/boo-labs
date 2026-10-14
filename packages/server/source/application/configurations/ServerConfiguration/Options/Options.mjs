// @ts-check
/**
 * @file Defines the abstract base for configuration options.
 *
 * @description Options provides the common contract shared by configuration
 * option value objects. It cannot be instantiated directly.
 *
 * @module Options
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the kind of configuration option.
 *
 * @typedef {'server'|'middleware'} OptionType
 */

/**
 * Represents a value object wrapping a normalized configuration value.
 *
 * @template {Record<string, unknown>|undefined} TValue
 * @typedef {{ value: TValue }} ValueObject
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Abstract base class for configuration options.
 *
 * @template {Record<string, unknown>|undefined} TValue
 * @abstract
 */
class Options {
  /**
   * The option kind.
   *
   * @type {OptionType}
   */
  #type;

  /**
   * The option name.
   *
   * @type {string}
   */
  #name;

  /**
   * The option value.
   *
   * @type {TValue}
   */
  #value;

  /**
   * Creates a configuration option instance.
   *
   * @abstract
   * @param {OptionType} type - Option kind.
   * @param {string} name - Option name.
   * @param {TValue} value - Normalized option value.
   * @throws {TypeError} If Options is instantiated directly.
   */
  constructor(type, name, value) {
    if (new.target === Options) {
      throw new TypeError('Options is an abstract class and cannot be instantiated');
    }

    this.#type = type;
    this.#name = name;
    this.#value = value;
  }

  /**
   * The option kind.
   *
   * @readonly
   * @type {OptionType}
   */
  get type() {
    return this.#type;
  }

  /**
   * The option name.
   *
   * @readonly
   * @type {string}
   */
  get name() {
    return this.#name;
  }

  /**
   * The option value.
   *
   * @readonly
   * @type {TValue}
   */
  get value() {
    return this.#value;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Options;

// @ts-check
/**
 * @file Defines the ListenOptions server configuration option.
 *
 * @description ListenOptions wraps a normalized ListenOptionsValue into the
 * server configuration option hierarchy.
 *
 * @module ListenOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ServerOption from '../ServerOption.mjs';
import ListenOptionsValue from './ListenOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the listen options accepted by the server configuration.
 *
 * @typedef {import('./ListenOptionsValue.mjs').ListenOptionsInput} ListenOptionsInput
 */

/**
 * Represents the normalized listen options.
 *
 * @typedef {import('./ListenOptionsValue.mjs').ListenOptionsData} ListenOptionsData
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Server configuration option wrapping a normalized listen configuration.
 *
 * @augments {ServerOption<ListenOptionsData|undefined>}
 */
class ListenOptions extends ServerOption {
  /**
   * Creates a new {@link ListenOptions}.
   *
   * @param {ListenOptionsInput} [options] - The listen options.
   */
  constructor(options) {
    super('listen', new ListenOptionsValue(options));
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ListenOptions;

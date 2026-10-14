// @ts-check
/**
 * @file Defines the ResponseOptions server configuration option.
 *
 * @description ResponseOptions wraps a normalized ResponseOptionsValue into
 * the server configuration option hierarchy.
 *
 * @module ResponseOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ServerOption from '../ServerOption.mjs';
import ResponseOptionsValue from './ResponseOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the response options accepted by the server configuration.
 *
 * @typedef {import('./ResponseOptionsValue.mjs').ResponseOptionsInput} ResponseOptionsInput
 */

/**
 * Represents the normalized response options.
 *
 * @typedef {import('./ResponseOptionsValue.mjs').ResponseOptionsData} ResponseOptionsData
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Server configuration option wrapping a normalized response configuration.
 *
 * @augments {ServerOption<ResponseOptionsData|undefined>}
 */
class ResponseOptions extends ServerOption {
  /**
   * Creates a new {@link ResponseOptions}.
   *
   * @param {ResponseOptionsInput} [options] - The response options.
   */
  constructor(options) {
    super('response', new ResponseOptionsValue(options));
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ResponseOptions;

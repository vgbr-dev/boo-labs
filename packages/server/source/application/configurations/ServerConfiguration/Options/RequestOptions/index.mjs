// @ts-check
/**
 * @file Defines the RequestOptions server configuration option.
 *
 * @description RequestOptions wraps a normalized RequestOptionsValue into the
 * server configuration option hierarchy.
 *
 * @module RequestOptions
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ServerOption from '../ServerOption.mjs';
import RequestOptionsValue from './RequestOptionsValue.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the request options accepted by the server configuration.
 *
 * @typedef {import('./RequestOptionsValue.mjs').RequestOptionsInput} RequestOptionsInput
 */

/**
 * Represents the normalized request options.
 *
 * @typedef {import('./RequestOptionsValue.mjs').RequestOptionsData} RequestOptionsData
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Server configuration option wrapping a normalized request configuration.
 *
 * @augments {ServerOption<RequestOptionsData|undefined>}
 */
class RequestOptions extends ServerOption {
  /**
   * Creates a new {@link RequestOptions}.
   *
   * @param {RequestOptionsInput} [options] - The request options.
   */
  constructor(options) {
    super('request', new RequestOptionsValue(options));
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RequestOptions;

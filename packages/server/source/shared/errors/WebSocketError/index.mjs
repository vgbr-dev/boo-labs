/**
 * @file Defines the internal error type used for WebSocket failures.
 *
 * @description WebSocketError provides structured errors for WebSocket protocol
 * and connection failures, including errors that map to a WebSocket close code.
 *
 * @private
 * @module WebSocketError
 */

import BaseError from '../BaseError/index.mjs';

/**
 * @typedef {import('../BaseError/index.mjs').ErrorOptions} ErrorOptions
 */

/**
 * Internal error type used for WebSocket protocol and connection failures.
 *
 * @augments BaseError
 * @private
 */
class WebSocketError extends BaseError {
  /**
   * Creates a new {@link WebSocketError}.
   *
   * @param {string} identifier - A predefined WebSocket error identifier or a custom error message.
   * @param {ErrorOptions} [options] - Additional error options.
   * @example
   * ```js
   * throw new WebSocketError('WS_MESSAGE_TOO_BIG', {
   *   values: {
   *     size: payloadLength,
   *     maxSize: maxMessageSize,
   *   },
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Message template catalog indexed by WebSocket error identifier.
   *
   * @type {Map<string, string>}
   * @private
   * @static
   */
  static MESSAGES = new Map([
    [
      'WS_MESSAGE_TOO_BIG',
      'WebSocket payload size ({size} bytes) exceeds maximum allowed message size ({maxSize} bytes).',
    ],
  ]);
}

export default WebSocketError;

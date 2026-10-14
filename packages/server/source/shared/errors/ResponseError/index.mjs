/**
 * @file Defines domain-specific errors for response construction.
 *
 * @description ResponseError extends BaseError to provide structured,
 * identifiable errors specific to response status, headers, and body
 * validation. It centralizes error messages and supports template
 * placeholders for dynamic context.
 *
 * @module ResponseError
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import BaseError from '../BaseError/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @template {string} T
 * @typedef {T | (string & {})} LiteralUnion
 */

/**
 * Identifies a predefined response error or allows a custom error message.
 *
 * @typedef {LiteralUnion<
 * 'INVALID_STATUS_CODE' |
 * 'BODY_NOT_ALLOWED' |
 * 'RESPONSE_ALREADY_SENT' |
 * 'BODY_ALREADY_DESCRIBED' |
 * 'INVALID_BODY' |
 * 'INVALID_JSON' |
 * 'INVALID_STREAM' |
 * 'INVALID_REDIRECT_URL' |
 * 'INVALID_REDIRECT_STATUS' |
 * 'CONTENT_TYPE_LOCKED' |
 * 'INVALID_CACHE_DURATION' |
 * 'INVALID_HEADER_NAME' |
 * 'INVALID_HEADER_VALUE' |
 * 'INVALID_HEADERS' |
 * 'INVALID_CONTENT_TYPE'|
 * 'BODY_ALREADY_WRAPPED' |
 * 'BODY_NOT_DESCRIBED'
 * >} ResponseErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  ResponseErrorOptions
 * @property {Record<string, unknown>} [values]             - Values for template placeholders in the error message.
 * @property {unknown}                 [details]            - Additional contextual information about the error.
 * @property {Error}                   [cause]              - The original error that caused this error.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when a response cannot be constructed.
 *
 * @classdesc This error type provides identifiable failures related to
 * response status, headers, body composition, and commit operations.
 *
 * @augments BaseError
 * @private
 */
class ResponseError extends BaseError {
  /**
   * Creates a new {@link ResponseError}.
   *
   * @param {ResponseErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {ResponseErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new ResponseError('INVALID_STATUS_CODE', {
   *   values: { statusCode: 999 },
   * });
   * ```
   * @example
   * ```js
   * throw new ResponseError('BODY_NOT_ALLOWED', {
   *   values: { statusCode: 204 },
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined response error messages.
   *
   * Available error identifiers:
   *
   * - `'INVALID_STATUS_CODE'`.
   * - `'BODY_NOT_ALLOWED'`.
   * - `'RESPONSE_ALREADY_SENT'`.
   * - `'BODY_ALREADY_DESCRIBED'`.
   * - `'INVALID_BODY'`.
   * - `'INVALID_JSON'`.
   * - `'INVALID_STREAM'`.
   * - `'INVALID_REDIRECT_URL'`.
   * - `'INVALID_REDIRECT_STATUS'`.
   * - `'CONTENT_TYPE_LOCKED'`.
   * - `'INVALID_CACHE_DURATION'`.
   * - `'INVALID_HEADER_NAME'`.
   * - `'INVALID_HEADER_VALUE'`.
   * - `'INVALID_HEADERS'`.
   * - `'INVALID_CONTENT_TYPE'`.
   * - `'BODY_ALREADY_WRAPPED'`.
   * - `'BODY_NOT_DESCRIBED'`.
   *
   * @private
   * @static
   * @type {Map<ResponseErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    ['INVALID_STATUS_CODE', 'Invalid or unsupported HTTP status code: {statusCode}.'],
    ['BODY_NOT_ALLOWED', 'Status code {statusCode} does not allow a response body.'],
    ['RESPONSE_ALREADY_SENT', 'The response has already been committed.'],
    ['BODY_ALREADY_DESCRIBED', 'A response body has already been described.'],
    ['INVALID_BODY', 'Invalid response body. Received: {received}.'],
    ['INVALID_JSON', 'The value cannot be serialized as JSON.'],
    ['INVALID_STREAM', 'The provided value is not a valid stream.'],
    ['INVALID_REDIRECT_URL', 'The redirect URL must be a non-empty string.'],
    ['INVALID_REDIRECT_STATUS', 'Invalid redirect status code: {statusCode}.'],
    [
      'CONTENT_TYPE_LOCKED',
      'Cannot {operation} the Content-Type header after a body has been described.',
    ],
    ['INVALID_CACHE_DURATION', 'The cache duration must be a non-negative integer.'],
    ['INVALID_HEADER_NAME', 'Invalid HTTP header name.'],
    ['INVALID_HEADER_VALUE', 'Invalid HTTP header value.'],
    ['INVALID_HEADERS', 'Headers must be a plain object.'],
    ['INVALID_CONTENT_TYPE', 'Invalid Content-Type. Expected a string, but received {received}.'],
    ['BODY_ALREADY_WRAPPED', 'The response body has already been wrapped.'],
    ['BODY_NOT_DESCRIBED', 'A response body has not been described.'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ResponseError;

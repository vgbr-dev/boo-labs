/**
 * @file Defines domain-specific errors for request processing.
 *
 * @description RequestError extends BaseError to provide structured,
 * identifiable errors specific to request validation, body parsing,
 * and stream consumption. It centralizes error messages and supports
 * template placeholders for dynamic context.
 *
 * @module RequestError
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
 * Identifies a predefined request error or allows a custom error message.
 *
 * @typedef {LiteralUnion<
 * 'UNSUPPORTED_MEDIA_TYPE' |
 * 'BODY_PARSE_FAILED' |
 * 'BODY_LIMIT_EXCEEDED' |
 * 'MISSING_METHOD' |
 * 'INVALID_REQUEST_URL' |
 * 'BODY_STREAM_ERROR' |
 * 'INVALID_CONTENT_LENGTH' |
 * 'MISSING_HOST' |
 * 'INVALID_TRANSFER_ENCODING'
 * >} RequestErrorIdentifier
 */

/**
 * Options for creating an error instance.
 *
 * @typedef  {object}                  RequestErrorOptions
 * @property {Record<string, unknown>} [values]            - Values for template placeholders in the error message.
 * @property {unknown}                 [details]           - Additional contextual information about the error.
 * @property {Error}                   [cause]             - The original error that caused this error.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Error thrown when an incoming request cannot be processed.
 *
 * @classdesc This error type provides identifiable failures related to
 * incoming request validation, body parsing limits, and stream consumption.
 *
 * @augments BaseError
 * @private
 */
class RequestError extends BaseError {
  /**
   * Creates a new {@link RequestError}.
   *
   * @param {RequestErrorIdentifier} identifier - A predefined error identifier or a custom error message.
   * @param {RequestErrorOptions} [options] - Additional information used to format the message, attach domain details, or preserve the original cause.
   * @example
   * ```js
   * throw new RequestError('UNSUPPORTED_MEDIA_TYPE', {
   *   values: { mediaType: 'text/xml' },
   * });
   * ```
   * @example
   * ```js
   * throw new RequestError('BODY_LIMIT_EXCEEDED', {
   *   values: { bodySize: 15000000, bodyLimit: 10000000 },
   * });
   * ```
   */
  constructor(identifier, options = {}) {
    super(identifier, options);
  }

  /**
   * Collection of predefined request error messages.
   *
   * Available error identifiers:
   *
   * - `'UNSUPPORTED_MEDIA_TYPE'`.
   * - `'BODY_PARSE_FAILED'`.
   * - `'BODY_LIMIT_EXCEEDED'`.
   * - `'MISSING_METHOD'`.
   * - `'INVALID_REQUEST_URL'`.
   * - `'BODY_STREAM_ERROR'`.
   * - `'INVALID_CONTENT_LENGTH'`.
   * - `'MISSING_HOST'`.
   * - `'INVALID_TRANSFER_ENCODING'`.
   *
   * @private
   * @static
   * @type {Map<RequestErrorIdentifier, string>}
   */
  static MESSAGES = new Map([
    ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported media type: {mediaType}.'],
    ['BODY_PARSE_FAILED', 'Request body could not be parsed: {reason}.'],
    [
      'BODY_LIMIT_EXCEEDED',
      'Request body size ({bodySize} bytes) exceeds the configured limit ({bodyLimit} bytes).',
    ],
    ['MISSING_METHOD', 'The request does not declare an HTTP method.'],
    ['INVALID_REQUEST_URL', 'The request URL could not be parsed.'],
    ['BODY_STREAM_ERROR', 'The request body stream failed while being read.'],
    ['INVALID_CONTENT_LENGTH', 'Invalid Content-Length header: {contentLength}.'],
    ['MISSING_HOST', 'The request does not declare a valid authority.'],
    ['INVALID_TRANSFER_ENCODING', 'Invalid Transfer-Encoding header: {transferEncoding}.'],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RequestError;

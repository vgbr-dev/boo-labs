// @ts-check
/**
 * @file Defines the Response abstraction.
 *
 * @description Header values must remain compatible with the HTTP field-value ABNF.
 *
 * This class does not perform RFC 5987 encoding. Callers that need to emit
 * non-ASCII content (for example a UTF-8 filename in `Content-Disposition`)
 * are responsible for encoding the value themselves before passing it to
 * this class.
 *
 * @module Response
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

// » IMPORT LOCAL MODULES
import ResponseError from '#shared/errors/ResponseError';
import ResponseHeaders from './ResponseHeaders.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a native Node.js HTTP/1.1 server response.
 *
 * @typedef {import('node:http').ServerResponse} HttpServerResponse
 */

/**
 * Represents a native Node.js HTTP/2 server response.
 *
 * @typedef {import('node:http2').Http2ServerResponse} Http2ServerResponse
 */

/**
 * Represents a native Node.js readable stream.
 *
 * @typedef {import('node:stream').Readable} NodeReadable
 */

/**
 * Represents a native Node.js transform stream.
 *
 * @typedef {import('node:stream').Transform} NodeTransform
 */

/**
 * Represents a native Node.js HTTP/1.1 or HTTP/2 server response.
 *
 * @typedef {HttpServerResponse|Http2ServerResponse} ServerResponse
 */

/**
 * Represents the current state of the response body.
 *
 * The union is discriminated by the `kind` field, which allows the type
 * system to narrow the `value` field to the appropriate type for each state.
 *
 * @typedef {{ kind: 'none', value: null } |{ kind: 'buffer', value: string|Uint8Array }|{ kind: 'stream', value: NodeReadable }} ResponseBody
 */

/**
 * Identifies the kind of body currently described by a response.
 *
 * @typedef {'none'|'buffer'|'stream'} BodyKind
 */

/**
 * Handles response processing immediately before it is committed.
 *
 * @typedef {(response: Response) => void} CommitHook
 */

/**
 * Handles errors produced while committing a response.
 *
 * @typedef {(error: Error) => void} CommitErrorHook
 */

/**
 * Deferred source and transform used when the response body is wrapped.
 *
 * The pair is treated as a single unit of state: either no wrap is pending
 * (`null`) or both halves are present. There is no partially built state.
 *
 * @typedef  {object}        BodyWrap
 * @property {NodeReadable}  source    - Readable piped into the transform.
 * @property {NodeTransform} transform - Transform applied to the body.
 */

/**
 * Defines the lifecycle hooks and options supported by a response.
 *
 * @typedef  {object}          ResponseOptions
 * @property {CommitHook}      [onCommit]       - The hook invoked when response commitment begins. Errors thrown by this hook are forwarded to `onCommitError` and do not prevent the response from being sent.
 * @property {CommitErrorHook} [onCommitError]  - The hook invoked when response commitment produces an error.
 * @property {boolean}         [etag=false]     - Whether to generate a weak ETag for buffered bodies.
 * @property {string}          [defaultCharset] - Charset appended to eligible Content-Type headers when none is set.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maps HTTP status codes to their standard reason phrases.
 *
 * The map represents the set of final status codes supported by this
 * abstraction. Informational (`1xx`) codes and reserved/unused codes such
 * as `306` are intentionally excluded.
 *
 * @type {Map<number, string>}
 */
const HTTP_STATUS_CODES = new Map([
  [200, 'OK'],
  [201, 'Created'],
  [202, 'Accepted'],
  [203, 'Non-Authoritative Information'],
  [204, 'No Content'],
  [205, 'Reset Content'],
  [206, 'Partial Content'],
  [207, 'Multi-Status'],
  [208, 'Already Reported'],
  [226, 'IM Used'],
  [300, 'Multiple Choices'],
  [301, 'Moved Permanently'],
  [302, 'Found'],
  [303, 'See Other'],
  [304, 'Not Modified'],
  [305, 'Use Proxy'],
  [307, 'Temporary Redirect'],
  [308, 'Permanent Redirect'],
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [402, 'Payment Required'],
  [403, 'Forbidden'],
  [404, 'Not Found'],
  [405, 'Method Not Allowed'],
  [406, 'Not Acceptable'],
  [407, 'Proxy Authentication Required'],
  [408, 'Request Timeout'],
  [409, 'Conflict'],
  [410, 'Gone'],
  [411, 'Length Required'],
  [412, 'Precondition Failed'],
  [413, 'Payload Too Large'],
  [414, 'URI Too Long'],
  [415, 'Unsupported Media Type'],
  [416, 'Range Not Satisfiable'],
  [417, 'Expectation Failed'],
  [421, 'Misdirected Request'],
  [422, 'Unprocessable Entity'],
  [423, 'Locked'],
  [424, 'Failed Dependency'],
  [425, 'Too Early'],
  [426, 'Upgrade Required'],
  [428, 'Precondition Required'],
  [429, 'Too Many Requests'],
  [431, 'Request Header Fields Too Large'],
  [451, 'Unavailable For Legal Reasons'],
  [500, 'Internal Server Error'],
  [501, 'Not Implemented'],
  [502, 'Bad Gateway'],
  [503, 'Service Unavailable'],
  [504, 'Gateway Timeout'],
  [505, 'HTTP Version Not Supported'],
  [506, 'Variant Also Negotiates'],
  [507, 'Insufficient Storage'],
  [508, 'Loop Detected'],
  [510, 'Not Extended'],
  [511, 'Network Authentication Required'],
]);

/**
 * Identifies the HTTP status codes supported by `Response.redirect()`.
 *
 * @type {Set<number>}
 */
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

/**
 * Defines the default HTTP status code for a new response.
 *
 * @type {number}
 */
const DEFAULT_STATUS_CODE = 200;

/**
 * Identifies status codes that must not contain a response body.
 *
 * @type {Set<number>}
 */
const EMPTY_BODY_STATUS_CODES = new Set([204, 205, 304]);

/**
 * Detects an existing `charset` parameter in a `Content-Type` header value.
 *
 * @type {RegExp}
 */
const CHARSET_PARAMETER_PATTERN = /;\s*charset\s*=/i;

/**
 * Media types eligible for default charset application.
 *
 * @type {Set<string>}
 */
const CHARSET_ELIGIBLE_MEDIA_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
]);

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an outgoing HTTP response.
 *
 * @classdesc A response is built progressively by configuring its status,
 * headers, and body. Body description methods do not send anything to the client.
 * Only `end()` materializes the configured response and sends it through
 * the underlying server response.
 *
 * A response can describe at most one body. Once a body has been described,
 * another body description method throws `BODY_ALREADY_DESCRIBED`.
 *
 * Once a body has been described and a `Content-Type` header has been
 * established, that header becomes immutable for the rest of the response
 * lifecycle. This prevents a body description helper from being followed
 * by an incompatible content type.
 *
 * Switching to an empty-body status code (204, 205, 304) after a body has
 * already been described is not allowed and throws `BODY_NOT_ALLOWED`.
 *
 * Informational status codes (`1xx`) are not supported by this abstraction.
 * They are protocol-level messages that must be produced by dedicated
 * native APIs (`writeContinue()`, `writeEarlyHints()`) or by the transport
 * upgrade flow, not by a handler response.
 */
class Response {
  /**
   * The current HTTP status code.
   *
   * @type {number}
   */
  #statusCode = DEFAULT_STATUS_CODE;

  /**
   * The response headers.
   *
   * @type {ResponseHeaders}
   */
  #headers = new ResponseHeaders();

  /**
   * The current body state, discriminated by `kind`.
   *
   * @type {ResponseBody}
   */
  #body = { kind: 'none', value: null };

  /**
   * Whether the response has been committed.
   *
   * @type {boolean}
   */
  #committed = false;

  /**
   * The underlying server response.
   *
   * @type {ServerResponse}
   */
  #serverResponse;

  /**
   * The hook invoked when response commitment begins.
   *
   * @type {CommitHook|null}
   */
  #onCommit = null;

  /**
   * The hook invoked when response commitment produces an error.
   *
   * @type {CommitErrorHook|null}
   */
  #onCommitError = null;

  /**
   * Whether to generate a weak ETag for buffered bodies.
   *
   * @type {boolean}
   */
  #etag = false;

  /**
   * Charset appended to eligible `Content-Type` headers when none is set.
   *
   * @type {string|null}
   */
  #defaultCharset = null;

  /**
   * Deferred source and transform used when the response body is wrapped.
   *
   * `null` when no wrap is pending. Set only by `#wrapBody`; never exposed
   * publicly. Holds both halves of the pipeline stage as a single unit so
   * they cannot desynchronize.
   *
   * @type {BodyWrap|null}
   */
  #wrap = null;

  /**
   * Creates a response bound to a native Node.js server response.
   *
   * The optional commit hooks allow the surrounding `Exchange` to inject
   * behavior immediately before materialization and observe errors produced
   * during that process without coupling `Response` to that behavior.
   *
   * @param {ServerResponse} serverResponse - The native Node.js server response.
   * @param {ResponseOptions} [options] - The response lifecycle hooks and options.
   * @example
   * ```js
   * const response = new Response(serverResponse, {
   *   onCommit: (response) => telemetry.apply(response),
   *   onCommitError: (error) => telemetry.recordError(error),
   *   etag: true,
   *   defaultCharset: 'utf-8',
   * });
   * ```
   */
  constructor(serverResponse, options = {}) {
    this.#serverResponse = serverResponse;
    this.#onCommit = typeof options.onCommit === 'function' ? options.onCommit : null;
    this.#onCommitError =
      typeof options.onCommitError === 'function' ? options.onCommitError : null;
    this.#etag = options.etag === true;
    this.#defaultCharset =
      typeof options.defaultCharset === 'string' && options.defaultCharset.length > 0
        ? options.defaultCharset
        : null;
  }

  /**
   * The HTTP status code configured for the response.
   *
   * @type {number}
   */
  get statusCode() {
    return this.#statusCode;
  }

  /**
   * The standard reason phrase associated with the configured status code.
   *
   * Returns an empty string when the status code has no mapped reason phrase.
   *
   * @type {string}
   */
  get statusText() {
    return HTTP_STATUS_CODES.get(this.#statusCode) ?? '';
  }

  /**
   * Whether the response has already entered the committed state.
   *
   * A response is considered committed once `end()` has begun materializing
   * it. This means the response can no longer be modified through the public
   * API. It does not mean that the client has received the response; the
   * transport may still be writing bytes to the socket when this getter
   * returns `true`.
   *
   * @type {boolean}
   */
  get isCommitted() {
    return this.#committed;
  }

  /**
   * Describes the current body state of the response.
   *
   * - `'none'`: no body has been described.
   * - `'buffer'`: a buffered body has been described.
   * - `'stream'`: a stream body has been described.
   *
   * @type {BodyKind}
   */
  get bodyKind() {
    return this.#body.kind;
  }

  /**
   * Byte length of the described buffered body, or `undefined` when the
   * body is absent or is a stream.
   *
   * After `wrapBody()`, the body is a stream and this getter returns
   * `undefined`.
   *
   * @type {number|undefined}
   */
  get bodyLength() {
    if (this.#body.kind !== 'buffer') {
      return undefined;
    }

    const value = this.#body.value;
    return value instanceof Uint8Array ? value.byteLength : Buffer.byteLength(value);
  }

  /**
   * Sets the HTTP status code.
   *
   * The status code must be a supported final HTTP status code. Informational
   * status codes (`1xx`) are not supported by this abstraction. The status
   * cannot be changed after the response has been committed.
   *
   * Switching to an empty-body status code (204, 205, 304) after a body has
   * already been described is not allowed.
   *
   * @param {number} code - The HTTP status code.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If the status code is invalid or unsupported.
   * @throws {ResponseError} If an empty-body status is set after a body was described.
   * @example
   * ```js
   * response.status(201);
   * ```
   */
  status(code) {
    this.#assertNotCommitted();

    if (!Number.isInteger(code) || !HTTP_STATUS_CODES.has(code)) {
      throw new ResponseError('INVALID_STATUS_CODE', {
        values: { statusCode: code },
      });
    }

    if (EMPTY_BODY_STATUS_CODES.has(code) && this.#body.kind !== 'none') {
      throw new ResponseError('BODY_NOT_ALLOWED', {
        values: { statusCode: code },
      });
    }

    this.#statusCode = code;
    return this;
  }

  /**
   * Sets a response header.
   *
   * Header names are normalized to lowercase internally. Calling this method
   * replaces any existing value for the same header name.
   *
   * Once a body has been described and a `Content-Type` header has been
   * established, that header cannot be replaced.
   *
   * Header values must be compatible with the HTTP field-value syntax.
   * Non-ASCII encoding (RFC 5987) is the caller's responsibility.
   *
   * @param {string} name - The HTTP header name.
   * @param {string|number|(string|number)[]} value - The HTTP header value.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If the header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * response.setHeader('Content-Type', 'application/json');
   * ```
   */
  setHeader(name, value) {
    this.#assertNotCommitted();
    this.#headers.set(name, value);
    return this;
  }

  /**
   * Sets multiple response headers.
   *
   * Existing values are replaced when the supplied object contains the same
   * header name.
   *
   * @param {Record<string, string|number|(string|number)[]>} headers - The response headers to set.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If the headers value is not an object.
   * @throws {ResponseError} If any header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * response.setHeaders({
   *   'Content-Type': 'application/json',
   *   'Cache-Control': 'no-store',
   * });
   * ```
   */
  setHeaders(headers) {
    this.#assertNotCommitted();
    this.#headers.setMany(headers);
    return this;
  }

  /**
   * Appends a value to an existing header or creates the header when it does
   * not exist.
   *
   * Existing scalar values are converted to an array when another value is
   * appended.
   *
   * @param {string} name - The HTTP header name.
   * @param {string|number} value - The value to append.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If the header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * response
   *   .appendHeader('Set-Cookie', 'session=abc')
   *   .appendHeader('Set-Cookie', 'theme=dark');
   * ```
   */
  appendHeader(name, value) {
    this.#assertNotCommitted();
    this.#headers.append(name, value);
    return this;
  }

  /**
   * Returns the value of a response header.
   *
   * When the header value is an array, a defensive copy is returned so that
   * the caller cannot mutate the internal response state through the result.
   *
   * @param {string} name - The HTTP header name.
   * @returns {string|number|(string|number)[]|undefined} The header value, or `undefined` when the header does not exist.
   * @example
   * ```js
   * const contentType = response.getHeader('Content-Type');
   * ```
   */
  getHeader(name) {
    return this.#headers.get(name);
  }

  /**
   * Checks whether a response header exists.
   *
   * @param {string} name - The HTTP header name.
   * @returns {boolean} `true` when the header exists; otherwise, `false`.
   * @example
   * ```js
   * if (response.hasHeader('ETag')) {
   *   // The response already defines an ETag.
   * }
   * ```
   */
  hasHeader(name) {
    return this.#headers.has(name);
  }

  /**
   * Removes a response header.
   *
   * Removing a header that does not exist has no effect.
   *
   * @param {string} name - The HTTP header name.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * response.removeHeader('X-Debug');
   * ```
   */
  removeHeader(name) {
    this.#assertNotCommitted();
    this.#headers.remove(name);
    return this;
  }

  /**
   * Returns a frozen copy of the configured response headers.
   *
   * @returns {Readonly<Record<string, string|number|(string|number)[]>>} A frozen copy of the configured headers.
   * @example
   * ```js
   * const headers = response.getHeaders();
   * ```
   */
  getHeaders() {
    return Object.freeze(this.#headers.toObject());
  }

  /**
   * Describes a JSON response body.
   *
   * This method does not send the response. It serializes the supplied value,
   * sets a default JSON content type when one has not already been configured,
   * and stores the serialized body until `end()` is called.
   *
   * The method throws `INVALID_JSON` when JSON serialization does not produce
   * a JSON string or when serialization itself fails. `null` is a valid JSON
   * value and is preserved.
   *
   * @param {*} data - The value to serialize as JSON.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the current status does not allow a body.
   * @throws {ResponseError} If the value cannot be serialized as JSON.
   * @example
   * ```js
   * response
   *   .status(201)
   *   .json({ id: 42, name: 'Alice' })
   *   .end();
   * ```
   */
  json(data) {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();
    this.#assertBodyAllowed();

    const body = this.#serializeJson(data);

    this.#headers.ensureContentType('application/json');
    this.#body = { kind: 'buffer', value: body };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Describes an HTML response body.
   *
   * This method does not send the response. It sets a default HTML content
   * type when one has not already been configured.
   *
   * @param {string} content - The HTML content.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the current status does not allow a body.
   * @throws {ResponseError} If the content is not a string.
   * @example
   * ```js
   * response
   *   .status(200)
   *   .html('<h1>Hello</h1>')
   *   .end();
   * ```
   */
  html(content) {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();
    this.#assertBodyAllowed();
    this.#assertStringBody(content);

    this.#headers.ensureContentType('text/html');
    this.#body = { kind: 'buffer', value: content };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Describes a plain-text response body.
   *
   * This method does not send the response. It sets a default plain-text
   * content type when one has not already been configured.
   *
   * @param {string} content - The plain-text content.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the current status does not allow a body.
   * @throws {ResponseError} If the content is not a string.
   * @example
   * ```js
   * response
   *   .text('Hello, world!')
   *   .end();
   * ```
   */
  text(content) {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();
    this.#assertBodyAllowed();
    this.#assertStringBody(content);

    this.#headers.ensureContentType('text/plain');
    this.#body = { kind: 'buffer', value: content };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Describes an arbitrary string or binary response body.
   *
   * This method does not send the response and does not assign a default
   * content type.
   *
   * @param {string|Uint8Array} body - The response body. Defaults to an empty string.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the current status does not allow a body.
   * @throws {ResponseError} If the body is not a string or `Uint8Array`.
   * @example
   * ```js
   * response
   *   .setHeader('Content-Type', 'application/octet-stream')
   *   .send(buffer)
   *   .end();
   * ```
   */
  send(body = '') {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();
    this.#assertBodyAllowed();
    this.#assertBufferedBody(body);

    this.#body = { kind: 'buffer', value: body };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Describes a readable stream as the response body.
   *
   * This method does not send the response. The stream is connected to the
   * underlying server response only when `end()` is called.
   *
   * @param {NodeReadable} stream - The readable stream.
   * @param {string} [contentType] - The content type to use when none is already configured.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the current status does not allow a body.
   * @throws {ResponseError} If the stream is not a readable stream.
   * @throws {ResponseError} If `contentType` is provided and is not a string.
   * @example
   * ```js
   * response
   *   .stream(fileStream, 'application/pdf')
   *   .end();
   * ```
   */
  stream(stream, contentType) {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();
    this.#assertBodyAllowed();

    if (
      stream === null ||
      typeof stream !== 'object' ||
      typeof stream.pipe !== 'function' ||
      typeof stream.on !== 'function' ||
      stream.readable === false
    ) {
      throw new ResponseError('INVALID_STREAM');
    }

    if (contentType !== undefined) {
      this.#headers.ensureContentType(contentType);
    }

    this.#body = { kind: 'stream', value: stream };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Describes an HTTP redirect response.
   *
   * The redirect status must be one of the supported redirect status codes:
   * `301`, `302`, `303`, `307`, or `308`. The method does not assign a content
   * type because the redirect does not require a response body.
   *
   * Internally, the response is marked as having a buffered body to prevent
   * another body description from being added after the redirect is configured.
   *
   * @param {string} url - The redirect target.
   * @param {number} statusCode - The redirect status code. Defaults to `302`.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If another body has already been described.
   * @throws {ResponseError} If the URL is empty or not a string.
   * @throws {ResponseError} If the status code is not a supported redirect status.
   * @example
   * ```js
   * response
   *   .redirect('/login')
   *   .end();
   * ```
   *
   * @example
   * ```js
   * response
   *   .redirect('/new-location', 301)
   *   .end();
   * ```
   */
  redirect(url, statusCode = 302) {
    this.#assertNotCommitted();
    this.#assertBodyNotDescribed();

    if (typeof url !== 'string' || url.length === 0) {
      throw new ResponseError('INVALID_REDIRECT_URL');
    }

    if (!REDIRECT_STATUS_CODES.has(statusCode)) {
      throw new ResponseError('INVALID_REDIRECT_STATUS', {
        values: { statusCode },
      });
    }

    this.status(statusCode);
    this.setHeader('Location', url);

    this.#body = { kind: 'buffer', value: '' };
    this.#headers.lockContentType();
    return this;
  }

  /**
   * Adds one or more field names to the `Vary` response header.
   *
   * Duplicate values are ignored. Field names are normalized to lowercase.
   *
   * @param {...string} fields - Header field names to add to `Vary`.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {TypeError} If any field is not a non-empty string.
   * @example
   * ```js
   * response.vary('Accept', 'Accept-Encoding');
   * response.vary('Origin');
   * ```
   */
  vary(...fields) {
    this.#assertNotCommitted();

    if (fields.length === 0) {
      return this;
    }

    const existing = this.#headers.get('vary');
    const values = new Set();

    if (typeof existing === 'string') {
      for (const part of existing.split(',')) {
        const trimmed = part.trim().toLowerCase();
        if (trimmed) values.add(trimmed);
      }
    } else if (Array.isArray(existing)) {
      for (const item of existing) {
        const trimmed = String(item).trim().toLowerCase();
        if (trimmed) values.add(trimmed);
      }
    }

    for (const field of fields) {
      if (typeof field !== 'string' || field.trim().length === 0) {
        throw new TypeError('Vary field must be a non-empty string');
      }
      values.add(field.trim().toLowerCase());
    }

    return this.setHeader('Vary', [...values].join(', '));
  }

  /**
   * Configures a public cache lifetime using `Cache-Control`.
   *
   * @param {number} seconds - The maximum cache lifetime in seconds.
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If the duration is not a non-negative integer.
   * @example
   * ```js
   * response
   *   .cache(3600)
   *   .json({ message: 'cached' })
   *   .end();
   * ```
   */
  cache(seconds) {
    this.#assertNotCommitted();

    if (!Number.isInteger(seconds) || seconds < 0) {
      throw new ResponseError('INVALID_CACHE_DURATION');
    }

    return this.setHeader('Cache-Control', `public, max-age=${seconds}`);
  }

  /**
   * Disables client and intermediary caching for the response.
   *
   * @returns {this} The response instance.
   * @throws {ResponseError} If the response has already been committed.
   * @example
   * ```js
   * response
   *   .noCache()
   *   .json({ message: 'private data' })
   *   .end();
   * ```
   */
  noCache() {
    this.#assertNotCommitted();

    return this.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0');
  }

  /**
   * Materializes and sends the configured response.
   *
   * The method is idempotent. The first invocation runs the optional commit
   * hook, materializes the configured response, and marks it as committed.
   * Subsequent invocations return the same response without sending again.
   *
   * Errors produced by the commit hook, by the underlying transport calls,
   * or by a response stream are forwarded to the optional `onCommitError`
   * hook. Those errors are considered handled by that hook; `Response` does
   * not retry or otherwise recover the operation.
   *
   * Note: if a stream body fails after headers have been sent, the response
   * to the client is already in progress and cannot be reverted to a `500`
   * status. The error is forwarded to `onCommitError` for observability only.
   *
   * @returns {this} The response instance.
   * @example
   * ```js
   * response
   *   .status(200)
   *   .json({ message: 'ok' })
   *   .end();
   * ```
   *
   * @example
   * ```js
   * response.end();
   * response.end();
   * ```
   */
  end() {
    if (this.#committed) {
      return this;
    }

    if (this.#onCommit) {
      try {
        this.#onCommit(this);
      } catch (error) {
        this.#handleCommitError(this.#normalizeError(error));
      }
    }

    try {
      if (EMPTY_BODY_STATUS_CODES.has(this.#statusCode)) {
        if (this.#statusCode === 205) {
          this.#headers.set('content-length', '0');
        } else {
          this.#headers.remove('content-length');
        }

        this.#writeHead();
        this.#committed = true;
        this.#serverResponse.end();
        return this;
      }

      if (this.#body.kind === 'stream') {
        const stream = this.#body.value;

        this.#writeHead();
        this.#committed = true;

        /**
         * Handles errors produced by the response pipeline.
         *
         * @param {unknown} error - Error produced by the response pipeline.
         */
        const onError = error => {
          this.#handleCommitError(this.#normalizeError(error));
        };

        if (this.#wrap !== null) {
          pipeline(this.#wrap.source, this.#wrap.transform, this.#serverResponse).catch(onError);
        } else {
          pipeline(stream, this.#serverResponse).catch(onError);
        }

        return this;
      }

      const body = this.#body.value ?? '';
      const contentLength = body instanceof Uint8Array ? body.byteLength : Buffer.byteLength(body);

      if (this.#body.kind !== 'none') {
        this.#headers.set('content-length', String(contentLength));
      } else if (!this.#headers.has('content-length')) {
        this.#headers.set('content-length', '0');
      }

      if (this.#etag && !this.#headers.has('etag')) {
        this.#headers.set('etag', this.#computeEtag(body));
      }

      this.#writeHead();
      this.#committed = true;
      this.#serverResponse.end(body);
      return this;
    } catch (error) {
      this.#handleCommitError(this.#normalizeError(error));
      return this;
    }
  }

  /**
   * Writes the status line and headers to the underlying server response.
   *
   * HTTP/1.1 and HTTP/2 expose `writeHead` with incompatible TypeScript
   * signatures. Because the internal response can be either one, this method
   * narrows the type at runtime before calling `writeHead`, allowing
   * TypeScript to resolve a single signature per branch without relying on
   * a type assertion.
   *
   * The default charset is applied here, on the plain header object, so that
   * the locked `Content-Type` in `ResponseHeaders` is not mutated.
   */
  #writeHead() {
    const response = this.#serverResponse;
    const statusCode = this.#statusCode;

    /** @type {import('node:http').OutgoingHttpHeaders} */
    const headers = Object.create(null);
    const plainHeaders = this.#headers.toObject();

    for (const [name, value] of Object.entries(plainHeaders)) {
      headers[name] = Array.isArray(value) ? value.map(String) : value;
    }

    if (this.#defaultCharset && typeof headers['content-type'] === 'string') {
      headers['content-type'] = this.#applyDefaultCharset(headers['content-type']);
    }

    if ('stream' in response) {
      // Http2ServerResponse.
      response.writeHead(statusCode, headers);
    } else {
      // HttpServerResponse.
      response.writeHead(statusCode, headers);
    }
  }

  /**
   * Appends the configured default charset to a `Content-Type` value when
   * the media type is eligible and no charset parameter is already present.
   *
   * @param {string} contentType - The current `Content-Type` value.
   * @returns {string} The normalized `Content-Type` value.
   */
  #applyDefaultCharset(contentType) {
    if (CHARSET_PARAMETER_PATTERN.test(contentType)) {
      return contentType;
    }

    const [mediaType] = contentType.split(';', 1);
    const normalized = mediaType.trim().toLowerCase();

    const applies =
      normalized.startsWith('text/') ||
      CHARSET_ELIGIBLE_MEDIA_TYPES.has(normalized) ||
      normalized.endsWith('+json') ||
      normalized.endsWith('+xml');

    if (!applies) {
      return contentType;
    }

    return `${contentType.trim()}; charset=${this.#defaultCharset}`;
  }

  /**
   * Computes a weak ETag for a buffered body.
   *
   * @param {string|Uint8Array} body - The buffered body.
   * @returns {string} The weak ETag value.
   */
  #computeEtag(body) {
    const buffer = body instanceof Uint8Array ? body : Buffer.from(body);
    const hash = createHash('sha256').update(buffer).digest('base64url');
    return `W/"${hash}"`;
  }

  /**
   * Normalizes an unknown thrown value into an `Error` instance.
   *
   * JavaScript allows throwing any value. TypeScript types `catch` clauses
   * as `unknown`. This helper preserves existing `Error` instances and wraps
   * everything else in a new `Error` so downstream code always receives an
   * `Error`.
   *
   * @param {unknown} error - The value thrown or rejected.
   * @returns {Error} The normalized error instance.
   */
  #normalizeError(error) {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Serializes a value as JSON.
   *
   * @param {*} data - The value to serialize.
   * @returns {string} The serialized JSON string.
   * @throws {ResponseError} If the value cannot be serialized as JSON.
   */
  #serializeJson(data) {
    const body = this.#stringify(data);

    if (body === undefined) {
      throw new ResponseError('INVALID_JSON', {
        values: { reason: 'value is not serializable to JSON' },
      });
    }

    return body;
  }

  /**
   * Serializes a value using the native JSON serializer.
   *
   * @param {*} data - The value to serialize.
   * @returns {string|undefined} The serialized JSON string, or `undefined` when the value is not serializable as a JSON value.
   * @throws {ResponseError} If JSON serialization fails.
   */
  #stringify(data) {
    try {
      return JSON.stringify(data);
    } catch (error) {
      throw new ResponseError('INVALID_JSON', {
        cause: this.#normalizeError(error),
      });
    }
  }

  /**
   * Validates that a value is a string.
   *
   * @param {unknown} content - The value to validate.
   * @throws {ResponseError} If the value is not a string.
   */
  #assertStringBody(content) {
    if (typeof content !== 'string') {
      throw new ResponseError('INVALID_BODY', {
        values: {
          expected: 'string',
          received: content === null ? 'null' : typeof content,
        },
      });
    }
  }

  /**
   * Validates that a value is a supported buffered body.
   *
   * Accepted types:
   * - `string`.
   * - `Uint8Array` (includes Node.js `Buffer`).
   *
   * @param {unknown} body - The response body to validate.
   * @throws {ResponseError} If the body type is not supported.
   */
  #assertBufferedBody(body) {
    const isString = typeof body === 'string';
    const isBuffer = body instanceof Uint8Array;

    if (!isString && !isBuffer) {
      throw new ResponseError('INVALID_BODY', {
        values: {
          received: body === null ? 'null' : typeof body,
        },
      });
    }
  }

  /**
   * Forwards a commit error to the configured error hook.
   *
   * Errors thrown by the error hook itself are intentionally ignored because
   * the error hook is an observability boundary and must not create another
   * response failure.
   *
   * @param {Error} error - The error produced during response commitment.
   */
  #handleCommitError(error) {
    if (this.#onCommitError) {
      try {
        this.#onCommitError(error);
      } catch {
        // The error hook must never interrupt response processing.
      }
    }
  }

  /**
   * Ensures that the response has not already been committed.
   *
   * @throws {ResponseError} If the response has already been committed.
   */
  #assertNotCommitted() {
    if (this.#committed) {
      throw new ResponseError('RESPONSE_ALREADY_SENT');
    }
  }

  /**
   * Ensures that no body has already been described.
   *
   * @throws {ResponseError} If a body has already been described.
   */
  #assertBodyNotDescribed() {
    if (this.#body.kind !== 'none') {
      throw new ResponseError('BODY_ALREADY_DESCRIBED');
    }
  }

  /**
   * Ensures that the current status code permits a response body.
   *
   * @throws {ResponseError} If the current status code does not allow a body.
   */
  #assertBodyAllowed() {
    if (EMPTY_BODY_STATUS_CODES.has(this.#statusCode)) {
      throw new ResponseError('BODY_NOT_ALLOWED', {
        values: { statusCode: this.#statusCode },
      });
    }
  }

  /**
   * Restores the response to its initial uncommitted state.
   *
   * @returns {void}
   * @throws {ResponseError} If the response has already been committed.
   */
  #discardUncommittedState() {
    if (this.#committed) {
      throw new ResponseError('RESPONSE_ALREADY_SENT');
    }

    this.#statusCode = DEFAULT_STATUS_CODE;
    this.#headers = new ResponseHeaders();
    this.#body = { kind: 'none', value: null };
    this.#wrap = null;
  }

  /**
   * Prepares the current body to be piped through a Transform stream when
   * `end()` materializes the response.
   *
   * Does not start data flow. Buffer bodies become a `Readable` source;
   * stream bodies reuse the existing readable as source. The internal body
   * state becomes `{ kind: 'stream', value: transformStream }` and
   * `Content-Length` is removed.
   *
   * May be called at most once. Only while the response is not committed
   * and a body has already been described.
   *
   * @param {NodeTransform} transformStream - Transform suitable as an intermediate stage of `pipeline()`.
   * @throws {ResponseError} If the response has already been committed.
   * @throws {ResponseError} If no body has been described.
   * @throws {ResponseError} If the body has already been wrapped.
   * @throws {ResponseError} If `transformStream` is not a usable Transform.
   */
  #wrapBody(transformStream) {
    this.#assertNotCommitted();

    if (this.#wrap !== null) {
      throw new ResponseError('BODY_ALREADY_WRAPPED');
    }

    if (this.#body.kind === 'none') {
      throw new ResponseError('BODY_NOT_DESCRIBED');
    }

    if (
      transformStream === null ||
      typeof transformStream !== 'object' ||
      typeof transformStream.pipe !== 'function' ||
      typeof transformStream.on !== 'function' ||
      transformStream.readable !== true ||
      transformStream.writable !== true
    ) {
      throw new ResponseError('INVALID_STREAM');
    }

    const source =
      this.#body.kind === 'buffer'
        ? Readable.from([
            this.#body.value instanceof Uint8Array
              ? this.#body.value
              : Buffer.from(this.#body.value),
          ])
        : this.#body.value;

    this.#wrap = { source, transform: transformStream };
    this.#body = { kind: 'stream', value: transformStream };
    this.#headers.remove('content-length');
  }

  /**
   * Wraps the response body with a Transform stream.
   *
   * Runtime-internal entry point. Same pattern as `discardUncommittedState`.
   * Not part of the public instance API of Response.
   *
   * @param {Response} response - Response whose body is wrapped.
   * @param {NodeTransform} transformStream - Transform stream used as the intermediate pipeline stage.
   * @throws {TypeError} If `response` is not a `Response` instance.
   * @throws {ResponseError} If the response cannot be wrapped (see `#wrapBody`).
   * @example
   * ```js
   * import { createGzip } from 'node:zlib';
   * Response.wrapBody(response, createGzip());
   * ```
   */
  static wrapBody(response, transformStream) {
    if (!(response instanceof Response)) {
      throw new TypeError('Expected a Response instance');
    }

    response.#wrapBody(transformStream);
  }

  /**
   * Discards the uncommitted state of a response, restoring it to its
   * initial state.
   *
   * This operation is runtime-internal. It is intended to be called by the
   * Kernel when an error occurs before the response has been committed, so
   * that the system error handler can build a clean response.
   *
   * @param {Response} response - Response whose uncommitted state is discarded.
   * @throws {TypeError} If `response` is not a `Response` instance.
   * @throws {ResponseError} If the response has already been committed.
   * @example
   * ```js
   * // Kernel error recovery:
   * Response.discardUncommittedState(exchange.response);
   * await systemError(error, exchange);
   * exchange.response.end();
   * ```
   */
  static discardUncommittedState(response) {
    if (!(response instanceof Response)) {
      throw new TypeError('Expected a Response instance');
    }

    response.#discardUncommittedState();
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Response;

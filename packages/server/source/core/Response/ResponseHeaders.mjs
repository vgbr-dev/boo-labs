// @ts-check
/**
 * @file Defines the mutable response headers abstraction.
 *
 * @description `ResponseHeaders` owns the mutable header map of an outgoing
 * HTTP response. It validates header names and values, normalizes names to
 * lowercase, and enforces the `Content-Type` lock once the response body has
 * been described.
 *
 * The class does not know about the response body. It only knows when its
 * `Content-Type` becomes locked, which is signaled by `Response` through
 * `lockContentType()`.
 *
 * @module ResponseHeaders
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import ResponseError from '#shared/errors/ResponseError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a supported response header value.
 *
 * @typedef {string|number|(string|number)[]} ResponseHeaderValue
 */

/**
 * Represents the collection of response headers as a plain object.
 *
 * Used by `toObject()` and by the native `writeHead` call. The internal
 * representation of `ResponseHeaders` is a `Map`, not this type.
 *
 * @typedef {Record<string, ResponseHeaderValue>} ResponseHeadersData
 */

/**
 * Identifies the operation being performed on a response header.
 *
 * @typedef {'set'|'append'|'remove'} HeaderOperation
 */

/**
 * Represents an iterator over response header entries.
 *
 * @typedef {Iterator<[string, ResponseHeaderValue]>} ResponseHeadersIterator
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validates HTTP field names according to the HTTP token syntax.
 *
 * @type {RegExp}
 */
const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Validates HTTP field values supported by this response abstraction.
 *
 * @type {RegExp}
 */
const HEADER_VALUE_PATTERN = /^[\t\x20-\x7E\x80-\xFF]*$/;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Mutable, validated collection of outgoing HTTP response headers.
 *
 * @classdesc Response header names are normalized to lowercase. Values may
 * be strings, finite numbers, or arrays of strings and finite numbers.
 *
 * Once `lockContentType()` has been called, the `Content-Type` header can
 * no longer be set, appended, or removed.
 */
class ResponseHeaders {
  /**
   * Private snapshot of the normalized response headers.
   *
   * @type {Map<string, ResponseHeaderValue>}
   */
  #headers = new Map();

  /**
   * Whether the `Content-Type` header is locked.
   *
   * @type {boolean}
   */
  #contentTypeLocked = false;

  /**
   * Sets a response header, replacing any existing value.
   *
   * @param {string} name - The HTTP header name.
   * @param {ResponseHeaderValue} value - The HTTP header value.
   * @returns {void}
   * @throws {ResponseError} If the header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * headers.set('Content-Type', 'application/json');
   * headers.set('Content-Length', 42);
   * ```
   */
  set(name, value) {
    this.#assertHeader(name, value);
    this.#assertContentTypeNotLocked(name, 'set');
    this.#headers.set(name.toLowerCase(), value);
  }

  /**
   * Sets multiple response headers.
   *
   * @param {ResponseHeadersData} headers - The response headers to set.
   * @returns {void}
   * @throws {ResponseError} If the headers value is not an object.
   * @throws {ResponseError} If any header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * headers.setMany({
   *   'Content-Type': 'application/json',
   *   'Cache-Control': 'no-cache',
   *   'Content-Length': 42,
   * });
   * ```
   */
  setMany(headers) {
    if (headers === null || typeof headers !== 'object' || Array.isArray(headers)) {
      throw new ResponseError('INVALID_HEADERS');
    }

    for (const [name, value] of Object.entries(headers)) {
      this.set(name, value);
    }
  }

  /**
   * Appends a value to an existing header or creates the header when it
   * does not exist.
   *
   * Existing scalar values are converted to an array when another value is
   * appended.
   *
   * @param {string} name - The HTTP header name.
   * @param {string|number} value - The value to append.
   * @returns {void}
   * @throws {ResponseError} If the header name or value is invalid.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * headers.append('Set-Cookie', 'session=abc');
   * headers.append('Set-Cookie', 'theme=dark');
   *
   * headers.get('Set-Cookie');
   * // ['session=abc', 'theme=dark']
   * ```
   */
  append(name, value) {
    this.#assertHeader(name, value);
    this.#assertContentTypeNotLocked(name, 'append');

    const key = name.toLowerCase();
    const current = this.#headers.get(key);

    if (current === undefined) {
      this.#headers.set(key, value);
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      this.#headers.set(key, [current, value]);
    }
  }

  /**
   * Returns the value of a response header.
   *
   * When the header value is an array, a defensive copy is returned.
   *
   * @param {string} name - The HTTP header name.
   * @returns {ResponseHeaderValue|undefined} The header value, or `undefined` when the header does not exist.
   * @example
   * ```js
   * const contentType = headers.get('Content-Type');
   * ```
   */
  get(name) {
    const value = this.#headers.get(name.toLowerCase());
    return Array.isArray(value) ? [...value] : value;
  }

  /**
   * Checks whether a response header exists.
   *
   * @param {string} name - The HTTP header name.
   * @returns {boolean} `true` when the header exists; otherwise, `false`.
   * @example
   * ```js
   * if (headers.has('Content-Type')) {
   *   console.log('Content-Type is set');
   * }
   * ```
   */
  has(name) {
    return this.#headers.has(name.toLowerCase());
  }

  /**
   * Removes a response header.
   *
   * Removing a header that does not exist has no effect.
   *
   * @param {string} name - The HTTP header name.
   * @returns {void}
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * headers.remove('Cache-Control');
   * ```
   */
  remove(name) {
    this.#assertContentTypeNotLocked(name, 'remove');
    this.#headers.delete(name.toLowerCase());
  }

  /**
   * Sets a default `Content-Type` header when one has not already been set.
   *
   * @param {string} value - The default content type.
   * @returns {void}
   * @throws {ResponseError} If the value is not a string.
   * @throws {ResponseError} If `Content-Type` is already locked.
   * @example
   * ```js
   * headers.ensureContentType('application/json');
   * ```
   */
  ensureContentType(value) {
    if (typeof value !== 'string') {
      throw new ResponseError('INVALID_CONTENT_TYPE', {
        values: {
          expected: 'string',
          received: value === null ? 'null' : typeof value,
        },
      });
    }

    if (!this.#headers.has('content-type')) {
      this.set('content-type', value);
    }
  }

  /**
   * Locks the `Content-Type` header.
   *
   * After this method is called, the `Content-Type` header can no longer be
   * set, appended, or removed.
   *
   * @returns {void}
   * @example
   * ```js
   * headers.lockContentType();
   * ```
   */
  lockContentType() {
    this.#contentTypeLocked = true;
  }

  /**
   * Returns the names of all response headers.
   *
   * @returns {string[]} The normalized response header names.
   * @example
   * ```js
   * headers.set('Content-Type', 'application/json');
   * headers.set('Cache-Control', 'no-cache');
   *
   * const names = headers.getNames();
   * // ['content-type', 'cache-control']
   * ```
   */
  getNames() {
    return [...this.#headers.keys()];
  }

  /**
   * Returns an iterator over the response headers as `[name, value]` pairs.
   *
   * Array values are copied so the caller cannot mutate the internal snapshot
   * through the iterator.
   *
   * @yields {[string, ResponseHeaderValue]} The response header entry.
   * @returns {ResponseHeadersIterator} The response header entries.
   * @example
   * ```js
   * for (const [name, value] of headers.entries()) {
   *   console.log(name, value);
   * }
   * ```
   */
  *entries() {
    for (const [name, value] of this.#headers) {
      yield [name, Array.isArray(value) ? [...value] : value];
    }
  }

  /**
   * Returns an iterator over the response headers as `[name, value]` pairs.
   *
   * Makes `ResponseHeaders` directly iterable with `for...of`, spread, and
   * `Object.fromEntries`.
   *
   * @returns {ResponseHeadersIterator} The response header entries iterator.
   * @example
   * ```js
   * for (const [name, value] of headers) {
   *   console.log(name, value);
   * }
   * ```
   */
  [Symbol.iterator]() {
    return this.entries();
  }

  /**
   * Returns a plain object representation of the response headers.
   *
   * The returned object is a shallow copy. Array values are copied so the
   * caller cannot mutate the internal state through the result.
   *
   * @returns {ResponseHeadersData} A plain object representation of the headers.
   * @example
   * ```js
   * const headersObject = headers.toObject();
   * ```
   */
  toObject() {
    /** @type {ResponseHeadersData} */
    const result = Object.create(null);

    for (const [name, value] of this.#headers) {
      result[name] = Array.isArray(value) ? [...value] : value;
    }

    return result;
  }

  /**
   * Validates a response header name and value.
   *
   * @param {string} name - The HTTP header name.
   * @param {ResponseHeaderValue} value - The HTTP header value.
   * @throws {ResponseError} If the header name or value is invalid.
   */
  #assertHeader(name, value) {
    if (typeof name !== 'string' || !HEADER_NAME_PATTERN.test(name)) {
      throw new ResponseError('INVALID_HEADER_NAME');
    }

    const items = Array.isArray(value) ? value : [value];

    for (const item of items) {
      this.#assertHeaderValue(item);
    }
  }

  /**
   * Validates a response header value.
   *
   * @param {string|number} value - The header value to validate.
   * @throws {ResponseError} If the value is not a valid header value.
   */
  #assertHeaderValue(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new ResponseError('INVALID_HEADER_VALUE');
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new ResponseError('INVALID_HEADER_VALUE');
    }

    if (typeof value === 'string' && !HEADER_VALUE_PATTERN.test(value)) {
      throw new ResponseError('INVALID_HEADER_VALUE');
    }
  }

  /**
   * Ensures that the `Content-Type` header cannot be mutated once locked.
   *
   * @param {string} name - The HTTP header name being modified.
   * @param {HeaderOperation} operation - The operation being performed.
   * @throws {ResponseError} If `Content-Type` is already locked.
   */
  #assertContentTypeNotLocked(name, operation) {
    if (name.toLowerCase() === 'content-type' && this.#contentTypeLocked) {
      throw new ResponseError('CONTENT_TYPE_LOCKED', {
        values: { operation },
      });
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ResponseHeaders;

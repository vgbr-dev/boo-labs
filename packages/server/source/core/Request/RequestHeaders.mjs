// @ts-check
/**
 * @file Defines the immutable request headers abstraction.
 *
 * @description `RequestHeaders` is an immutable, case-insensitive view of
 * the headers received with an incoming HTTP message.
 *
 * HTTP/2 pseudo-headers (`:scheme`, `:authority`, `:method`, `:path`) are
 * filtered out so that consumers see a uniform header map across HTTP/1.1
 * and HTTP/2.
 *
 * Array values are copied on construction and on every read, so the internal
 * snapshot cannot be mutated through the public API.
 *
 * No validation is performed: Node.js has already validated the incoming
 * headers before they reach this abstraction.
 *
 * @module RequestHeaders
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single request header value.
 *
 * @typedef {string|string[]|undefined} RequestHeaderValue
 */

/**
 * Represents an iterator over request header entries.
 *
 * @typedef {IterableIterator<[string, RequestHeaderValue]>} RequestHeadersIterator
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable, case-insensitive view of incoming HTTP request headers.
 *
 * @classdesc Request headers are normalized to lowercase, pseudo-headers
 * are removed, and array values are defensively copied. The internal
 * snapshot is private and never exposed directly.
 */
class RequestHeaders {
  /**
   * Private snapshot of the normalized request headers.
   *
   * @type {Map<string, RequestHeaderValue>}
   */
  #headers;

  /**
   * Creates a request headers instance from an incoming header map.
   *
   * @param {Record<string, string|string[]|undefined>} incomingHeaders - The incoming header map.
   * @example
   * ```js
   * const headers = new RequestHeaders(incomingMessage.headers);
   * ```
   */
  constructor(incomingHeaders) {
    this.#headers = RequestHeaders.#buildSnapshot(incomingHeaders);
  }

  /**
   * Returns the value of a request header.
   *
   * Header names are matched case-insensitively. Array values are copied
   * so the caller cannot mutate the internal snapshot through the result.
   *
   * @param {string} name - The HTTP header name.
   * @returns {RequestHeaderValue} The header value, or `undefined` when the header does not exist.
   * @example
   * ```js
   * const contentType = headers.get('content-type');
   * ```
   */
  get(name) {
    const value = this.#headers.get(name.toLowerCase());
    return Array.isArray(value) ? [...value] : value;
  }

  /**
   * Checks whether a request header exists.
   *
   * @param {string} name - The HTTP header name.
   * @returns {boolean} `true` when the header exists; otherwise, `false`.
   * @example
   * ```js
   * if (headers.has('authorization')) { ... }
   * ```
   */
  has(name) {
    return this.#headers.has(name.toLowerCase());
  }

  /**
   * Returns the names of all request headers.
   *
   * The returned array serves as an index over the header collection and
   * can be used to iterate headers by name when the value alone is not
   * meaningful without its corresponding name.
   *
   * @returns {string[]} The normalized request header names.
   * @example
   * ```js
   * const names = headers.getNames();
   * ```
   */
  getNames() {
    return [...this.#headers.keys()];
  }

  /**
   * Returns an iterator over the request headers as `[name, value]` pairs.
   *
   * Array values are copied so the caller cannot mutate the internal snapshot
   * through the iterator.
   *
   * @yields {[string, RequestHeaderValue]} The request header entry.
   * @returns {RequestHeadersIterator} The request header entries.
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
   * Returns an iterator over the request headers as `[name, value]` pairs.
   *
   * Makes `RequestHeaders` directly iterable with `for...of`, spread, and
   * `Object.fromEntries`.
   *
   * @returns {RequestHeadersIterator} The request header entries iterator.
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
   * Builds the normalized header snapshot from the incoming header map.
   *
   * Pseudo-headers are filtered out, header names are normalized to
   * lowercase, and array values are copied.
   *
   * @param {Record<string, string|string[]|undefined>} incomingHeaders - The incoming header map.
   * @returns {Map<string, RequestHeaderValue>} The normalized header snapshot.
   */
  static #buildSnapshot(incomingHeaders) {
    /** @type {Map<string, RequestHeaderValue>} */
    const snapshot = new Map();

    for (const [name, value] of Object.entries(incomingHeaders)) {
      if (name.startsWith(':')) {
        continue;
      }

      snapshot.set(name.toLowerCase(), Array.isArray(value) ? [...value] : value);
    }

    return snapshot;
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RequestHeaders;

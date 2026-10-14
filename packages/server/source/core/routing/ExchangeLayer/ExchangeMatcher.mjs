// @ts-check
/**
 * @file Defines the request matching pattern used by the HTTP routing layer.
 *
 * @description Provides the ExchangeMatcher class for evaluating whether
 * incoming HTTP requests satisfy configured routing criteria using the native
 * URLPattern API.
 *
 * @module ExchangeMatcher
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single HTTP transaction.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {'GET'|'HEAD'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'QUERY'|'TRACE'} HTTPMethod
 */

/**
 * Defines the criteria used to match an HTTP exchange.
 *
 * @typedef  {object}               ExchangeMatcherOptions
 * @property {HTTPMethod|undefined} method                 - HTTP method to match. When undefined, any HTTP method is accepted.
 * @property {string|undefined}     pathnamePattern        - URL pathname pattern to match. When undefined, any pathname is accepted.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a request matching pattern.
 *
 * @classdesc ExchangeMatcher defines matching criteria composed of an
 * optional HTTP method and a pathname pattern.
 *
 * When the pathnamePattern is `undefined`, the pattern is considered global
 * and matches every pathname. If a method is specified, the method must still
 * match.
 */
class ExchangeMatcher {
  /**
   * HTTP method used as a matching criterion.
   *
   * @type {HTTPMethod|undefined}
   */
  #method;

  /**
   * Native URLPattern instance used to evaluate the pathname criterion.
   *
   * @type {URLPattern}
   */
  #pattern;

  /**
   * Indicates whether the matcher accepts every pathname.
   *
   * @type {boolean}
   */
  #isGlobal;

  /**
   * Creates an instance of ExchangeMatcher.
   *
   * @param {ExchangeMatcherOptions} options - Matching criteria.
   * @example
   * ```js
   * const matcher = new ExchangeMatcher({
   *   method: 'GET',
   *   pathnamePattern: '/users',
   * });
   * ```
   * @example
   * ```js
   * const matcher = new ExchangeMatcher({
   *   method: undefined,
   *   pathnamePattern: undefined,
   * });
   * ```
   */
  constructor({ method, pathnamePattern }) {
    this.#method = method;
    this.#isGlobal = pathnamePattern === undefined;
    this.#pattern = new URLPattern({ pathname: this.#isGlobal ? '*' : pathnamePattern });
  }

  /**
   * Tests whether the specified exchange matches this pattern.
   *
   * Evaluates the HTTP request method and pathname from the provided Exchange object
   * against the configured matching criteria to determine if this layer should handle it.
   *
   * @param {Exchange} exchange - The exchange object to evaluate.
   * @returns {boolean} `true` when the exchange matches the configured criteria; otherwise, `false`.
   * @example
   * ```js
   * const matcher = new ExchangeMatcher({
   *   method: 'POST',
   *   pathnamePattern: '/api/users',
   * });
   *
   * matcher.test(exchange); // true if exchange is POST /api/users
   * ```
   */
  test(exchange) {
    const method = exchange.request.method;

    if (this.#method && this.#method !== method.toUpperCase()) {
      return false;
    }

    if (this.#isGlobal) {
      return true;
    }

    const pathname = exchange.request.pathname;

    return this.#pattern.test({ pathname });
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ExchangeMatcher;

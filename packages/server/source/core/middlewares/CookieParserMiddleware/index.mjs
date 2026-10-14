// @ts-check
/**
 * @file Defines the Cookie Parser middleware.
 *
 * @description Parses the Cookie request header and exposes the resulting
 * name/value pairs on `exchange.state.cookies`. Supports optional URI decoding
 * of cookie values and quoted cookie values. Does not handle signed cookies or
 * Set-Cookie generation.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module CookieParserMiddleware
 */

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an HTTP exchange.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents a function that delegates execution to the next middleware
 * layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents a map of cookie names to their string values.
 *
 * @typedef {Record<string, string>} CookieMap
 */

/**
 * Represents normalized Cookie Parser middleware configuration.
 *
 * @typedef  {object}  CookieParserOptionsData
 * @property {boolean} decode                  - Whether cookie values are decoded with `decodeURIComponent`.
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Normalizes the Cookie request header into a single string.
 *
 * When the header is repeated, the values are joined with `"; "` so that a
 * single parse pass can process every cookie pair.
 *
 * @private
 * @param {string|string[]|undefined} value - Cookie header value to normalize.
 * @returns {string|undefined} The normalized header string, or `undefined` when no value exists.
 */
function normalizeCookieHeader(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join('; ') : undefined;
  }

  return value;
}

/**
 * Removes surrounding double quotes from a cookie value.
 *
 * @private
 * @param {string} value - Raw cookie value.
 * @returns {string} The unquoted cookie value.
 */
function unquoteCookieValue(value) {
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
}

/**
 * Decodes a cookie value with `decodeURIComponent`.
 *
 * Malformed percent-encoding is left unchanged so that a single bad value
 * does not abort parsing of the remaining cookies.
 *
 * @private
 * @param {string} value - Cookie value to decode.
 * @returns {string} The decoded value, or the original value when decoding fails.
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Parses a Cookie header into a name/value map.
 *
 * Segments without `=` and empty names are ignored. When the same name
 * appears more than once, the last occurrence wins.
 *
 * @private
 * @param {string} header - Raw Cookie header value.
 * @param {boolean} decode - Whether to URI-decode values.
 * @returns {CookieMap} The parsed cookie map.
 */
function parseCookieHeader(header, decode) {
  /** @type {CookieMap} */
  const cookies = Object.create(null);

  const segments = header.split(';');

  for (const segment of segments) {
    const separatorIndex = segment.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = segment.slice(0, separatorIndex).trim();

    if (name.length > 0) {
      const rawValue = segment.slice(separatorIndex + 1).trim();
      const unquotedValue = unquoteCookieValue(rawValue);

      cookies[name] = decode ? safeDecode(unquotedValue) : unquotedValue;
    }
  }

  return cookies;
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Parses the Cookie request header and stores the result on the exchange.
 *
 * @classdesc Reads the `Cookie` header, builds a name/value map, and assigns
 * it to `exchange.state.cookies` before calling `next()`. When the header is
 * absent or empty, `exchange.state.cookies` is set to an empty cookie map.
 *
 * The middleware does not modify the response and does not end the pipeline.
 */
class CookieParserMiddleware {
  /**
   * Normalized Cookie Parser middleware options.
   *
   * @type {Readonly<CookieParserOptionsData>}
   */
  #options;

  /**
   * Creates a Cookie Parser middleware.
   *
   * @param {CookieParserOptionsData} options - Validated and normalized cookie parser options.
   *
   * @example
   * ```
   * const middleware = new CookieParserMiddleware({
   *   decode: true,
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and populates `exchange.state.cookies`.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * ```js
   * await middleware.handle(exchange, next);
   * // exchange.state.cookies → { session: 'abc', theme: 'dark' }
   * ```
   */
  async handle(exchange, next) {
    const { request, state } = exchange;
    const { decode } = this.#options;

    const header = normalizeCookieHeader(request.getHeader('cookie'));

    if (typeof header === 'string' && header.length > 0) {
      state.cookies = parseCookieHeader(header, decode);
    } else {
      state.cookies = Object.create(null);
    }

    await next();
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CookieParserMiddleware;

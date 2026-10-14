// @ts-check
/**
 * @file Defines the CSRF middleware.
 *
 * @description Implements CSRF protection using the Double Submit Cookie
 * pattern. A cryptographically secure token is stored in a cookie and must be
 * echoed by the client in a configurable request header. Safe methods are not
 * validated; they only ensure the cookie is present.
 *
 * This is a classic Double Submit Cookie implementation: it verifies that the
 * cookie token and the header token match. It does not bind the token to a
 * server-side secret or session and therefore does not by itself prevent an
 * attacker who can set a cookie from choosing a known token value.
 *
 * The middleware is independent of session, authentication and CookieParser.
 * It reads the Cookie header directly and writes Set-Cookie when needed.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module CSRFMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NODE MODULES
import { randomBytes, timingSafeEqual } from 'node:crypto';

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
 * Represents normalized CSRF middleware configuration.
 *
 * @typedef  {object}                          CSRFOptionsData
 * @property {string}                          cookieName      - Name of the CSRF cookie.
 * @property {string}                          headerName      - Name of the request header that must carry the token.
 * @property {string[]}                        safeMethods     - HTTP methods that skip CSRF validation.
 * @property {number}                          tokenBytes      - Number of random bytes used to generate the token.
 * @property {string}                          path            - Cookie Path attribute.
 * @property {string|undefined}                domain          - Cookie Domain attribute.
 * @property {boolean}                         secure          - Whether the cookie is marked Secure.
 * @property {'Strict'|'Lax'|'None'|undefined} sameSite        - Cookie SameSite attribute.
 */

/**
 * Represents a parsed CSRF cookie.
 *
 * @typedef {(
 * {state: 'absent', value: undefined} |
 * {state: 'ambiguous', value: undefined} |
 * {state: 'present', value: string}
 * )} CookieResult
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Reads a header value only when it is a single unambiguous string.
 *
 * @private
 * @param {string|string[]|undefined} value - Header value from Request.
 * @returns {string|undefined} The single header value, or `undefined` when absent or ambiguous.
 */
function readSingleHeaderValue(value) {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Generates a cryptographically secure token.
 *
 * @private
 * @param {number} bytes - Number of random bytes used to generate the token.
 * @returns {string} The token encoded as base64url without padding.
 */
function generateToken(bytes) {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Compares two tokens using a constant-time comparison.
 *
 * @private
 * @param {string} left - First token.
 * @param {string} right - Second token.
 * @returns {boolean} Whether the tokens are equal.
 */
function tokensEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Reads a cookie by exact name.
 *
 * Duplicate occurrences of the same cookie name are treated as ambiguous
 * rather than selecting either the first or last occurrence.
 *
 * @private
 * @param {string|undefined} header - Raw Cookie header.
 * @param {string} name - Cookie name.
 * @returns {CookieResult} Parsed cookie result.
 */
function readCookie(header, name) {
  if (typeof header !== 'string' || header.length === 0) {
    return { state: 'absent', value: undefined };
  }

  const segments = header.split(';');
  const matchingSegments = segments.filter(segment => {
    const separatorIndex = segment.indexOf('=');

    if (separatorIndex === -1) {
      return false;
    }

    return segment.slice(0, separatorIndex).trim() === name;
  });

  if (matchingSegments.length === 0) {
    return { state: 'absent', value: undefined };
  }

  if (matchingSegments.length > 1) {
    return { state: 'ambiguous', value: undefined };
  }

  const separatorIndex = matchingSegments[0].indexOf('=');
  const rawValue = matchingSegments[0].slice(separatorIndex + 1).trim();
  const value =
    rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1)
      : rawValue;

  if (value.length === 0) {
    return { state: 'absent', value: undefined };
  }

  return { state: 'present', value };
}

/**
 * Builds a Set-Cookie header value for the CSRF token cookie.
 *
 * The cookie is intentionally not marked HttpOnly so that browser clients
 * can read it and place the value in the request header. The cookie is a
 * session cookie because no Max-Age or Expires attribute is set.
 *
 * @private
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {CSRFOptionsData} options - CSRF cookie configuration.
 * @returns {string} The Set-Cookie header value.
 */
function buildSetCookie(name, value, options) {
  const parts = [`${name}=${value}`, `Path=${options.path}`];

  if (typeof options.domain === 'string') {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (typeof options.sameSite === 'string') {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Protects state-changing requests against Cross-Site Request Forgery.
 *
 * @classdesc Implements the Double Submit Cookie pattern. Safe methods only
 * ensure that a CSRF cookie exists. Other methods require the same token to be
 * sent in the configured request header.
 *
 * Duplicate CSRF cookies and ambiguous CSRF headers are rejected.
 */
class CSRFMiddleware {
  /**
   * Normalized CSRF middleware options.
   *
   * @type {Readonly<CSRFOptionsData>}
   */
  #options;

  /**
   * Creates a CSRF middleware.
   *
   * @param {CSRFOptionsData} options - Validated and normalized CSRF options.
   *
   * @example
   * ```js
   * const middleware = new CsrfMiddleware({
   *   cookieName: 'csrf-token',
   *   headerName: 'x-csrf-token',
   *   safeMethods: ['GET', 'HEAD', 'OPTIONS'],
   *   tokenBytes: 32,
   *   path: '/',
   *   domain: undefined,
   *   secure: true,
   *   sameSite: 'Lax',
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and enforces CSRF protection.
   *
   * Safe methods ensure that the CSRF cookie exists. Other methods require a
   * matching and unambiguous request header token. Validation failures end
   * the response with status 403 without invoking `next()`.
   *
   * The current token is exposed on `exchange.state.csrfToken`.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * ```js
   * await middleware.handle(exchange, next);
   * ```
   */
  async handle(exchange, next) {
    const { request, response, state } = exchange;
    const { cookieName, headerName, safeMethods, tokenBytes } = this.#options;

    const cookieHeader = readSingleHeaderValue(request.getHeader('cookie'));
    const cookie = readCookie(cookieHeader, cookieName);
    const method = request.method;
    const isSafeMethod = typeof method === 'string' && safeMethods.includes(method);

    if (cookie.state === 'ambiguous') {
      response.status(403).json({ error: 'Forbidden' });
    } else if (isSafeMethod) {
      const token = cookie.state === 'present' ? cookie.value : generateToken(tokenBytes);

      if (cookie.state !== 'present') {
        response.appendHeader('Set-Cookie', buildSetCookie(cookieName, token, this.#options));
      }

      state.csrfToken = token;
      await next();
    } else if (cookie.state !== 'present') {
      response.status(403).json({ error: 'Forbidden' });
    } else {
      const headerToken = readSingleHeaderValue(request.getHeader(headerName));

      const hasMatchingToken =
        typeof headerToken === 'string' &&
        headerToken.length > 0 &&
        tokensEqual(cookie.value, headerToken);

      if (hasMatchingToken) {
        state.csrfToken = cookie.value;
        await next();
      } else {
        response.status(403).json({ error: 'Forbidden' });
      }
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CSRFMiddleware;

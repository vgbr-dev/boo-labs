// @ts-check
/**
 * @file Defines the Cookie Session middleware.
 *
 * @description Stores session data entirely in a signed cookie. Supports key
 * rotation, configurable cookie attributes, and automatic persistence of
 * session mutations after the rest of the pipeline completes.
 *
 * Session state is exposed on `exchange.state.session` as a mutable object
 * without a prototype. When the request carries no valid session cookie, an
 * empty object is provided. Assigning `null` or `undefined` to
 * `exchange.state.session` clears the cookie.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module CookieSessionMiddleware
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NODE MODULES
import { createHmac, timingSafeEqual } from 'node:crypto';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an HTTP exchange.
 *
 * @typedef {import('#Exchange').default} Exchange
 */

/**
 * Represents an outgoing HTTP response.
 *
 * @typedef {import('#Response').default} Response
 */

/**
 * Represents a function that delegates execution to the next middleware
 * layer.
 *
 * @typedef {() => void | Promise<void>} NextFunction
 */

/**
 * Represents session data stored in the cookie.
 *
 * @typedef {Record<string, unknown>} SessionData
 */

/**
 * Represents normalized Cookie Session middleware configuration.
 *
 * @typedef  {object}                          CookieSessionOptionsData
 * @property {string}                          name                     - Name of the session cookie.
 * @property {string[]}                        keys                     - Signing keys. The first key is used to sign; all keys are tried when verifying.
 * @property {number|undefined}                maxAge                   - Cookie max-age in milliseconds. When `undefined`, the cookie is a session cookie.
 * @property {string}                          path                     - Cookie path attribute.
 * @property {string|undefined}                domain                   - Cookie domain attribute.
 * @property {boolean}                         secure                   - Whether the cookie is marked Secure.
 * @property {boolean}                         httpOnly                 - Whether the cookie is marked HttpOnly.
 * @property {'Strict'|'Lax'|'None'|undefined} sameSite                 - Cookie SameSite attribute.
 * @property {boolean}                         overwrite                - Whether an existing Set-Cookie header with the same name should be overwritten.
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
 * Encodes a buffer as base64url without padding.
 *
 * @private
 * @param {Buffer} buffer - Buffer to encode.
 * @returns {string} The base64url string.
 */
function toBase64Url(buffer) {
  return buffer.toString('base64url');
}

/**
 * Decodes a base64url string into a buffer.
 *
 * @private
 * @param {string} value - Base64url string.
 * @returns {Buffer} The decoded buffer.
 */
function fromBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

/**
 * Signs a payload with HMAC-SHA256 using the given key.
 *
 * @private
 * @param {string} payload - Base64url payload to sign.
 * @param {string} key - Signing key.
 * @returns {string} The base64url signature.
 */
function sign(payload, key) {
  return toBase64Url(createHmac('sha256', key).update(payload).digest());
}

/**
 * Compares two signatures in constant time.
 *
 * @private
 * @param {string} left - First signature.
 * @param {string} right - Second signature.
 * @returns {boolean} Whether the signatures are equal.
 */
function signaturesEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/**
 * Verifies a signed cookie value against the configured keys.
 *
 * @private
 * @param {string} value - Raw cookie value in the form `payload.signature`.
 * @param {string[]} keys - Signing keys to try.
 * @returns {string|null} The verified base64url payload, or `null` when verification fails.
 */
function verify(value, keys) {
  const separatorIndex = value.lastIndexOf('.');

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);

  for (const key of keys) {
    const expected = sign(payload, key);

    if (signaturesEqual(signature, expected)) {
      return payload;
    }
  }

  return null;
}

/**
 * Serializes session data into a signed cookie value.
 *
 * @private
 * @param {SessionData} session - Session object to serialize.
 * @param {string} key - Signing key.
 * @returns {string} The signed cookie value.
 */
function encodeSession(session, key) {
  const json = JSON.stringify(session);
  const payload = toBase64Url(Buffer.from(json, 'utf8'));
  const signature = sign(payload, key);

  return `${payload}.${signature}`;
}

/**
 * Deserializes a verified payload into session data.
 *
 * @private
 * @param {string} payload - Verified base64url payload.
 * @returns {SessionData|null} The session object, or `null` when the payload is invalid.
 */
function decodeSession(payload) {
  const buffer = fromBase64Url(payload);

  try {
    const parsed = JSON.parse(buffer.toString('utf8'));

    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return /** @type {SessionData} */ (parsed);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts the last occurrence of the session cookie from the Cookie header.
 *
 * @private
 * @param {string|undefined} header - Raw Cookie header.
 * @param {string} name - Session cookie name.
 * @returns {string|undefined} The cookie value, or `undefined` when absent.
 */
function readCookie(header, name) {
  if (typeof header !== 'string' || header.length === 0) {
    return undefined;
  }

  const matchedSegment = header.split(';').findLast(segment => {
    const separatorIndex = segment.indexOf('=');

    return separatorIndex !== -1 && segment.slice(0, separatorIndex).trim() === name;
  });

  if (matchedSegment === undefined) {
    return undefined;
  }

  const separatorIndex = matchedSegment.indexOf('=');
  const rawValue = matchedSegment.slice(separatorIndex + 1).trim();

  return rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"')
    ? rawValue.slice(1, -1)
    : rawValue;
}

/**
 * Builds a Set-Cookie header value for the session cookie.
 *
 * @private
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value. An empty string clears the cookie.
 * @param {CookieSessionOptionsData} options - Cookie attributes.
 * @param {boolean} clear - Whether the cookie should be expired.
 * @returns {string} The Set-Cookie header value.
 */
function buildSetCookie(name, value, options, clear) {
  const parts = [`${name}=${value}`];

  if (clear) {
    parts.push('Max-Age=0');
  } else if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  parts.push(`Path=${options.path}`);

  if (typeof options.domain === 'string') {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (typeof options.sameSite === 'string') {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join('; ');
}

/**
 * Writes or replaces the session Set-Cookie header on the response.
 *
 * When `overwrite` is `false` and a cookie with the same name already exists,
 * the existing value is preserved and no header is written.
 *
 * @private
 * @param {Response} response - Response to modify.
 * @param {string} setCookie - Set-Cookie header value.
 * @param {string} name - Session cookie name.
 * @param {boolean} overwrite - Whether to replace an existing cookie with the same name.
 */
function writeSetCookie(response, setCookie, name, overwrite) {
  const existing = response.getHeader('Set-Cookie');

  if (existing === undefined) {
    response.setHeader('Set-Cookie', setCookie);
  } else if (overwrite) {
    const prefix = `${name}=`;
    const values = Array.isArray(existing)
      ? existing.map(value => String(value))
      : [String(existing)];
    const filtered = values.filter(value => !value.startsWith(prefix));

    filtered.push(setCookie);
    response.setHeader('Set-Cookie', filtered);
  }
}

/**
 * Produces a stable JSON snapshot of the session for change detection.
 *
 * @private
 * @param {SessionData|null|undefined} session - Session to snapshot.
 * @returns {string} Serialized snapshot.
 */
function snapshot(session) {
  if (session === null || session === undefined) {
    return '';
  }

  return JSON.stringify(session);
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Stores session data in a signed cookie.
 *
 * @classdesc Loads a signed session cookie into `exchange.state.session`,
 * delegates to the rest of the pipeline, and persists any mutations back to
 * the cookie. Invalid or missing cookies result in an empty object.
 *
 * Session state is exposed on `exchange.state.session` as a mutable object
 * without a prototype. Assigning `null` or `undefined` to
 * `exchange.state.session` clears the cookie.
 *
 * Signing uses HMAC-SHA256. The first configured key is used to sign; all
 * keys are accepted when verifying so that key rotation is possible.
 *
 * @example
 * ```js
 * const middleware = new CookieSessionMiddleware({
 *   name: 'sid',
 *   keys: ['current-secret', 'previous-secret'],
 *   maxAge: 86_400_000,
 *   path: '/',
 *   domain: undefined,
 *   secure: true,
 *   httpOnly: true,
 *   sameSite: 'Lax',
 *   overwrite: true,
 * });
 * ```
 */
class CookieSessionMiddleware {
  /**
   * Normalized Cookie Session middleware options.
   *
   * @type {Readonly<CookieSessionOptionsData>}
   */
  #options;

  /**
   * Creates a Cookie Session middleware.
   *
   * @param {CookieSessionOptionsData} options - Validated and normalized cookie session options.
   *
   * @example
   * ```js
   * const middleware = new CookieSessionMiddleware({
   *   name: 'sid',
   *   keys: ['current-secret', 'previous-secret'],
   *   maxAge: 86_400_000,
   *   path: '/',
   *   domain: undefined,
   *   secure: true,
   *   httpOnly: true,
   *   sameSite: 'Lax',
   *   overwrite: true,
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and manages the session cookie.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * ```js
   * await middleware.handle(exchange, next);
   * // exchange.state.session → { userId: '42' }
   * ```
   */
  async handle(exchange, next) {
    const { request, response, state } = exchange;
    const { name, keys, overwrite } = this.#options;

    const header = normalizeCookieHeader(request.getHeader('cookie'));
    const rawCookie = readCookie(header, name);
    const { session, snapshot: initialSnapshot } = this.#loadSession(rawCookie, keys);

    state.session = session;

    await next();

    const current = state.session;
    const currentSnapshot = snapshot(
      current !== null &&
        current !== undefined &&
        typeof current === 'object' &&
        !Array.isArray(current)
        ? /** @type {SessionData} */ (current)
        : null,
    );

    if (currentSnapshot !== initialSnapshot) {
      if (current === null || current === undefined) {
        writeSetCookie(response, buildSetCookie(name, '', this.#options, true), name, overwrite);
      } else if (typeof current === 'object' && !Array.isArray(current)) {
        const encoded = encodeSession(/** @type {SessionData} */ (current), keys[0]);

        writeSetCookie(
          response,
          buildSetCookie(name, encoded, this.#options, false),
          name,
          overwrite,
        );
      }
    }
  }

  /**
   * Loads and verifies the session from the raw cookie value.
   *
   * @param {string|undefined} rawCookie - Raw cookie value.
   * @param {string[]} keys - Signing keys.
   * @returns {{ session: SessionData, snapshot: string }} Loaded session and its initial snapshot.
   */
  #loadSession(rawCookie, keys) {
    if (typeof rawCookie === 'string' && rawCookie.length > 0) {
      const payload = verify(rawCookie, keys);

      if (payload !== null) {
        const decoded = decodeSession(payload);

        if (decoded !== null) {
          return { session: decoded, snapshot: snapshot(decoded) };
        }
      }
    }

    const empty = /** @type {SessionData} */ (Object.create(null));

    return { session: empty, snapshot: snapshot(empty) };
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CookieSessionMiddleware;

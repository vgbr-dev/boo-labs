// @ts-check
/**
 * @file Defines the Rate Limit middleware.
 *
 * @description Limits the number of requests a client can make within a
 * fixed time window. Uses an in-memory store keyed by client IP address.
 * Supports both the modern RateLimit-* headers and the legacy X-RateLimit-*
 * headers.
 *
 * This middleware maintains rate-limit state in process memory. It is
 * therefore local to the current server process and does not provide
 * distributed rate limiting across multiple processes or instances.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module RateLimitMiddleware
 */

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
 * Represents a single client's rate-limit record.
 *
 * @typedef  {object} RateLimitRecord
 * @property {number} count           - Number of requests observed in the current window.
 * @property {number} resetTime       - Unix timestamp (ms) when the current window expires.
 */

/**
 * Represents normalized Rate Limit middleware configuration.
 *
 * @typedef  {object}                  RateLimitOptionsData
 * @property {number}                  windowMs             - Duration of the rate-limit window in milliseconds.
 * @property {number}                  max                  - Maximum number of requests allowed per window per client.
 * @property {number}                  statusCode           - HTTP status code returned when the limit is exceeded.
 * @property {Record<string, unknown>} message              - JSON body sent when the limit is exceeded.
 * @property {boolean}                 standardHeaders      - Whether to send the modern `RateLimit-*` headers.
 * @property {boolean}                 legacyHeaders        - Whether to send the legacy `X-RateLimit-*` headers.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Writes the configured rate-limit headers onto the response.
 *
 * `RateLimit-Reset` and `X-RateLimit-Reset` contain the number of seconds
 * remaining until the current window resets, not an absolute Unix timestamp.
 *
 * @private
 * @param {Response} response - Response to which the rate-limit headers are written.
 * @param {boolean} standardHeaders - Whether to send modern RateLimit headers.
 * @param {boolean} legacyHeaders - Whether to send legacy X-RateLimit headers.
 * @param {number} limit - Configured maximum requests.
 * @param {number} remaining - Remaining requests in the current window.
 * @param {number} resetTime - Unix timestamp (ms) when the window resets.
 * @param {number} now - Current time in milliseconds.
 */
function setRateLimitHeaders(
  response,
  standardHeaders,
  legacyHeaders,
  limit,
  remaining,
  resetTime,
  now,
) {
  const resetDeltaSeconds = Math.max(0, Math.ceil((resetTime - now) / 1000));
  const normalizedRemaining = Math.max(0, remaining);

  if (standardHeaders) {
    response.setHeader('RateLimit-Limit', String(limit));
    response.setHeader('RateLimit-Remaining', String(normalizedRemaining));
    response.setHeader('RateLimit-Reset', String(resetDeltaSeconds));
  }

  if (legacyHeaders) {
    response.setHeader('X-RateLimit-Limit', String(limit));
    response.setHeader('X-RateLimit-Remaining', String(normalizedRemaining));
    response.setHeader('X-RateLimit-Reset', String(resetDeltaSeconds));
  }
}

/**
 * Removes expired entries from the rate-limit store.
 *
 * @private
 * @param {Map<string, RateLimitRecord>} store - In-memory store.
 * @param {number} now - Current time in milliseconds.
 */
function purgeExpired(store, now) {
  for (const [key, record] of store) {
    if (now >= record.resetTime) {
      store.delete(key);
    }
  }
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Limits the number of requests a client can make within a fixed time
 * window.
 *
 * @classdesc Maintains an in-memory store of request counts keyed by client
 * IP. When a client exceeds the configured maximum, the middleware responds
 * with the configured status code and message and does not call `next()`.
 *
 * Rate-limit state is local to the current server process. When the request
 * IP is unavailable, rate limiting is skipped and control is delegated to
 * `next()`.
 */
class RateLimitMiddleware {
  /**
   * Normalized Rate Limit middleware options.
   *
   * @type {Readonly<RateLimitOptionsData>}
   */
  #options;

  /**
   * In-memory store of rate-limit records keyed by client IP.
   *
   * @type {Map<string, RateLimitRecord>}
   */
  #store = new Map();

  /**
   * Timestamp of the last store cleanup.
   *
   * @type {number}
   */
  #lastCleanup = Date.now();

  /**
   * Creates a Rate Limit middleware.
   *
   * @param {RateLimitOptionsData} options - Validated and normalized rate limit options.
   *
   * @example
   * ```js
   * const middleware = new RateLimitMiddleware({
   *   windowMs: 60_000,
   *   max: 100,
   *   statusCode: 429,
   *   message: { error: 'Too Many Requests' },
   *   standardHeaders: true,
   *   legacyHeaders: false,
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and enforces the configured rate limit.
   *
   * When the client is under the limit the middleware sets the appropriate
   * rate-limit headers and calls `next()`. When the limit is exceeded it
   * writes the error response, including `Retry-After`, and ends the
   * pipeline.
   *
   * If the request has no resolvable IP address, rate limiting is skipped
   * and control is passed to the next middleware.
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
    const { request, response } = exchange;
    const { windowMs, max, statusCode, message, standardHeaders, legacyHeaders } = this.#options;

    const ip = request.ip;

    if (typeof ip !== 'string') {
      await next();
    } else {
      const now = Date.now();
      const existing = this.#store.get(ip);

      const record =
        existing === undefined || now >= existing.resetTime
          ? { count: 0, resetTime: now + windowMs }
          : existing;

      record.count += 1;
      this.#store.set(ip, record);

      // Time-based cleanup prevents unbounded growth on low-traffic servers.
      if (now - this.#lastCleanup >= windowMs) {
        purgeExpired(this.#store, now);
        this.#lastCleanup = now;
      }

      const remaining = max - record.count;

      setRateLimitHeaders(
        response,
        standardHeaders,
        legacyHeaders,
        max,
        remaining,
        record.resetTime,
        now,
      );

      if (record.count > max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

        response.setHeader('Retry-After', String(retryAfterSeconds));
        response.status(statusCode).json(message);
      } else {
        await next();
      }
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default RateLimitMiddleware;

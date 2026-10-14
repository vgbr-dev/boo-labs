// @ts-check
/**
 * @file Defines the CORS middleware.
 *
 * @description Implements Cross-Origin Resource Sharing (CORS) without
 * external dependencies. Supports origin reflection and allow-lists,
 * preflight handling, credentials, exposed headers, and configurable
 * preflight caching.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module CorsMiddleware
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
 * Represents normalized CORS middleware configuration.
 *
 * @typedef  {object}               CorsOptionsData
 * @property {true|string|string[]} origin               - Allowed origin(s).
 * @property {string[]}             methods              - Allowed HTTP methods for preflight responses.
 * @property {string[]|undefined}   allowedHeaders       - Headers the client is allowed to send. When `undefined`, the value of Access-Control-Request-Headers is reflected.
 * @property {string[]|undefined}   exposedHeaders       - Headers the client is allowed to read from the response.
 * @property {boolean}              credentials          - Whether the response may include credentials.
 * @property {number|undefined}     maxAge               - How long (in seconds) the preflight response may be cached.
 * @property {boolean}              preflightContinue    - Whether to call `next()` on successful preflight instead of ending the response.
 * @property {number}               optionsSuccessStatus - Status code used for successful preflight responses.
 */

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Reads a header value as a single string.
 *
 * @private
 * @param {string|string[]|undefined} value - Header value to normalize.
 * @returns {string|undefined} The first header value, or `undefined` when no value exists.
 */
function firstHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolves the value that should be written to
 * Access-Control-Allow-Origin.
 *
 * @private
 * @param {true|string|string[]} originConfig - Configured origin option.
 * @param {string|undefined} requestOrigin - Origin header from the request.
 * @returns {string|null} The header value to set, or `null` when the origin is not allowed.
 */
function resolveAllowOrigin(originConfig, requestOrigin) {
  if (originConfig === true) {
    return typeof requestOrigin === 'string' ? requestOrigin : null;
  }

  if (typeof originConfig === 'string') {
    if (originConfig === '*') {
      return '*';
    }

    return originConfig === requestOrigin ? originConfig : null;
  }

  if (typeof requestOrigin === 'string' && originConfig.includes(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

/**
 * Serializes an array of tokens into a comma-separated header value.
 *
 * @private
 * @param {string[]} values - Header tokens to serialize.
 * @returns {string} The serialized header value.
 */
function joinHeaderValues(values) {
  return values.join(', ');
}

/**
 * Applies the CORS headers shared by preflight and actual requests.
 *
 * @private
 * @param {Response} response - Response to which the CORS headers are applied.
 * @param {string} allowOrigin - Value for the Access-Control-Allow-Origin header.
 * @param {boolean} credentials - Whether to allow credentials in the response.
 */
function applyBaseCorsHeaders(response, allowOrigin, credentials) {
  response.setHeader('Access-Control-Allow-Origin', allowOrigin);

  if (credentials) {
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Implements Cross-Origin Resource Sharing (CORS).
 *
 * @classdesc The middleware handles both simple CORS requests and preflight
 * (OPTIONS) requests according to the Fetch specification.
 *
 * When the request origin is not allowed, no CORS headers are written and
 * processing is delegated to `next()`.
 */
class CorsMiddleware {
  /**
   * Normalized CORS middleware options.
   *
   * @type {Readonly<CorsOptionsData>}
   */
  #options;

  /**
   * Creates a CORS middleware.
   *
   * The `origin` option may be `true` to reflect the request origin, a
   * string for a fixed origin or `"*"`, or an array of allowed origins.
   *
   * @param {CorsOptionsData} options - Validated and normalized CORS options.
   *
   * @example
   * ```js
   * const middleware = new CorsMiddleware({
   *   origin: true,
   *   methods: ['GET', 'POST'],
   *   credentials: true,
   *   preflightContinue: false,
   *   optionsSuccessStatus: 204,
   * });
   * ```
   *
   * @example
   * ```js
   * const middleware = new CorsMiddleware({
   *   origin: true,
   *   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
   *   allowedHeaders: undefined,
   *   exposedHeaders: ['X-Request-Id'],
   *   credentials: true,
   *   maxAge: 86400,
   *   preflightContinue: false,
   *   optionsSuccessStatus: 204,
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and applies CORS headers.
   *
   * For preflight (OPTIONS) requests the middleware may end the response
   * early, depending on `preflightContinue`. For non-preflight requests,
   * it applies the appropriate CORS response headers and delegates
   * processing to `next()`.
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
    const { origin: originConfig } = this.#options;

    const requestOrigin = firstHeaderValue(request.getHeader('origin'));
    const allowOrigin = resolveAllowOrigin(originConfig, requestOrigin);

    if (allowOrigin === null) {
      await next();
    } else {
      if (originConfig === true || Array.isArray(originConfig)) {
        response.vary('Origin');
      }

      if (request.method === 'OPTIONS') {
        await this.#handlePreflight(exchange, allowOrigin, next);
      } else {
        await this.#handleActualRequest(exchange, allowOrigin, next);
      }
    }
  }

  /**
   * Handles preflight (OPTIONS) requests.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {string} allowOrigin - Value for the Access-Control-Allow-Origin header.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   */
  async #handlePreflight(exchange, allowOrigin, next) {
    const { request, response } = exchange;
    const {
      methods,
      allowedHeaders,
      credentials,
      maxAge,
      preflightContinue,
      optionsSuccessStatus,
    } = this.#options;

    const requestMethod = firstHeaderValue(request.getHeader('access-control-request-method'));

    if (typeof requestMethod !== 'string' || !methods.includes(requestMethod)) {
      await next();
      return;
    }

    applyBaseCorsHeaders(response, allowOrigin, credentials);
    response.setHeader('Access-Control-Allow-Methods', joinHeaderValues(methods));

    if (allowedHeaders !== undefined) {
      response.setHeader('Access-Control-Allow-Headers', joinHeaderValues(allowedHeaders));
    } else {
      const requestHeaders = request.getHeader('access-control-request-headers');

      if (typeof requestHeaders === 'string') {
        response.setHeader('Access-Control-Allow-Headers', requestHeaders);
        response.vary('Access-Control-Request-Headers');
      } else if (Array.isArray(requestHeaders) && requestHeaders.length > 0) {
        response.setHeader('Access-Control-Allow-Headers', joinHeaderValues(requestHeaders));
        response.vary('Access-Control-Request-Headers');
      }
    }

    if (typeof maxAge === 'number') {
      response.setHeader('Access-Control-Max-Age', String(maxAge));
    }

    if (preflightContinue) {
      await next();
    } else {
      response.status(optionsSuccessStatus).end();
    }
  }

  /**
   * Handles actual (non-preflight) CORS requests.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {string} allowOrigin - Value for the Access-Control-Allow-Origin header.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   */
  async #handleActualRequest(exchange, allowOrigin, next) {
    const { response } = exchange;
    const { exposedHeaders, credentials } = this.#options;

    applyBaseCorsHeaders(response, allowOrigin, credentials);

    if (exposedHeaders !== undefined && exposedHeaders.length > 0) {
      response.setHeader('Access-Control-Expose-Headers', joinHeaderValues(exposedHeaders));
    }

    await next();
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default CorsMiddleware;

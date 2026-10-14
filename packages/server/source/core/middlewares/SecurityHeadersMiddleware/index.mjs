// @ts-check
/**
 * @file Defines the Security Headers middleware.
 *
 * @description Applies a curated collection of HTTP security headers to
 * responses. Supports modern security policies and selected legacy
 * compatibility headers.
 *
 * Configuration is expected to be validated and normalized before the
 * middleware is created.
 *
 * @module SecurityHeadersMiddleware
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
 * Represents normalized Security Headers middleware configuration.
 *
 * A value of `false` disables the corresponding header. String values are
 * written to the response as provided.
 *
 * @typedef  {object}       SecurityHeadersOptionsData
 * @property {string|false} contentSecurityPolicy         - Value for the Content-Security-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginEmbedderPolicy     - Value for the Cross-Origin-Embedder-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginOpenerPolicy       - Value for the Cross-Origin-Opener-Policy header, or `false` to omit it.
 * @property {string|false} crossOriginResourcePolicy     - Value for the Cross-Origin-Resource-Policy header, or `false` to omit it.
 * @property {string|false} originAgentCluster            - Value for the Origin-Agent-Cluster header, or `false` to omit it.
 * @property {string|false} permissionsPolicy             - Value for the Permissions-Policy header, or `false` to omit it.
 * @property {string|false} referrerPolicy                - Value for the Referrer-Policy header, or `false` to omit it.
 * @property {string|false} strictTransportSecurity       - Value for the Strict-Transport-Security header, or `false` to omit it.
 * @property {string|false} xContentTypeOptions           - Value for the X-Content-Type-Options header, or `false` to omit it.
 * @property {string|false} xDnsPrefetchControl           - Value for the X-DNS-Prefetch-Control header, or `false` to omit it.
 * @property {string|false} xDownloadOptions              - Value for the X-Download-Options header, or `false` to omit it.
 * @property {string|false} xFrameOptions                 - Value for the X-Frame-Options header, or `false` to omit it.
 * @property {string|false} xPermittedCrossDomainPolicies - Value for the X-Permitted-Cross-Domain-Policies header, or `false` to omit it.
 * @property {string|false} xXssProtection                - Value for the legacy X-XSS-Protection header, or `false` to omit it.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Maps configuration properties to their corresponding HTTP security headers.
 *
 * @type {Readonly<Array<readonly [keyof SecurityHeadersOptionsData, string]>>}
 */
const SECURITY_HEADERS = [
  ['contentSecurityPolicy', 'Content-Security-Policy'],
  ['crossOriginEmbedderPolicy', 'Cross-Origin-Embedder-Policy'],
  ['crossOriginOpenerPolicy', 'Cross-Origin-Opener-Policy'],
  ['crossOriginResourcePolicy', 'Cross-Origin-Resource-Policy'],
  ['originAgentCluster', 'Origin-Agent-Cluster'],
  ['permissionsPolicy', 'Permissions-Policy'],
  ['referrerPolicy', 'Referrer-Policy'],
  ['strictTransportSecurity', 'Strict-Transport-Security'],
  ['xContentTypeOptions', 'X-Content-Type-Options'],
  ['xDnsPrefetchControl', 'X-DNS-Prefetch-Control'],
  ['xDownloadOptions', 'X-Download-Options'],
  ['xFrameOptions', 'X-Frame-Options'],
  ['xPermittedCrossDomainPolicies', 'X-Permitted-Cross-Domain-Policies'],
  ['xXssProtection', 'X-XSS-Protection'],
];

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Applies configured HTTP security headers to an HTTP exchange.
 *
 * @classdesc Writes enabled security headers before delegating to the next
 * middleware. The middleware does not end the response itself.
 */
class SecurityHeadersMiddleware {
  /**
   * Normalized Security Headers middleware options.
   *
   * @type {Readonly<SecurityHeadersOptionsData>}
   */
  #options;

  /**
   * Creates a Security Headers middleware.
   *
   * @param {SecurityHeadersOptionsData} options - Validated and normalized security headers options.
   *
   * @example
   * ```js
   * const middleware = new SecurityHeadersMiddleware({
   *   contentSecurityPolicy: "default-src 'self'",
   *   crossOriginEmbedderPolicy: false,
   *   crossOriginOpenerPolicy: 'same-origin',
   *   crossOriginResourcePolicy: false,
   *   originAgentCluster: false,
   *   permissionsPolicy: 'geolocation=(), microphone=()',
   *   referrerPolicy: 'no-referrer',
   *   strictTransportSecurity: 'max-age=31536000; includeSubDomains',
   *   xContentTypeOptions: 'nosniff',
   *   xDnsPrefetchControl: false,
   *   xDownloadOptions: false,
   *   xFrameOptions: 'SAMEORIGIN',
   *   xPermittedCrossDomainPolicies: false,
   *   xXssProtection: '0',
   * });
   * ```
   */
  constructor(options) {
    this.#options = options;
  }

  /**
   * Processes an HTTP exchange and applies the configured security headers.
   *
   * @param {Exchange} exchange - Exchange to process.
   * @param {NextFunction} next - Function that delegates to the next middleware.
   * @returns {Promise<void>} Resolves when request processing has completed.
   *
   * @example
   * await middleware.handle(exchange, next);
   */
  async handle(exchange, next) {
    const { response } = exchange;

    for (const [optionKey, headerName] of SECURITY_HEADERS) {
      const value = this.#options[optionKey];

      if (typeof value === 'string') {
        response.setHeader(headerName, value);
      }
    }

    await next();
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default SecurityHeadersMiddleware;

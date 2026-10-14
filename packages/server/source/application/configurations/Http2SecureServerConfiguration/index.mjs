// @ts-check
/**
 * @file Defines the HTTP/2 secure server configuration.
 *
 * @description Provides the configuration used to create and operate a
 * Node.js HTTP/2 server over a TLS connection.
 *
 * Http2SecureServerConfiguration defines the server-level configuration for
 * listening, request handling, response handling, static file serving,
 * cross-origin resource sharing, security headers, rate limiting, cookies,
 * CSRF protection, response compression, and the underlying HTTP/2 connection.
 *
 * @module Http2SecureServerConfiguration
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES
import ServerConfiguration from '../ServerConfiguration/index.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * HTTP/2 secure server connection options.
 *
 * @typedef {import('node:http2').SecureServerOptions} Http2SecureConnectionOptions
 */

/**
 * Identity of a secure HTTP/2 server.
 *
 * @typedef  {object}                       Http2SecureServerConfigurationIdentity
 * @property {'https'}                      protocol                               - Application-level protocol.
 * @property {'h2'}                         transport                              - Transport identifier for HTTP/2 over TLS.
 * @property {Http2SecureConnectionOptions} [connection]                           - HTTP/2 secure connection options.
 */

/**
 * Represents the listen options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/ListenOptions').ListenOptionsInput} ListenOptionsInput
 */

/**
 * Represents the request options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/RequestOptions').RequestOptionsInput} RequestOptionsInput
 */

/**
 * Represents the response options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/ResponseOptions').ResponseOptionsInput} ResponseOptionsInput
 */

/**
 * Represents the static file serving options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/StaticOptions').StaticOptionsInput} StaticOptionsInput
 */

/**
 * Represents the CORS options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CORSOptions').CORSOptionsInput} CORSOptionsInput
 */

/**
 * Represents the security headers options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/SecurityHeadersOptions').SecurityHeadersOptionsInput} SecurityHeadersOptionsInput
 */

/**
 * Represents the rate limit options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/RateLimitOptions').RateLimitOptionsInput} RateLimitOptionsInput
 */

/**
 * Represents the cookie parser options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CookieParserOptions').CookieParserOptionsInput} CookieParserOptionsInput
 */

/**
 * Represents the cookie session options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CookieSessionOptions').CookieSessionOptionsInput} CookieSessionOptionsInput
 */

/**
 * Represents the CSRF options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CSRFOptions').CSRFOptionsInput} CSRFOptionsInput
 */

/**
 * Represents the compression options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CompressOptions').CompressOptionsInput} CompressOptionsInput
 */

/**
 * Represents the cookie options accepted by the server configuration.
 *
 * @typedef  {object}                    CookieOptionsInput
 * @property {CookieParserOptionsInput}  [parser]           - Cookie parser configuration.
 * @property {CookieSessionOptionsInput} [session]          - Cookie session configuration.
 */

/**
 * Options accepted by {@link Http2SecureServerConfiguration}.
 *
 * @typedef  {object}                       Http2SecureServerConfigurationOptions
 * @property {Http2SecureConnectionOptions} [connection]                          - HTTP/2 secure server connection options.
 * @property {ListenOptionsInput}           [listen]                              - Server listening configuration.
 * @property {RequestOptionsInput}          [request]                             - Request handling configuration.
 * @property {ResponseOptionsInput}         [response]                            - Response handling configuration.
 * @property {StaticOptionsInput}           [static]                              - Static file serving configuration.
 * @property {CORSOptionsInput}             [cors]                                - CORS configuration.
 * @property {SecurityHeadersOptionsInput}  [securityHeaders]                     - Security headers configuration.
 * @property {RateLimitOptionsInput}        [rateLimit]                           - Rate limit configuration.
 * @property {CookieOptionsInput}           [cookie]                              - Cookie configuration.
 * @property {CSRFOptionsInput}             [csrf]                                - CSRF configuration.
 * @property {CompressOptionsInput}         [compress]                            - Compression configuration.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Configuration for a Node.js HTTP/2 server operating over TLS.
 *
 * @classdesc Http2SecureServerConfiguration provides the server configuration
 * required to create and operate an HTTP/2 server over TLS, including
 * connection, listening, request, response, static file serving, CORS,
 * security headers, rate limiting, cookie, CSRF, and compression options.
 *
 * @augments ServerConfiguration<Http2SecureServerConfigurationIdentity>
 */
class Http2SecureServerConfiguration extends ServerConfiguration {
  /**
   * Creates a new {@link Http2SecureServerConfiguration}.
   *
   * @param {Http2SecureServerConfigurationOptions} options - Server configuration options.
   *
   * @example
   * ```js
   * const configuration = new Http2SecureServerConfiguration({
   *   listen: {
   *     host: 'localhost',
   *     port: 3443,
   *   },
   *   connection: {
   *     cert: './cert.pem',
   *     key: './key.pem',
   *   },
   * });
   * ```
   */
  constructor(options) {
    super({
      ...options,
      transport: 'h2',
      protocol: 'https',
    });
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Http2SecureServerConfiguration;

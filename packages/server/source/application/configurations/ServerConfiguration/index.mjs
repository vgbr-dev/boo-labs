// @ts-check
/**
 * @file Defines the ServerConfiguration abstraction.
 *
 * @description Provides the base configuration for a server.
 *
 * ServerConfiguration defines the common configuration shared by server
 * implementations and is extended by transport-specific configuration classes.
 *
 * @module ServerConfiguration
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { inspect } from 'node:util';

// » IMPORT LOCAL MODULES
import { SERVER_CONFIGURATION_BRAND } from '#shared/constants/symbols/brands';
import ListenOptions from '#ServerOptions/ListenOptions';
import RequestOptions from '#ServerOptions/RequestOptions';
import ResponseOptions from '#ServerOptions/ResponseOptions';
import StaticOptions from '#ServerOptions/StaticOptions';
import CORSOptions from '#ServerOptions/CORSOptions';
import SecurityHeadersOptions from '#ServerOptions/SecurityHeadersOptions';
import RateLimitOptions from '#ServerOptions/RateLimitOptions';
import CookieParserOptions from '#ServerOptions/CookieParserOptions';
import CookieSessionOptions from '#ServerOptions/CookieSessionOptions';
import CSRFOptions from '#ServerOptions/CSRFOptions';
import CompressOptions from '#ServerOptions/CompressOptions';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * HTTP server connection options.
 *
 * @typedef {import('node:http').ServerOptions} HttpConnectionOptions
 */

/**
 * HTTPS server connection options.
 *
 * @typedef {import('node:https').ServerOptions} HttpsConnectionOptions
 */

/**
 * HTTP/2 cleartext server connection options.
 *
 * @typedef {import('node:http2').ServerOptions} Http2ConnectionOptions
 */

/**
 * HTTP/2 secure server connection options.
 *
 * @typedef {import('node:http2').SecureServerOptions} Http2SecureConnectionOptions
 */

/**
 * Identity for a plain HTTP server configuration.
 *
 * @typedef  {object}                HttpServerConfigurationIdentity
 * @property {'http'}                protocol                        - Application-level protocol.
 * @property {'h1'}                  transport                       - Transport identifier for HTTP/1.1 cleartext.
 * @property {HttpConnectionOptions} [connection]                    - HTTP server options forwarded to the adapter.
 */

/**
 * Identity for a secure HTTPS server configuration.
 *
 * @typedef  {object}                 HttpsServerConfigurationIdentity
 * @property {'https'}                protocol                         - Application-level protocol.
 * @property {'h1s'}                  transport                        - Transport identifier for HTTP/1.1 over TLS.
 * @property {HttpsConnectionOptions} [connection]                     - HTTPS server options forwarded to the adapter.
 */

/**
 * Identity for a cleartext HTTP/2 server configuration.
 *
 * @typedef  {object}                 Http2ServerConfigurationIdentity
 * @property {'http'}                 protocol                         - Application-level protocol.
 * @property {'h2c'}                  transport                        - Transport identifier for HTTP/2 cleartext.
 * @property {Http2ConnectionOptions} [connection]                     - HTTP/2 cleartext server options forwarded to the adapter.
 */

/**
 * Identity for a secure HTTP/2 server configuration.
 *
 * @typedef  {object}                       Http2SecureServerConfigurationIdentity
 * @property {'https'}                      protocol                               - Application-level protocol.
 * @property {'h2'}                         transport                              - Transport identifier for HTTP/2 over TLS.
 * @property {Http2SecureConnectionOptions} [connection]                           - HTTP/2 secure server options forwarded to the adapter.
 */

/**
 * Represents a permitted server configuration identity.
 *
 * @typedef {HttpServerConfigurationIdentity | HttpsServerConfigurationIdentity | Http2ServerConfigurationIdentity | Http2SecureServerConfigurationIdentity } ServerConfigurationIdentity
 */

/**
 * Represents an HTTP method supported by the routing layer.
 *
 * @typedef {'GET'|'HEAD'|'POST'|'PUT'|'PATCH'|'DELETE'|'OPTIONS'|'QUERY'|'TRACE'} HTTPMethod
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
 * Represents the static options accepted by the server configuration.
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
 * Represents the listen configuration.
 *
 * @typedef {import('#ServerOptions/ListenOptions').ListenOptionsData} ListenOptionsData
 */

/**
 * Represents the request configuration.
 *
 * @typedef {import('#ServerOptions/RequestOptions').RequestOptionsData} RequestOptionsData
 */

/**
 * Represents the response configuration.
 *
 * @typedef {import('#ServerOptions/ResponseOptions').ResponseOptionsData} ResponseOptionsData
 */

/**
 * Represents the static files configuration.
 *
 * @typedef {import('#ServerOptions/StaticOptions').StaticOptionsData} StaticOptionsData
 */

/**
 * Represents the CORS configuration.
 *
 * @typedef {import('#ServerOptions/CORSOptions').CORSOptionsData} CORSOptionsData
 */

/**
 * Represents the security headers configuration.
 *
 * @typedef {import('#ServerOptions/SecurityHeadersOptions').SecurityHeadersOptionsData} SecurityHeadersOptionsData
 */

/**
 * Represents the rate limit configuration.
 *
 * @typedef {import('#ServerOptions/RateLimitOptions').RateLimitOptionsData} RateLimitOptionsData
 */

/**
 * Represents the normalized cookie parser options.
 *
 * @typedef {import('#ServerOptions/CookieParserOptions').CookieParserOptionsData} CookieParserOptionsData
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
 * Represents the normalized cookie session options.
 *
 * @typedef {import('#ServerOptions/CookieSessionOptions').CookieSessionOptionsData} CookieSessionOptionsData
 */

/**
 * Represents the CSRF options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CSRFOptions').CSRFOptionsInput} CSRFOptionsInput
 */

/**
 * Represents the normalized CSRF options.
 *
 * @typedef {import('#ServerOptions/CSRFOptions').CSRFOptionsData} CSRFOptionsData
 */

/**
 * Represents the compression options accepted by the server configuration.
 *
 * @typedef {import('#ServerOptions/CompressOptions').CompressOptionsInput} CompressOptionsInput
 */

/**
 * Represents the normalized compression options.
 *
 * @typedef {import('#ServerOptions/CompressOptions').CompressOptionsData} CompressOptionsData
 */

/**
 * Represents the cookie middleware options accepted by the server configuration.
 *
 * @typedef  {object}                    CookieOptionsInput
 * @property {CookieParserOptionsInput}  [parser]           - Cookie parser configuration.
 * @property {CookieSessionOptionsInput} [session]          - Cookie session configuration.
 */

/**
 * Represents the normalized cookie options.
 *
 * `session` is only present when a cookie session is configured. Since a
 * cookie session requires a cookie parser, `parser` is always present when
 * `cookie` is defined.
 *
 * @typedef  {object}                   CookieOptionsData
 * @property {CookieParserOptionsData}  parser            - Normalized cookie parser options.
 * @property {CookieSessionOptionsData} [session]         - Normalized cookie session options.
 */

/**
 * Options common to every server configuration.
 *
 * @typedef  {object}                      ServerConfigurationOptionsInputBase
 * @property {ListenOptionsInput}          [listen]                            - Server listening configuration.
 * @property {RequestOptionsInput}         [request]                           - Request configuration.
 * @property {ResponseOptionsInput}        [response]                          - Response configuration.
 * @property {StaticOptionsInput}          [static]                            - Static files middleware configuration.
 * @property {CORSOptionsInput}            [cors]                              - CORS middleware configuration.
 * @property {SecurityHeadersOptionsInput} [securityHeaders]                   - Security headers middleware configuration.
 * @property {RateLimitOptionsInput}       [rateLimit]                         - Rate limit middleware configuration.
 * @property {CookieOptionsInput}          [cookie]                            - Cookie middleware configuration.
 * @property {CSRFOptionsInput}            [csrf]                              - CSRF middleware configuration.
 * @property {CompressOptionsInput}        [compress]                          - Compression middleware configuration.
 */

/**
 * Represents the server-specific options consumed by the kernel.
 *
 * @template {ServerConfigurationIdentity} TIdentity
 * @typedef  {object}                        ServerOptions
 * @property {TIdentity['transport']}        transport     - Transport identifier.
 * @property {TIdentity['protocol']}         protocol      - Application-level protocol.
 * @property {ListenOptionsData|undefined}   listen        - Listen configuration.
 * @property {RequestOptionsData|undefined}  request       - Request configuration.
 * @property {ResponseOptionsData|undefined} response      - Response configuration.
 * @property {TIdentity['connection']}       connection    - Connection options forwarded to the adapter.
 */

/**
 * Represents one middleware configuration consumed by the exchange layer builder.
 *
 * @typedef  {object}               MiddlewareConfiguration
 * @property {string}               name                    - Middleware name.
 * @property {unknown}              options                 - Middleware configuration options.
 * @property {string|undefined}     pathnamePattern         - URL pathname pattern to match.
 * @property {HTTPMethod|undefined} method                  - HTTP method to match.
 */

/**
 * Represents the composed server configuration.
 *
 * @template {ServerConfigurationIdentity} TIdentity
 * @typedef  {object}                    ComposedConfiguration
 * @property {ServerOptions<TIdentity>}  serverOptions         - Server options forwarded to the kernel.
 * @property {MiddlewareConfiguration[]} middlewareOptions     - Middleware configurations forwarded to the exchange layer builder.
 */

/**
 * Represents the private state associated with a ServerConfiguration instance.
 *
 * @template {ServerConfigurationIdentity} TIdentity
 * @typedef  {object}                                 ServerConfigurationData
 * @property {() => ComposedConfiguration<TIdentity>} compose                 - Composes the configuration into server and middleware options.
 */

/**
 * Represents the plain object projection of a ServerConfiguration instance.
 *
 * Every property is optional because only configured options are included.
 *
 * @typedef  {object}                     ServerConfigurationObject
 * @property {unknown}                    [connection]              - Connection options forwarded to the adapter.
 * @property {ListenOptionsData}          [listen]                  - Normalized listen options.
 * @property {RequestOptionsData}         [request]                 - Normalized request options.
 * @property {ResponseOptionsData}        [response]                - Normalized response options.
 * @property {StaticOptionsData}          [static]                  - Normalized static options.
 * @property {CORSOptionsData}            [cors]                    - Normalized CORS options.
 * @property {SecurityHeadersOptionsData} [securityHeaders]         - Normalized security headers options.
 * @property {RateLimitOptionsData}       [rateLimit]               - Normalized rate limit options.
 * @property {CookieOptionsData}          [cookie]                  - Normalized cookie options.
 * @property {CSRFOptionsData}            [csrf]                    - Normalized CSRF configuration.
 * @property {CompressOptionsData}        [compress]                - Normalized compression configuration.
 */
// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Stores private ServerConfiguration data for each {@link ServerConfiguration} instance.
 *
 * @private
 * @type {WeakMap<ServerConfiguration<any>, ServerConfigurationData<any>>}
 */
const SERVER_CONFIGURATION_PRIVATE = new WeakMap();

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Returns the private state associated with a {@link ServerConfiguration} instance.
 *
 * @private
 * @template {ServerConfigurationIdentity} TIdentity
 * @param {ServerConfiguration<TIdentity>} instance - ServerConfiguration instance whose private state is requested.
 * @returns {ServerConfigurationData<TIdentity>} The private state associated with the instance.
 * @throws {TypeError} If the instance has no associated private state.
 */
function getServerConfigurationData(instance) {
  const data = SERVER_CONFIGURATION_PRIVATE.get(instance);

  if (!data) {
    throw new TypeError('Invalid ServerConfiguration instance.');
  }

  return data;
}

/**
 * Composes a server configuration into its server-specific and middleware
 * options.
 *
 * @private
 * @template {ServerConfigurationIdentity} TIdentity
 * @param {ServerConfiguration<TIdentity>} configuration - Server configuration to compose.
 * @returns {ComposedConfiguration<TIdentity>} Composed server and middleware options.
 * @throws {TypeError} If the value is not a ServerConfiguration instance.
 */
function composeConfiguration(configuration) {
  if (!(configuration instanceof ServerConfiguration)) {
    throw new TypeError('Expected a ServerConfiguration instance.');
  }

  const data = getServerConfigurationData(configuration);

  return data.compose();
}

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Defines the common server configuration.
 *
 * @template {ServerConfigurationIdentity} TIdentity
 *
 * @classdesc ServerConfiguration is the base class for server configuration
 * types. It cannot be instantiated directly and is extended by concrete server
 * configuration classes.
 */
class ServerConfiguration {
  /**
   * Transport identifier used by this ServerConfiguration.
   *
   * @type {TIdentity['transport']}
   */
  #transport;

  /**
   * Protocol identifier used by this ServerConfiguration.
   *
   * @type {TIdentity['protocol']}
   */
  #protocol;

  /**
   * Connection options used by this ServerConfiguration.
   *
   * @type {TIdentity['connection']}
   */
  #connection;

  /**
   * Listen options used by this ServerConfiguration.
   *
   * @type {ListenOptions}
   */
  #listen;

  /**
   * Request options used by this ServerConfiguration.
   *
   * @type {RequestOptions}
   */
  #request;

  /**
   * Response options used by this ServerConfiguration.
   *
   * @type {ResponseOptions}
   */
  #response;

  /**
   * Static files middleware configuration.
   *
   * @type {StaticOptions}
   */
  #static;

  /**
   * CORS middleware configuration.
   *
   * @type {CORSOptions}
   */
  #cors;

  /**
   * Security headers middleware configuration.
   *
   * @type {SecurityHeadersOptions}
   */
  #securityHeaders;

  /**
   * Rate limit middleware configuration.
   *
   * @type {RateLimitOptions}
   */
  #rateLimit;

  /**
   * Cookie parser middleware configuration.
   *
   * @type {CookieParserOptions}
   */
  #cookieParser;

  /**
   * Cookie session middleware configuration.
   *
   * @type {CookieSessionOptions}
   */
  #cookieSession;

  /**
   * CSRF middleware configuration.
   *
   * @type {CSRFOptions}
   */
  #csrf;

  /**
   * Compression middleware configuration.
   *
   * @type {CompressOptions}
   */
  #compress;

  /**
   * Creates a server configuration.
   *
   * @abstract
   * @param {ServerConfigurationOptionsInputBase & TIdentity} options - Server configuration options.
   * @throws {TypeError} When ServerConfiguration is instantiated directly.
   */
  constructor(options) {
    if (new.target === ServerConfiguration) {
      throw new TypeError('ServerConfiguration is an abstract class and cannot be instantiated');
    }

    // Identity & connection
    this.#transport = options.transport;
    this.#protocol = options.protocol;
    this.#connection = options.connection;

    // Server options
    this.#listen = new ListenOptions(options.listen);
    this.#request = new RequestOptions(options.request);
    this.#response = new ResponseOptions(options.response);

    // Middleware options
    this.#static = new StaticOptions(options.static);
    this.#cors = new CORSOptions(options.cors);
    this.#securityHeaders = new SecurityHeadersOptions(options.securityHeaders);
    this.#rateLimit = new RateLimitOptions(options.rateLimit);
    this.#cookieParser = new CookieParserOptions(options.cookie?.parser);
    this.#cookieSession = new CookieSessionOptions(
      options.cookie?.session,
      options.cookie?.parser !== undefined,
    );
    this.#csrf = new CSRFOptions(options.csrf);
    this.#compress = new CompressOptions(options.compress);

    SERVER_CONFIGURATION_PRIVATE.set(this, {
      compose: () => this.#compose(),
    });
  }

  /**
   * The transport identifier.
   *
   * @readonly
   * @type {TIdentity['transport']}
   */
  get transport() {
    return this.#transport;
  }

  /**
   * The application-level protocol.
   *
   * @readonly
   * @type {TIdentity['protocol']}
   */
  get protocol() {
    return this.#protocol;
  }

  /**
   * The connection configuration.
   *
   * @readonly
   * @type {TIdentity['connection']}
   */
  get connection() {
    return this.#connection;
  }

  /**
   * The request configuration.
   *
   * @readonly
   * @type {RequestOptionsData|undefined}
   */
  get request() {
    return this.#request.value;
  }

  /**
   * The response configuration.
   *
   * @readonly
   * @type {ResponseOptionsData|undefined}
   */
  get response() {
    return this.#response.value;
  }

  /**
   * The server listening configuration.
   *
   * @readonly
   * @type {ListenOptionsData|undefined}
   */
  get listen() {
    return this.#listen.value;
  }

  /**
   * The static files configuration.
   *
   * @readonly
   * @type {StaticOptionsData|undefined}
   */
  get static() {
    return this.#static.value;
  }

  /**
   * The CORS configuration.
   *
   * @readonly
   * @type {CORSOptionsData|undefined}
   */
  get cors() {
    return this.#cors.value;
  }

  /**
   * The security headers configuration.
   *
   * @readonly
   * @type {SecurityHeadersOptionsData|undefined}
   */
  get securityHeaders() {
    return this.#securityHeaders.value;
  }

  /**
   * The rate limit configuration.
   *
   * @readonly
   * @type {RateLimitOptionsData|undefined}
   */
  get rateLimit() {
    return this.#rateLimit.value;
  }

  /**
   * The cookie middleware configuration.
   *
   * @readonly
   * @type {CookieOptionsData|undefined}
   */
  get cookie() {
    const parser = this.#cookieParser.value;
    const session = this.#cookieSession.value;

    if (parser === undefined) {
      return undefined;
    }

    if (session === undefined) {
      return { parser };
    }

    return {
      parser,
      session,
    };
  }

  /**
   * The CSRF configuration.
   *
   * @readonly
   * @type {CSRFOptionsData|undefined}
   */
  get csrf() {
    return this.#csrf.value;
  }

  /**
   * The compression configuration.
   *
   * @readonly
   * @type {CompressOptionsData|undefined}
   */
  get compress() {
    return this.#compress.value;
  }

  /**
   * Custom string tag for better type identification.
   *
   * @readonly
   * @type {string}
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }

  /**
   * Indicates whether this object implements the server configuration contract.
   *
   * @readonly
   * @type {boolean}
   */
  get [SERVER_CONFIGURATION_BRAND]() {
    return true;
  }

  /**
   * Returns a plain object representation of the server configuration.
   *
   * @returns {ServerConfigurationObject} A plain object representation of the configuration.
   *
   * @example
   * ```js
   * const configuration = new HttpServerConfiguration({
   *   listen: { port: 3000 },
   *   cors: { origin: '*' },
   * });
   *
   * configuration.toObject();
   * // => { listen: { port: 3000 }, cors: { origin: '*' } }
   * ```
   */
  toObject() {
    return this.#createObject();
  }

  /**
   * Custom inspect implementation for Node.js `util.inspect()`.
   *
   * @returns {string} Custom string representation for debugging.
   */
  [inspect.custom]() {
    return `${this.constructor.name} ${inspect(this.toObject(), { colors: true })}`;
  }

  /**
   * Builds the plain object representation shared by public projections.
   *
   * @returns {Record<string, unknown>} A plain object representation of the configuration.
   */
  #createObject() {
    return {
      ...(this.connection !== undefined && { connection: this.connection }),
      ...(this.listen !== undefined && { listen: this.listen }),
      ...(this.request !== undefined && { request: this.request }),
      ...(this.response !== undefined && { response: this.response }),
      ...(this.static !== undefined && { static: this.static }),
      ...(this.cors !== undefined && { cors: this.cors }),
      ...(this.securityHeaders !== undefined && {
        securityHeaders: this.securityHeaders,
      }),
      ...(this.rateLimit !== undefined && { rateLimit: this.rateLimit }),
      ...(this.cookie !== undefined && { cookie: this.cookie }),
      ...(this.csrf !== undefined && { csrf: this.csrf }),
      ...(this.compress !== undefined && { compress: this.compress }),
    };
  }

  /**
   * Composes the configuration into server-specific and middleware options.
   *
   * @returns {ComposedConfiguration<TIdentity>} Composed server and middleware options.
   */
  #compose() {
    /** @type {ServerOptions<TIdentity>} */
    const serverOptions = {
      transport: this.#transport,
      protocol: this.#protocol,
      listen: this.listen,
      request: this.request,
      response: this.response,
      connection: this.connection,
    };

    const middlewareOptions = [
      this.#cookieParser,
      this.#cookieSession,
      this.#csrf,
      this.#static,
      this.#cors,
      this.#securityHeaders,
      this.#rateLimit,
      this.#compress,
    ]
      .filter(option => option.value !== undefined)
      .map(option => option.compose());

    return {
      serverOptions,
      middlewareOptions,
    };
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default ServerConfiguration;
export { composeConfiguration };

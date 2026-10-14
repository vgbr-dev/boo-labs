// @ts-check
/**
 * @file Defines the Request abstraction.
 *
 * @description The Request is an immutable, transport-independent view of an
 * incoming HTTP message. It exposes normalized request metadata and lazy body
 * access.
 *
 * HTTP/2 pseudo-headers (`:scheme`, `:authority`, `:method`, `:path`) are
 * consumed internally to resolve protocol and authority, then removed from
 * the public `headers` view so that callers see a uniform HTTP header map
 * across HTTP/1.1 and HTTP/2.
 *
 * CONNECT requests are not represented by this abstraction. The request
 * target of a CONNECT message does not have path form, and the URL built
 * here does not reflect its semantics.
 *
 * @module Request
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import RequestError from '#shared/errors/RequestError';
import RequestHeaders from './RequestHeaders.mjs';
import JSONParser from './BodyParser/JSONParser.mjs';
import MultipartParser from './BodyParser/MultipartParser.mjs';
import URLEncodedParser from './BodyParser/URLEncodedParser.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an incoming HTTP/1.1 or HTTPS/1.1 request message.
 *
 * @typedef {import('node:http').IncomingMessage} HttpIncomingMessage
 */

/**
 * Represents an incoming HTTP/2 request message.
 *
 * @typedef {import('node:http2').Http2ServerRequest} Http2IncomingMessage
 */

/**
 * Represents an incoming request message supported by the server.
 *
 * @typedef {HttpIncomingMessage|Http2IncomingMessage} IncomingRequest
 */

/**
 * Represents the constructor signature of a body parser.
 *
 * A body parser constructor produces an instance of a concrete parser
 * that satisfies the `BodyParser` contract. It is used as the value type
 * of the parser registry.
 *
 * @typedef {typeof import('./BodyParser/BodyParser.mjs').default} BodyParserConstructor
 */

/**
 * Configures how proxy headers are trusted.
 *
 * - `false`: no proxy header is trusted.
 * - `true`: all proxies are trusted. The first value of `X-Forwarded-For`,
 * `X-Forwarded-Proto`, and `X-Forwarded-Host` is used.
 * - `number`: the trusted number of proxies. `X-Forwarded-For` is walked
 * that many hops from the closest proxy. `X-Forwarded-Proto` and
 * `X-Forwarded-Host` are read as single values.
 *
 * @typedef {boolean|number} TrustProxyOption
 */

/**
 * Defines the lifecycle options supported by a request.
 *
 * @typedef  {object}           RequestOptions
 * @property {number}           [bodyLimit]        - Maximum number of bytes allowed for the request body.
 * @property {TrustProxyOption} [trustProxy=false] - Whether (and how much) to trust proxy headers.
 */

/**
 * Represents the protocol scheme used by the incoming request.
 *
 * @typedef {'http'|'https'} Protocol
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default limit for the size of a request body, in bytes.
 *
 * @type {number}
 */
const DEFAULT_BODY_LIMIT = 10 * 1024 * 1024;

/**
 * Detects an absolute-form or protocol-relative URL.
 *
 * @type {RegExp}
 */
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an incoming HTTP request.
 *
 * @classdesc The `Request` normalizes HTTP/1.1, HTTPS/1.1, and HTTP/2
 * requests into a common interface. It is immutable from the consumer's
 * perspective: no property is mutable and no native object is exposed.
 *
 * Body parsing is lazy, cached, and delegated to a parser selected by the
 * request `Content-Type`.
 */
class Request {
  /**
   * Maximum number of bytes allowed for the request body.
   *
   * @type {number}
   */
  #bodyLimit;

  /**
   * Proxy trust policy used to resolve the client IP, protocol, and host.
   *
   * @type {TrustProxyOption}
   */
  #trustProxy;

  /**
   * Incoming HTTP request message.
   *
   * @type {IncomingRequest}
   */
  #incomingMessage;

  /**
   * Parsed body, or `null` before parsing.
   *
   * @type {unknown}
   */
  #body = null;

  /**
   * In-flight body parsing promise, used to coalesce concurrent `body()` calls.
   *
   * @type {Promise<unknown>|null}
   */
  #bodyPromise = null;

  /**
   * Error produced while reading or parsing the body, if any.
   *
   * @type {Error|null}
   */
  #bodyError = null;

  /**
   * Whether the body has already been processed (successfully or not).
   *
   * @type {boolean}
   */
  #bodyProcessed = false;

  /**
   * Protocol scheme used by the request.
   *
   * @type {Protocol}
   */
  #protocol;

  /**
   * Parsed request URL.
   *
   * @type {URL}
   */
  #url;

  /**
   * Immutable view of the request headers.
   *
   * @type {RequestHeaders}
   */
  #headers;

  /**
   * Full `Content-Type` header value, or `null` when absent.
   *
   * @type {string|null}
   */
  #contentType;

  /**
   * Normalized media type extracted from `Content-Type`, or `null` when absent.
   *
   * @type {string|null}
   */
  #mediaType;

  /**
   * HTTP version used by the request.
   *
   * @type {string|undefined}
   */
  #httpVersion;

  /**
   * Resolved client IP address, respecting the proxy trust policy.
   *
   * @type {string|undefined}
   */
  #clientIp;

  /**
   * Creates a request from an incoming HTTP message.
   *
   * @param {IncomingRequest} incomingMessage - Incoming HTTP request message.
   * @param {RequestOptions} [options] - The request lifecycle options.
   * @throws {RequestError} If the request URL cannot be parsed.
   * @throws {RequestError} If the request authority cannot be resolved.
   * @throws {TypeError} If `options.bodyLimit` is not a positive safe integer.
   * @throws {TypeError} If `options.trustProxy` is not a boolean or a non-negative safe integer.
   * @example
   * ```js
   * const request = new Request(incomingMessage, {
   *   bodyLimit: 1_000_000,
   *   trustProxy: 1,
   * });
   * ```
   */
  constructor(incomingMessage, options = {}) {
    const bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
    const trustProxy = options.trustProxy ?? false;

    if (!Number.isSafeInteger(bodyLimit) || bodyLimit <= 0) {
      throw new TypeError('bodyLimit must be a positive safe integer');
    }

    if (typeof trustProxy !== 'boolean' && (!Number.isSafeInteger(trustProxy) || trustProxy < 0)) {
      throw new TypeError('trustProxy must be a boolean or a non-negative safe integer');
    }

    this.#bodyLimit = bodyLimit;
    this.#trustProxy = trustProxy;
    this.#incomingMessage = incomingMessage;

    const incomingHttpHeaders = incomingMessage.headers;

    this.#headers = new RequestHeaders(incomingHttpHeaders);

    this.#protocol = this.#resolveProtocol(incomingHttpHeaders);
    this.#httpVersion = this.#resolveHttpVersion();

    const host = this.#resolveHost(incomingHttpHeaders);
    this.#url = this.#resolveUrl(incomingMessage.url || '/', host);

    this.#clientIp = this.#resolveClientIp();

    const contentType = this.#headers.get('content-type');
    this.#contentType = typeof contentType === 'string' ? contentType : null;
    this.#mediaType = this.#contentType
      ? this.#contentType.split(';', 1)[0].trim().toLowerCase()
      : null;
  }

  /**
   * The path component of the request URL.
   *
   * This is derived from the resolved URL. For `OPTIONS *` requests, the
   * pathname is `/`.
   *
   * @type {string}
   */
  get pathname() {
    return this.#url.pathname;
  }

  /**
   * The HTTP method of the request, normalized to uppercase when present.
   *
   * The transport layer does not validate the method against a supported
   * set, and clients may send custom method names. The returned value is
   * therefore a plain string, and callers that need to restrict the set
   * of accepted methods should do so in the routing layer.
   *
   * Returns `undefined` when the underlying message does not declare a
   * method. This should not occur for requests received by the server,
   * but the transport type marks the property as optional.
   *
   * @type {string}
   */
  get method() {
    const method = this.#incomingMessage.method;
    if (method === undefined) {
      throw new RequestError('MISSING_METHOD');
    }
    return method.toUpperCase();
  }

  /**
   * The request target of the incoming HTTP message.
   *
   * It may be a path, an absolute URL, or `*` for `OPTIONS` requests.
   * This is the value provided by the transport, not the normalized URL
   * used internally by the request.
   *
   * @type {string|undefined}
   */
  get url() {
    return this.#incomingMessage.url;
  }

  /**
   * An immutable, case-insensitive view of the request headers.
   *
   * @type {RequestHeaders}
   */
  get headers() {
    return this.#headers;
  }

  /**
   * The remote IP address of the client.
   *
   * When `trustProxy` is enabled, the value is derived from the
   * `X-Forwarded-For` header according to the configured trust level.
   * Otherwise it falls back to the socket remote address.
   *
   * @type {string|undefined}
   */
  get ip() {
    return this.#clientIp;
  }

  /**
   * The request hostname.
   *
   * When `trustProxy` is enabled, the hostname may be derived from the
   * `X-Forwarded-Host` header instead of the transport authority.
   *
   * @type {string}
   */
  get hostname() {
    return this.#url.hostname;
  }

  /**
   * The parsed query parameters of the request.
   *
   * A defensive copy is returned so that callers cannot mutate the internal
   * request state through the returned object.
   *
   * @type {URLSearchParams}
   */
  get query() {
    return new URLSearchParams(this.#url.searchParams);
  }

  /**
   * The full `Content-Type` header, or `null` when absent.
   *
   * @type {string|null}
   */
  get contentType() {
    return this.#contentType;
  }

  /**
   * The normalized media type, or `null` when absent.
   *
   * @type {string|null}
   */
  get mediaType() {
    return this.#mediaType;
  }

  /**
   * The protocol scheme used by the request.
   *
   * When `trustProxy` is enabled, the value may be derived from the
   * `X-Forwarded-Proto` header.
   *
   * @type {Protocol}
   */
  get protocol() {
    return this.#protocol;
  }

  /**
   * Whether the request declares an `https` scheme.
   *
   * This reflects the resolved request scheme, which may come from the
   * transport layer or, when `trustProxy` is enabled, from the
   * `X-Forwarded-Proto` header.
   *
   * @type {boolean}
   */
  get isSecure() {
    return this.#protocol === 'https';
  }

  /**
   * The HTTP version used by the request.
   *
   * @type {string|undefined}
   */
  get httpVersion() {
    return this.#httpVersion;
  }

  /**
   * Returns a request header by name.
   *
   * Header names are matched case-insensitively. Array values are copied
   * so the caller cannot mutate the internal request state through the
   * returned object.
   *
   * @param {string} name - The HTTP header name.
   * @returns {string|string[]|undefined} The header value, or `undefined` when the header does not exist.
   * @example
   * ```js
   * const contentType = request.getHeader('content-type');
   * ```
   */
  getHeader(name) {
    return this.#headers.get(name);
  }

  /**
   * Returns the parsed request body.
   *
   * The request body is consumed at most once. Concurrent calls share
   * the same in-flight parsing operation. The parsed result is cached and
   * returned on subsequent calls. If parsing fails, the error is also
   * cached and rethrown on subsequent calls.
   *
   * @returns {Promise<unknown>} The parsed request body, or `null` when the request has no body.
   * @throws {RequestError} If the request media type is not supported.
   * @throws {RequestError} If the request body exceeds the configured limit.
   * @throws {RequestError} If the request body cannot be parsed.
   * @example
   * ```js
   * const body = await request.body();
   * ```
   */
  async body() {
    if (this.#bodyError) {
      throw this.#bodyError;
    }

    if (this.#bodyProcessed) {
      return this.#body;
    }

    if (this.#bodyPromise === null) {
      this.#bodyPromise = this.#parseBody();
    }

    try {
      this.#body = await this.#bodyPromise;
      this.#bodyProcessed = true;
      return this.#body;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.#bodyProcessed = true;
      this.#bodyError = normalized;
      throw normalized;
    }
  }

  /**
   * Resolves the client IP address according to the proxy trust policy.
   *
   * When `trustProxy` is `false`, the socket remote address is used.
   *
   * When `trustProxy` is `true`, the first address in `X-Forwarded-For`
   * is used, assuming all proxies in the chain are trusted.
   *
   * When `trustProxy` is a number, the trusted number of proxies is
   * skipped from the end of the `X-Forwarded-For` list, and the address
   * immediately before them is used. If the list does not contain enough
   * entries to apply the configured trust level, the socket remote
   * address is used.
   *
   * @returns {string|undefined} The resolved client IP address.
   */
  #resolveClientIp() {
    const socketIp = this.#incomingMessage.socket?.remoteAddress;

    if (!this.#trustProxy) {
      return socketIp;
    }

    const forwarded = this.#headers.get('x-forwarded-for');

    if (!forwarded) {
      return socketIp;
    }

    const list = (Array.isArray(forwarded) ? forwarded.join(',') : forwarded)
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean);

    if (list.length === 0) {
      return socketIp;
    }

    if (this.#trustProxy === true) {
      return list[0];
    }

    const clientIndex = list.length - this.#trustProxy - 1;

    if (clientIndex >= 0) {
      return list[clientIndex];
    }

    return socketIp;
  }

  /**
   * Determines whether the incoming request contains a body.
   *
   * A request is considered to contain a body when it uses `chunked`
   * transfer encoding or declares a positive `Content-Length`. Invalid
   * or duplicate `Content-Length` values are rejected rather than treated
   * as an absent body.
   *
   * @returns {boolean} `true` when a body is present.
   * @throws {RequestError} If `Transfer-Encoding` is not exactly `chunked`.
   * @throws {RequestError} If `Content-Length` is duplicated or invalid.
   */
  #hasBody() {
    const headers = this.#incomingMessage.headers;

    const transferEncoding = headers['transfer-encoding'];

    if (transferEncoding !== undefined) {
      const values = Array.isArray(transferEncoding) ? transferEncoding : [transferEncoding];
      const normalized = values.map(value => value.trim().toLowerCase());

      if (normalized.length !== 1 || normalized[0] !== 'chunked') {
        throw new RequestError('INVALID_TRANSFER_ENCODING', {
          values: { transferEncoding: normalized.join(', ') },
        });
      }

      return true;
    }

    const contentLengthHeader = headers['content-length'];

    if (contentLengthHeader === undefined) {
      return false;
    }

    if (Array.isArray(contentLengthHeader)) {
      throw new RequestError('INVALID_CONTENT_LENGTH', {
        values: { contentLength: contentLengthHeader.join(', ') },
      });
    }

    const contentLength = Number(contentLengthHeader);

    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      throw new RequestError('INVALID_CONTENT_LENGTH', {
        values: { contentLength: contentLengthHeader },
      });
    }

    return contentLength > 0;
  }

  /**
   * Resolves and executes the body parser associated with the request
   * media type.
   *
   * @returns {Promise<unknown>} The parsed body, or `null` when the request has no body.
   * @throws {RequestError} If the media type is unsupported.
   * @throws {RequestError} If the body exceeds the configured limit.
   * @throws {RequestError} If the body cannot be parsed.
   */
  async #parseBody() {
    if (!this.#hasBody()) {
      return null;
    }

    const Parser = this.#resolveParser();

    if (!Parser) {
      throw new RequestError('UNSUPPORTED_MEDIA_TYPE', {
        values: { mediaType: this.#mediaType },
      });
    }

    return new Parser(this.#incomingMessage, this.#bodyLimit).parse();
  }

  /**
   * Resolves the parser class for the current media type.
   *
   * Falls back to the JSON parser for structured suffixes such as
   * `application/vnd.api+json`.
   *
   * @returns {BodyParserConstructor|null} The parser constructor for the current media type, or `null` when no parser matches.
   */
  #resolveParser() {
    const parser = Request.#bodyParsers.get(this.#mediaType ?? '');

    if (parser) {
      return parser;
    }

    if (this.#mediaType?.endsWith('+json')) {
      return Request.#bodyParsers.get('application/json') ?? null;
    }

    return null;
  }

  /**
   * Resolves the protocol scheme used by the incoming request.
   *
   * When `trustProxy` is enabled, the `X-Forwarded-Proto` header has
   * priority over the transport-derived scheme.
   *
   * @param {Record<string, string|string[]|undefined>} incomingHttpHeaders - The incoming header map.
   * @returns {Protocol} The normalized request protocol.
   */
  #resolveProtocol(incomingHttpHeaders) {
    if (this.#trustProxy) {
      const forwardedProto = this.#headers.get('x-forwarded-proto');

      if (forwardedProto !== undefined) {
        const value = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;

        if (typeof value === 'string') {
          const proto = value.split(',')[0].trim().toLowerCase();

          if (proto === 'http' || proto === 'https') {
            return proto;
          }
        }
      }
    }

    return this.#resolveProtocolFromTransport(incomingHttpHeaders);
  }

  /**
   * Resolves the protocol scheme from the transport layer.
   *
   * @param {Record<string, string|string[]|undefined>} incomingHttpHeaders - The incoming header map.
   * @returns {Protocol} The normalized request protocol.
   */
  #resolveProtocolFromTransport(incomingHttpHeaders) {
    const message = this.#incomingMessage;

    if (message.httpVersionMajor >= 2) {
      if ('scheme' in message && (message.scheme === 'https' || message.scheme === 'http')) {
        return message.scheme;
      }

      const scheme = incomingHttpHeaders[':scheme'];

      if (scheme === 'https' || scheme === 'http') {
        return scheme;
      }
    }

    const socket = message.socket;

    if (socket && 'encrypted' in socket) {
      return socket.encrypted === true ? 'https' : 'http';
    }

    return 'http';
  }

  /**
   * Resolves the HTTP version used by the incoming request.
   *
   * @returns {string|undefined} The HTTP version string, or `undefined` when unknown.
   */
  #resolveHttpVersion() {
    const message = this.#incomingMessage;

    if (typeof message.httpVersion === 'string') {
      return message.httpVersion;
    }

    if (message.httpVersionMajor != null) {
      return `${message.httpVersionMajor}.${message.httpVersionMinor ?? 0}`;
    }

    return undefined;
  }

  /**
   * Resolves the authority component used to build the request URL.
   *
   * When `trustProxy` is enabled, the `X-Forwarded-Host` header has
   * priority over the transport authority.
   *
   * The authority is otherwise resolved from the HTTP/2 `:authority`
   * pseudo-header, the HTTP/2 message `authority` property, or the
   * HTTP/1.1 `Host` header, in that order. A request that does not
   * declare any of them is rejected because it does not identify the
   * target of the request.
   *
   * @param {Record<string, string|string[]|undefined>} incomingHttpHeaders - The incoming header map.
   * @returns {string} The request authority.
   * @throws {RequestError} If the request authority cannot be resolved.
   */
  #resolveHost(incomingHttpHeaders) {
    if (this.#trustProxy) {
      const forwardedHost = this.#headers.get('x-forwarded-host');

      if (forwardedHost !== undefined) {
        const value = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;

        if (typeof value === 'string') {
          const host = value.split(',')[0].trim();

          if (host.length > 0) {
            return host;
          }
        }
      }
    }

    const message = this.#incomingMessage;

    if (
      'authority' in message &&
      typeof message.authority === 'string' &&
      message.authority.length > 0
    ) {
      return message.authority;
    }

    const authority = incomingHttpHeaders[':authority'];

    if (typeof authority === 'string' && authority.length > 0) {
      return authority;
    }

    const host = incomingHttpHeaders.host;

    if (typeof host === 'string' && host.length > 0) {
      return host;
    }

    throw new RequestError('MISSING_HOST');
  }

  /**
   * Resolves the request URL from the request target.
   *
   * Absolute-form and protocol-relative targets are normalized so that the
   * authority from the message is preserved and the original host cannot be
   * overridden by the request target. The asterisk request-target used by
   * `OPTIONS` is represented as the root path. Invalid targets cause a
   * `RequestError`.
   *
   * @param {string} requestTarget - The request target.
   * @param {string} host - The resolved request authority.
   * @returns {URL} The parsed request URL.
   * @throws {RequestError} If the request URL cannot be parsed.
   */
  #resolveUrl(requestTarget, host) {
    const base = `${this.#protocol}://${host}`;

    try {
      if (requestTarget === '*') {
        return new URL('/', base);
      }

      if (requestTarget.startsWith('//') || ABSOLUTE_URL_PATTERN.test(requestTarget)) {
        const parsed = new URL(requestTarget, base);
        return new URL(parsed.pathname + parsed.search, base);
      }

      return new URL(requestTarget, base);
    } catch (error) {
      throw new RequestError('INVALID_REQUEST_URL', {
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Body parsers indexed by normalized media type.
   *
   * To add support for a new media type, add a single entry to this map.
   * No other change in the class is required.
   *
   * @type {Map<string, BodyParserConstructor>}
   */
  static #bodyParsers = new Map([
    ['application/json', JSONParser],
    ['multipart/form-data', MultipartParser],
    ['application/x-www-form-urlencoded', URLEncodedParser],
  ]);
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Request;

/**
 * Type definitions for @boo-labs/server
 *
 * Generated to support TypeScript consumers while keeping the core JS-based.
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as stream from 'node:stream';

// ━━ PRIMITIVE TYPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an HTTP method supported by the routing layer.
 */
export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'QUERY' | 'TRACE';

/**
 * Identifies an application-layer communication protocol.
 */
export type Protocol = 'http' | 'https' | 'ws' | 'wss' | 'grpc' | 'mqtt' | 'coap';

/**
 * Identifies the transport implementation used by the server.
 */
export type Transport = 'h1' | 'h1s' | 'h2c' | 'h2';

/**
 * Represents the connection options accepted by supported transports.
 */
export type ServerConnectionOptions = http.ServerOptions | https.ServerOptions | http2.ServerOptions | http2.SecureServerOptions;

/**
 * Represents the lifecycle states of the server.
 */
export type ServerState = 'idle' | 'starting' | 'listening' | 'stopping' | 'closed' | 'error';

/**
 * Represents the current state of a response body.
 */
export type BodyKind = 'none' | 'buffer' | 'stream';

/**
 * Represents a function that delegates execution to the next middleware layer.
 */
export type NextFunction = () => void | Promise<void>;

/**
 * Represents an exchange middleware function.
 */
export type MiddlewareFunction = (
  exchange: Exchange,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Represents a handler invoked when no route matches.
 */
export type NotFoundHandler = (exchange: Exchange) => void | Promise<void>;

/**
 * Represents a handler invoked when an error propagates during processing.
 */
export type SystemErrorHandler = (
  error: Error,
  exchange: Exchange,
) => void | Promise<void>;

/**
 * Represents an event name supported by the server.
 */
export type EventName = 'listen' | 'close' | 'error' | 'exchange:start' | 'exchange:end' | 'exchange:error';

// ━━ VALUE OBJECTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Plain object representation of an Address.
 */
export interface AddressInfo {
  address: string;
  port: number;
  family: string;
  displayHost: string;
}

/**
 * Represents the network address of an HTTP server.
 *
 * Instances are produced by the runtime and exposed on the `listen` event.
 * They are not meant to be constructed by consumers.
 */
export interface Address {
  readonly address: string;
  readonly port: number;
  readonly family: string;
  readonly displayHost: string;
  toObject(): AddressInfo;
  toJSON(): AddressInfo;
  toString(): string;
  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default'): string;
}

/**
 * Represents the data of a network endpoint.
 */
export interface EndpointData {
  protocol: Protocol;
  address: string;
  port: number;
  family: string;
  displayHost: string;
  displayUrl: string;
}

/**
 * Represents a complete network endpoint.
 *
 * Instances are produced by the runtime and exposed on the `listen` event.
 * They are not meant to be constructed by consumers.
 */
export interface Endpoint {
  readonly protocol: Protocol;
  readonly address: string;
  readonly port: number;
  readonly family: string;
  readonly displayHost: string;
  readonly displayUrl: string;
  toObject(): EndpointData;
  toJSON(): EndpointData;
  toString(): string;
  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default'): string;
}

// ━━ REQUEST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Immutable, case-insensitive view of incoming HTTP request headers.
 */
export interface RequestHeaders {
  get(name: string): string | string[] | undefined;
  has(name: string): boolean;
  getNames(): string[];
  entries(): IterableIterator<[string, string | string[] | undefined]>;
  [Symbol.iterator](): IterableIterator<[string, string | string[] | undefined]>;
}

/**
 * Represents an incoming HTTP request.
 *
 * Instances are produced by the runtime and exposed as `exchange.request`.
 */
export interface Request {
  readonly pathname: string;
  readonly method: string;
  readonly url: string | undefined;
  readonly headers: RequestHeaders;
  readonly ip: string | undefined;
  readonly hostname: string;
  readonly query: URLSearchParams;
  readonly contentType: string | null;
  readonly mediaType: string | null;
  readonly protocol: Protocol;
  readonly isSecure: boolean;
  readonly httpVersion: string | undefined;
  getHeader(name: string): string | string[] | undefined;
  body(): Promise<unknown>;
}

// ━━ RESPONSE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a supported response header value.
 */
export type ResponseHeaderValue = string | number | (string | number)[];

/**
 * Mutable, validated collection of outgoing HTTP response headers.
 */
export interface ResponseHeaders {
  set(name: string, value: ResponseHeaderValue): void;
  setMany(headers: Record<string, ResponseHeaderValue>): void;
  append(name: string, value: string | number): void;
  get(name: string): ResponseHeaderValue | undefined;
  has(name: string): boolean;
  remove(name: string): void;
  ensureContentType(value: string): void;
  lockContentType(): void;
  getNames(): string[];
  entries(): IterableIterator<[string, ResponseHeaderValue]>;
  [Symbol.iterator](): IterableIterator<[string, ResponseHeaderValue]>;
  toObject(): Record<string, ResponseHeaderValue>;
}

/**
 * Represents an outgoing HTTP response.
 */
export interface Response {
  readonly statusCode: number;
  readonly statusText: string;
  readonly isCommitted: boolean;
  readonly bodyKind: BodyKind;
  readonly bodyLength: number | undefined;

  status(code: number): this;
  setHeader(name: string, value: ResponseHeaderValue): this;
  setHeaders(headers: Record<string, ResponseHeaderValue>): this;
  appendHeader(name: string, value: string | number): this;
  getHeader(name: string): ResponseHeaderValue | undefined;
  hasHeader(name: string): boolean;
  removeHeader(name: string): this;
  getHeaders(): Readonly<Record<string, ResponseHeaderValue>>;

  json(data: unknown): this;
  html(content: string): this;
  text(content: string): this;
  send(body?: string | Uint8Array): this;
  stream(stream: stream.Readable, contentType?: string): this;
  redirect(url: string, statusCode?: number): this;

  vary(...fields: string[]): this;
  cache(seconds: number): this;
  noCache(): this;

  end(): this;
}

// ━━ EXCHANGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the processing outcome of an HTTP exchange.
 */
export type ExchangeOutcome = 'pending' | 'success' | 'error';

/**
 * Represents timing information captured when exchange processing starts.
 */
export interface ExchangeStartTiming {
  readonly startedAt: number;
  readonly endedAt: undefined;
  readonly duration: undefined;
}

/**
 * Represents timing information captured for a non-terminal exchange error.
 */
export interface ExchangeErrorTiming {
  readonly startedAt: number;
  readonly endedAt: undefined;
  readonly duration: undefined;
}

/**
 * Represents timing information captured when exchange processing ends.
 */
export interface ExchangeEndTiming {
  readonly startedAt: number;
  readonly endedAt: number;
  readonly duration: number;
}

/**
 * Contains a snapshot of the relevant HTTP request information.
 */
export interface ExchangeRequestInfo {
  readonly method: string | undefined;
  readonly pathname: string;
  readonly ip: string | undefined;
  readonly userAgent: string | undefined;
}

/**
 * Contains a snapshot of the relevant HTTP response information.
 */
export interface ExchangeResponseInfo {
  readonly statusCode: number;
}

/**
 * Provides information about an exchange when processing starts.
 */
export interface ExchangeStartInfo {
  readonly id: string;
  readonly traceId: string;
  readonly timing: ExchangeStartTiming;
  readonly request: ExchangeRequestInfo;
  readonly response: ExchangeResponseInfo;
  readonly outcome: 'pending';
  readonly error: undefined;
}

/**
 * Provides information about an exchange when processing fails.
 */
export interface ExchangeErrorInfo {
  readonly id: string;
  readonly traceId: string;
  readonly timing: ExchangeErrorTiming;
  readonly request: ExchangeRequestInfo;
  readonly response: ExchangeResponseInfo;
  readonly outcome: 'error';
  readonly error: Error;
}

/**
 * Provides information about an exchange when processing completes.
 */
export interface ExchangeEndInfo {
  readonly id: string;
  readonly traceId: string;
  readonly timing: ExchangeEndTiming;
  readonly request: ExchangeRequestInfo;
  readonly response: ExchangeResponseInfo;
  readonly outcome: 'success' | 'error';
  readonly error: Error | undefined;
}

/**
 * Represents an exchange snapshot for any supported processing outcome.
 */
export type ExchangeInfo = ExchangeStartInfo | ExchangeErrorInfo | ExchangeEndInfo;

/**
 * Represents a single HTTP transaction.
 *
 * Instances are passed to middleware functions and to `notFound` /
 * `systemError` handlers. They are not meant to be constructed by consumers.
 */
export interface Exchange {
  readonly request: Request;
  readonly response: Response;
  readonly state: Record<string, unknown>;
  readonly id: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly signal: AbortSignal;
  readonly startedAt: number;
  abort(): void;
}

// ━━ IPC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Handler for an IPC invoke request.
 */
export type IPCHandler<T = unknown, R = unknown> = (
  data: T,
) => R | Promise<R>;

/**
 * Listener for an IPC event.
 */
export type IPCEventListener<T = unknown> = (data: T) => void;

/**
 * Owns the IPC subsystem and its application-facing API.
 *
 * Accessible through `server.ipc` while the server is listening.
 */
export interface IPCMain {
  /**
   * Registers or replaces an invoke handler for a channel.
   */
  handle<T = unknown, R = unknown>(
    channel: string,
    handler: IPCHandler<T, R>,
  ): this;

  /**
   * Removes the invoke handler registered for a channel.
   */
  removeHandler(channel: string): this;

  /**
   * Registers an event listener for a channel.
   * Multiple listeners may be registered for the same channel.
   */
  on<T = unknown>(channel: string, listener: IPCEventListener<T>): this;

  /**
   * Removes an event listener from a channel.
   */
  off<T = unknown>(channel: string, listener: IPCEventListener<T>): this;
}

// ━━ CONFIGURATION INPUTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the listen options accepted by the server configuration.
 */
export interface ListenOptionsInput {
  /** The TCP port on which the server listens. */
  port?: number;
  /** The hostname or IP address on which the server listens. */
  host?: string;
  /** The maximum number of pending connections that may be queued. */
  backlog?: number;
}

/**
 * Represents the request options accepted by the server configuration.
 */
export interface RequestOptionsInput {
  /** Maximum number of bytes allowed for the request body. */
  bodyLimit?: number;
  /** Whether (and how much) to trust proxy headers. */
  trustProxy?: boolean | number;
}

/**
 * Represents the response options accepted by the server configuration.
 */
export interface ResponseOptionsInput {
  /** Whether to generate a weak ETag for buffered bodies. */
  etag?: boolean;
  /** Charset appended to eligible Content-Type headers when none is set. */
  defaultCharset?: string;
}

/**
 * Represents the static files middleware options accepted by the server configuration.
 */
export interface StaticOptionsInput {
  /** Filesystem root directory for static files. */
  root: string;
  /** Ordered list of index file names. */
  index?: readonly string[];
  /** Cache-Control max-age value in seconds. */
  maxAge?: number;
  /** Whether to generate ETag headers. */
  etag?: boolean;
  /** Whether to generate Last-Modified headers. */
  lastModified?: boolean;
  /** Whether to delegate to the next middleware when no file is found. */
  fallthrough?: boolean;
  /** Extensions to try when the request has no extension. */
  extensions?: readonly string[];
  /** Whether to serve dot-prefixed paths. */
  dotfiles?: boolean;
}

/**
 * Represents the CORS middleware options accepted by the server configuration.
 */
export interface CORSOptionsInput {
  /** Allowed origin(s). Defaults to `'*'`. */
  origin?: true | string | readonly string[];
  /** Allowed HTTP methods for preflight responses. */
  methods?: readonly string[];
  /** Headers the client is allowed to send. */
  allowedHeaders?: readonly string[];
  /** Headers the client is allowed to read from the response. */
  exposedHeaders?: readonly string[];
  /** Whether the response may include credentials. Defaults to `false`. */
  credentials?: boolean;
  /** How long (in seconds) the preflight response may be cached. */
  maxAge?: number;
  /** Whether to call `next()` on successful preflight instead of ending the response. */
  preflightContinue?: boolean;
  /** Status code used for successful preflight responses. Defaults to `204`. */
  optionsSuccessStatus?: number;
}

/**
 * Represents the security headers middleware options accepted by the server configuration.
 * Every property accepts a string header value or `false` to omit the header.
 */
export interface SecurityHeadersOptionsInput {
  /** Value for the Content-Security-Policy header, or `false` to omit it. */
  contentSecurityPolicy?: string | false;
  /** Value for the Cross-Origin-Embedder-Policy header, or `false` to omit it. */
  crossOriginEmbedderPolicy?: string | false;
  /** Value for the Cross-Origin-Opener-Policy header, or `false` to omit it. */
  crossOriginOpenerPolicy?: string | false;
  /** Value for the Cross-Origin-Resource-Policy header, or `false` to omit it. */
  crossOriginResourcePolicy?: string | false;
  /** Value for the Origin-Agent-Cluster header, or `false` to omit it. */
  originAgentCluster?: string | false;
  /** Value for the Permissions-Policy header, or `false` to omit it. */
  permissionsPolicy?: string | false;
  /** Value for the Referrer-Policy header, or `false` to omit it. */
  referrerPolicy?: string | false;
  /** Value for the Strict-Transport-Security header, or `false` to omit it. */
  strictTransportSecurity?: string | false;
  /** Value for the X-Content-Type-Options header, or `false` to omit it. */
  xContentTypeOptions?: string | false;
  /** Value for the X-DNS-Prefetch-Control header, or `false` to omit it. */
  xDnsPrefetchControl?: string | false;
  /** Value for the X-Download-Options header, or `false` to omit it. */
  xDownloadOptions?: string | false;
  /** Value for the X-Frame-Options header, or `false` to omit it. */
  xFrameOptions?: string | false;
  /** Value for the X-Permitted-Cross-Domain-Policies header, or `false` to omit it. */
  xPermittedCrossDomainPolicies?: string | false;
  /** Value for the legacy X-XSS-Protection header, or `false` to omit it. */
  xXssProtection?: string | false;
}

/**
 * Represents the rate limit middleware options accepted by the server configuration.
 */
export interface RateLimitOptionsInput {
  /** Duration of the rate-limit window in milliseconds. */
  windowMs?: number;
  /** Maximum number of requests allowed per window per client. */
  max?: number;
  /** HTTP status code returned when the limit is exceeded. */
  statusCode?: number;
  /** JSON body sent when the limit is exceeded. */
  message?: Record<string, unknown>;
  /** Whether to send the modern `RateLimit-*` headers. */
  standardHeaders?: boolean;
  /** Whether to send the legacy `X-RateLimit-*` headers. */
  legacyHeaders?: boolean;
}

/**
 * Represents the cookie parser middleware options accepted by the server configuration.
 */
export interface CookieParserOptionsInput {
  /** Whether cookie values are decoded with `decodeURIComponent`. */
  decode?: boolean;
}

/**
 * Represents the cookie session middleware options accepted by the server configuration.
 */
export interface CookieSessionOptionsInput {
  /** Name of the session cookie. */
  name?: string;
  /** Signing keys. Required when options are provided. */
  keys: readonly string[];
  /** Cookie max-age in milliseconds. When omitted, the cookie is a session cookie. */
  maxAge?: number;
  /** Cookie path attribute. */
  path?: string;
  /** Cookie domain attribute. */
  domain?: string;
  /** Whether the cookie is marked Secure. */
  secure?: boolean;
  /** Whether the cookie is marked HttpOnly. */
  httpOnly?: boolean;
  /** Cookie SameSite attribute. */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Whether an existing Set-Cookie header with the same name should be overwritten. */
  overwrite?: boolean;
}

/**
 * Represents the cookie middleware options accepted by the server configuration.
 */
export interface CookieOptionsInput {
  /** Cookie parser configuration. */
  parser?: CookieParserOptionsInput;
  /** Cookie session configuration. */
  session?: CookieSessionOptionsInput;
}

/**
 * Represents the CSRF middleware options accepted by the server configuration.
 */
export interface CSRFOptionsInput {
  /** Name of the CSRF cookie. */
  cookieName?: string;
  /** Name of the request header that must carry the token. */
  headerName?: string;
  /** HTTP methods that skip CSRF validation. */
  safeMethods?: readonly string[];
  /** Number of random bytes used to generate the token. */
  tokenBytes?: number;
  /** Cookie Path attribute. */
  path?: string;
  /** Cookie Domain attribute. */
  domain?: string;
  /** Whether the cookie is marked Secure. */
  secure?: boolean;
  /** Cookie SameSite attribute. */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Represents the compression middleware options accepted by the server configuration.
 */
export interface CompressOptionsInput {
  /** Minimum body size in bytes required to compress. Use `0` to compress any non-empty body. */
  threshold?: number;
  /** Compression level passed to the underlying zlib implementation. */
  level?: number;
  /** Compressible media types. When omitted, the default allow-list is used. */
  types?: readonly string[];
}

/**
 * Represents the base configuration options shared by all server configurations.
 */
export interface ServerConfigurationOptionsInputBase {
  /** Server listening configuration. */
  listen?: ListenOptionsInput;
  /** Request configuration. */
  request?: RequestOptionsInput;
  /** Response configuration. */
  response?: ResponseOptionsInput;
  /** Static files middleware configuration. */
  static?: StaticOptionsInput;
  /** CORS middleware configuration. */
  cors?: CORSOptionsInput;
  /** Security headers middleware configuration. */
  securityHeaders?: SecurityHeadersOptionsInput;
  /** Rate limit middleware configuration. */
  rateLimit?: RateLimitOptionsInput;
  /** Cookie middleware configuration. */
  cookie?: CookieOptionsInput;
  /** CSRF middleware configuration. */
  csrf?: CSRFOptionsInput;
  /** Compression middleware configuration. */
  compress?: CompressOptionsInput;
}

// ━━ SERVER CONFIGURATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the normalized listen options.
 */
export interface ListenOptions {
  /** The TCP port on which the server listens. */
  port: number | undefined;
  /** The hostname or IP address on which the server listens. */
  host: string | undefined;
  /** The maximum number of pending connections that may be queued. */
  backlog: number | undefined;
}

/**
 * Represents the normalized request options.
 */
export interface RequestOptions {
  /** Maximum number of bytes allowed for the request body. */
  bodyLimit: number | undefined;
  /** Whether (and how much) to trust proxy headers. */
  trustProxy: boolean | number | undefined;
}

/**
 * Represents the normalized response options.
 */
export interface ResponseOptions {
  /** Whether to generate a weak ETag for buffered bodies. */
  etag: boolean | undefined;
  /** Charset appended to eligible Content-Type headers when none is set. */
  defaultCharset: string | undefined;
}

/**
 * Represents the normalized static middleware options.
 */
export interface StaticOptions {
  /** Absolute resolved path to the static files root directory. */
  root: string;
  /** Ordered list of index file names. */
  index: readonly string[];
  /** Cache-Control max-age value in seconds. */
  maxAge: number;
  /** Whether to generate ETag headers. */
  etag: boolean;
  /** Whether to generate Last-Modified headers. */
  lastModified: boolean;
  /** Whether to delegate to the next middleware when no file is found. */
  fallthrough: boolean;
  /** Extensions to try when the request has no extension. */
  extensions: readonly string[] | undefined;
  /** Whether to serve dot-prefixed paths. */
  dotfiles: boolean;
}

/**
 * Represents the normalized CORS middleware options.
 */
export interface CORSOptions {
  /** Allowed origin(s). */
  origin: true | string | readonly string[];
  /** Allowed HTTP methods for preflight responses. */
  methods: readonly string[];
  /** Headers the client is allowed to send, or `undefined` to reflect the request headers. */
  allowedHeaders: readonly string[] | undefined;
  /** Headers the client is allowed to read from the response. */
  exposedHeaders: readonly string[] | undefined;
  /** Whether the response may include credentials. */
  credentials: boolean;
  /** How long (in seconds) the preflight response may be cached. */
  maxAge: number | undefined;
  /** Whether to call `next()` on successful preflight instead of ending the response. */
  preflightContinue: boolean;
  /** Status code used for successful preflight responses. */
  optionsSuccessStatus: number;
}

/**
 * Represents the normalized security headers middleware options.
 */
export interface SecurityHeadersOptions {
  /** Value for the Content-Security-Policy header, or `false` to omit it. */
  contentSecurityPolicy: string | false;
  /** Value for the Cross-Origin-Embedder-Policy header, or `false` to omit it. */
  crossOriginEmbedderPolicy: string | false;
  /** Value for the Cross-Origin-Opener-Policy header, or `false` to omit it. */
  crossOriginOpenerPolicy: string | false;
  /** Value for the Cross-Origin-Resource-Policy header, or `false` to omit it. */
  crossOriginResourcePolicy: string | false;
  /** Value for the Origin-Agent-Cluster header, or `false` to omit it. */
  originAgentCluster: string | false;
  /** Value for the Permissions-Policy header, or `false` to omit it. */
  permissionsPolicy: string | false;
  /** Value for the Referrer-Policy header, or `false` to omit it. */
  referrerPolicy: string | false;
  /** Value for the Strict-Transport-Security header, or `false` to omit it. */
  strictTransportSecurity: string | false;
  /** Value for the X-Content-Type-Options header, or `false` to omit it. */
  xContentTypeOptions: string | false;
  /** Value for the X-DNS-Prefetch-Control header, or `false` to omit it. */
  xDnsPrefetchControl: string | false;
  /** Value for the X-Download-Options header, or `false` to omit it. */
  xDownloadOptions: string | false;
  /** Value for the X-Frame-Options header, or `false` to omit it. */
  xFrameOptions: string | false;
  /** Value for the X-Permitted-Cross-Domain-Policies header, or `false` to omit it. */
  xPermittedCrossDomainPolicies: string | false;
  /** Value for the legacy X-XSS-Protection header, or `false` to omit it. */
  xXssProtection: string | false;
}

/**
 * Represents the normalized rate limit middleware options.
 */
export interface RateLimitOptions {
  /** Duration of the rate-limit window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed per window per client. */
  max: number;
  /** HTTP status code returned when the limit is exceeded. */
  statusCode: number;
  /** JSON body sent when the limit is exceeded. */
  message: Readonly<Record<string, unknown>>;
  /** Whether to send the modern `RateLimit-*` headers. */
  standardHeaders: boolean;
  /** Whether to send the legacy `X-RateLimit-*` headers. */
  legacyHeaders: boolean;
}

/**
 * Represents the normalized cookie parser middleware options.
 */
export interface CookieParserOptions {
  /** Whether cookie values are decoded with `decodeURIComponent`. */
  decode: boolean;
}

/**
 * Represents the normalized cookie session middleware options.
 */
export interface CookieSessionOptions {
  /** Name of the session cookie. */
  name: string;
  /** Signing keys. The first key is used to sign; all keys are tried when verifying. */
  keys: readonly string[];
  /** Cookie max-age in milliseconds. When `undefined`, the cookie is a session cookie. */
  maxAge: number | undefined;
  /** Cookie path attribute. */
  path: string;
  /** Cookie domain attribute. */
  domain: string | undefined;
  /** Whether the cookie is marked Secure. */
  secure: boolean;
  /** Whether the cookie is marked HttpOnly. */
  httpOnly: boolean;
  /** Cookie SameSite attribute. */
  sameSite: 'Strict' | 'Lax' | 'None';
  /** Whether an existing Set-Cookie header with the same name should be overwritten. */
  overwrite: boolean;
}

/**
 * Represents the normalized cookie middleware options.
 */
export interface CookieOptions {
  /** Normalized cookie parser options. */
  parser: CookieParserOptions;
  /** Normalized cookie session options. */
  session?: CookieSessionOptions;
}

/**
 * Represents the normalized CSRF middleware options.
 */
export interface CSRFOptions {
  /** Name of the CSRF cookie. */
  cookieName: string;
  /** Name of the request header that must carry the token. */
  headerName: string;
  /** HTTP methods that skip CSRF validation. */
  safeMethods: readonly string[];
  /** Number of random bytes used to generate the token. */
  tokenBytes: number;
  /** Cookie Path attribute. */
  path: string;
  /** Cookie Domain attribute. */
  domain: string | undefined;
  /** Whether the cookie is marked Secure. */
  secure: boolean;
  /** Cookie SameSite attribute. */
  sameSite: 'Strict' | 'Lax' | 'None';
}

/**
 * Represents the normalized compression middleware options.
 */
export interface CompressOptions {
  /** Minimum body size in bytes required to compress. Use `0` to compress any non-empty body. */
  threshold: number;
  /** Compression level passed to the underlying zlib implementation. */
  level: number;
  /** Compressible media types. When `undefined`, the default allow-list is used. */
  types: readonly string[] | undefined;
}

/**
 * Represents the object representation of a server configuration.
 */
export interface ServerConfigurationObject {
  /** Connection options forwarded to the adapter. */
  connection?: ServerConnectionOptions;
  /** Normalized listen options. */
  listen?: ListenOptions;
  /** Normalized request options. */
  request?: RequestOptions;
  /** Normalized response options. */
  response?: ResponseOptions;
  /** Normalized static options. */
  static?: StaticOptions;
  /** Normalized CORS options. */
  cors?: CORSOptions;
  /** Normalized security headers options. */
  securityHeaders?: SecurityHeadersOptions;
  /** Normalized rate limit options. */
  rateLimit?: RateLimitOptions;
  /** Normalized cookie options. */
  cookie?: CookieOptions;
  /** Normalized CSRF options. */
  csrf?: CSRFOptions;
  /** Normalized compression options. */
  compress?: CompressOptions;
}

/**
 * Base contract shared by all server configurations.
 */
export interface ServerConfiguration {
  /** Transport identifier. */
  readonly transport: Transport;
  /** Application-level protocol. */
  readonly protocol: Protocol;
  /** Connection options forwarded to the adapter. */
  readonly connection: ServerConnectionOptions | undefined;

  /** Normalized listen configuration. */
  readonly listen: ListenOptions | undefined;
  /** Normalized request configuration. */
  readonly request: RequestOptions | undefined;
  /** Normalized response configuration. */
  readonly response: ResponseOptions | undefined;
  /** Normalized static files configuration. */
  readonly static: StaticOptions | undefined;
  /** Normalized CORS configuration. */
  readonly cors: CORSOptions | undefined;
  /** Normalized security headers configuration. */
  readonly securityHeaders: SecurityHeadersOptions | undefined;
  /** Normalized rate limit configuration. */
  readonly rateLimit: RateLimitOptions | undefined;
  /** Normalized cookie configuration. */
  readonly cookie: CookieOptions | undefined;
  /** Normalized CSRF configuration. */
  readonly csrf: CSRFOptions | undefined;
  /** Normalized compression configuration. */
  readonly compress: CompressOptions | undefined;

  /**
   * Returns a plain object representation of the server configuration.
   */
  toObject(): ServerConfigurationObject;
}

export interface HttpServerConfigurationOptions
  extends ServerConfigurationOptionsInputBase {
  connection?: http.ServerOptions;
}

export interface HttpsServerConfigurationOptions
  extends ServerConfigurationOptionsInputBase {
  connection?: https.ServerOptions;
}

export interface Http2CleartextServerConfigurationOptions
  extends ServerConfigurationOptionsInputBase {
  connection?: http2.ServerOptions;
}

export interface Http2SecureServerConfigurationOptions
  extends ServerConfigurationOptionsInputBase {
  connection?: http2.SecureServerOptions;
}

export declare class HttpServerConfiguration implements ServerConfiguration {
  constructor(options?: HttpServerConfigurationOptions);
  readonly transport: 'h1';
  readonly protocol: 'http';
  readonly connection: http.ServerOptions | undefined;
  readonly listen: ListenOptions | undefined;
  readonly request: RequestOptions | undefined;
  readonly response: ResponseOptions | undefined;
  readonly static: StaticOptions | undefined;
  readonly cors: CORSOptions | undefined;
  readonly securityHeaders: SecurityHeadersOptions | undefined;
  readonly rateLimit: RateLimitOptions | undefined;
  readonly cookie: CookieOptions | undefined;
  readonly csrf: CSRFOptions | undefined;
  readonly compress: CompressOptions | undefined;
  toObject(): ServerConfigurationObject;
}

export declare class HttpsServerConfiguration implements ServerConfiguration {
  constructor(options?: HttpsServerConfigurationOptions);
  readonly transport: 'h1s';
  readonly protocol: 'https';
  readonly connection: https.ServerOptions | undefined;
  readonly listen: ListenOptions | undefined;
  readonly request: RequestOptions | undefined;
  readonly response: ResponseOptions | undefined;
  readonly static: StaticOptions | undefined;
  readonly cors: CORSOptions | undefined;
  readonly securityHeaders: SecurityHeadersOptions | undefined;
  readonly rateLimit: RateLimitOptions | undefined;
  readonly cookie: CookieOptions | undefined;
  readonly csrf: CSRFOptions | undefined;
  readonly compress: CompressOptions | undefined;
  toObject(): ServerConfigurationObject;
}

export declare class Http2CleartextServerConfiguration
  implements ServerConfiguration
{
  constructor(options?: Http2CleartextServerConfigurationOptions);
  readonly transport: 'h2c';
  readonly protocol: 'http';
  readonly connection: http2.ServerOptions | undefined;
  readonly listen: ListenOptions | undefined;
  readonly request: RequestOptions | undefined;
  readonly response: ResponseOptions | undefined;
  readonly static: StaticOptions | undefined;
  readonly cors: CORSOptions | undefined;
  readonly securityHeaders: SecurityHeadersOptions | undefined;
  readonly rateLimit: RateLimitOptions | undefined;
  readonly cookie: CookieOptions | undefined;
  readonly csrf: CSRFOptions | undefined;
  readonly compress: CompressOptions | undefined;
  toObject(): ServerConfigurationObject;
}

export declare class Http2SecureServerConfiguration
  implements ServerConfiguration
{
  constructor(options?: Http2SecureServerConfigurationOptions);
  readonly transport: 'h2';
  readonly protocol: 'https';
  readonly connection: http2.SecureServerOptions | undefined;
  readonly listen: ListenOptions | undefined;
  readonly request: RequestOptions | undefined;
  readonly response: ResponseOptions | undefined;
  readonly static: StaticOptions | undefined;
  readonly cors: CORSOptions | undefined;
  readonly securityHeaders: SecurityHeadersOptions | undefined;
  readonly rateLimit: RateLimitOptions | undefined;
  readonly cookie: CookieOptions | undefined;
  readonly csrf: CSRFOptions | undefined;
  readonly compress: CompressOptions | undefined;
  toObject(): ServerConfigurationObject;
}

// ━━ ROUTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the options used to create an exchange layer.
 */
export interface ExchangeLayerOptions {
  method: HTTPMethod;
  pathnamePattern: string;
  middleware: MiddlewareFunction;
}

/**
 * Represents the result produced by composing a router.
 */
export interface RouterComposition {
  middlewares: MiddlewareFunction[];
  layersOptions: ExchangeLayerOptions[];
}

/**
 * Defines HTTP middleware pipelines by pathname pattern and method.
 *
 * Provides a fluent API for registering middleware.
 */
export declare class Router {
  constructor();

  /**
   * Registers middleware for all routes in the router.
   */
  use(...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for all HTTP methods.
   *
   * @param pathnamePattern - The pathname pattern to match.
   * @param middlewares - The middleware functions to execute.
   */
  all(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for GET requests.
   */
  get(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for QUERY requests.
   */
  query(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for POST requests.
   */
  post(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for PUT requests.
   */
  put(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for PATCH requests.
   */
  patch(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for DELETE requests.
   */
  delete(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for HEAD requests.
   */
  head(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Registers middleware for TRACE requests.
   */
  trace(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;

  /**
   * Composes the registered exchange layer options.
   *
   * @returns The composed router configuration.
   */
  compose(): RouterComposition;
}

// ━━ EVENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface ListenEventData {
  endpoint: Endpoint;
  address: Address;
  elapsed: number;
}

export interface CloseEventData {
  elapsed: number;
}

// ━━ SERVER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * The central entry point for configuring and controlling the application server.
 *
 * It manages the server lifecycle, middleware and route registration, and
 * server event notifications. The server remains inactive until `listen()`
 * is called.
 */
export declare class Server {
  constructor(configuration: ServerConfiguration);

  /**
   * The current lifecycle state of the server.
   */
  readonly state: ServerState;

  /**
   * Whether the server is currently listening for incoming requests.
   */
  readonly listening: boolean;

  /**
   * The IPC subsystem owned by the server.
   *
   * Available only while the server is listening. Accessing this property
   * before `listen()` resolves throws a `ServerError`.
   */
  readonly ipc: IPCMain;

  // ── Registration ─────────────────────────────────────────────────────────

  /**
   * Registers middleware for all HTTP methods.
   */
  use(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for GET requests.
   */
  get(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for POST requests.
   */
  post(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for PUT requests.
   */
  put(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for PATCH requests.
   */
  patch(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for DELETE requests.
   */
  delete(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for HEAD requests.
   */
  head(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for TRACE requests.
   */
  trace(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Registers middleware for QUERY requests.
   */
  query(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  /**
   * Mounts a router instance at a specific pathname prefix.
   *
   * @param pathnamePattern - Pathname prefix where the router is mounted.
   * @param router - Router instance to mount.
   */
  mount(pathnamePattern: string, router: Router): this;

  /**
   * Registers a custom handler for requests that do not match any route.
   *
   * @param handler - The handler function executed on unmatched routes.
   */
  notFound(handler: NotFoundHandler): this;

  /**
   * Registers a handler for errors raised during request processing.
   *
   * @param handler - The error handling function.
   */
  systemError(handler: SystemErrorHandler): this;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Starts listening for incoming requests.
   *
   * Transitions the server state from `idle` to `starting`, and upon success,
   * to `listening`.
   */
  listen(): Promise<void>;

  /**
   * Stops the server and releases associated network resources.
   */
  close(): Promise<void>;

  // ── Events (typed overloads) ─────────────────────────────────────────────
  // No JSDoc needed here. The literals and callback types are self-documenting.
  on(event: 'listen', listener: (data: ListenEventData) => void): this;
  on(event: 'close', listener: (data: CloseEventData) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'exchange:start', listener: (data: ExchangeStartInfo) => void): this;
  on(event: 'exchange:end', listener: (data: ExchangeEndInfo) => void): this;
  on(event: 'exchange:error', listener: (data: ExchangeErrorInfo) => void): this;
  on(event: EventName, listener: (data?: unknown) => void): this;

  once(event: 'listen', listener: (data: ListenEventData) => void): this;
  once(event: 'close', listener: (data: CloseEventData) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: 'exchange:start', listener: (data: ExchangeStartInfo) => void): this;
  once(event: 'exchange:end', listener: (data: ExchangeEndInfo) => void): this;
  once(event: 'exchange:error', listener: (data: ExchangeErrorInfo) => void): this;
  once(event: EventName, listener: (data?: unknown) => void): this;

  off(event: 'listen', listener: (data: ListenEventData) => void): this;
  off(event: 'close', listener: (data: CloseEventData) => void): this;
  off(event: 'error', listener: (error: Error) => void): this;
  off(event: 'exchange:start', listener: (data: ExchangeStartInfo) => void): this;
  off(event: 'exchange:end', listener: (data: ExchangeEndInfo) => void): this;
  off(event: 'exchange:error', listener: (data: ExchangeErrorInfo) => void): this;
  off(event: EventName, listener: (data?: unknown) => void): this;

  onListen(listener: (data: ListenEventData) => void): this;
  onClose(listener: (data: CloseEventData) => void): this;
  onError(listener: (error: Error) => void): this;
  onExchangeStart(listener: (data: ExchangeStartInfo) => void): this;
  onExchangeEnd(listener: (data: ExchangeEndInfo) => void): this;
  onExchangeError(listener: (data: ExchangeErrorInfo) => void): this;

  [Symbol.asyncDispose](): Promise<void>;
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default Server;

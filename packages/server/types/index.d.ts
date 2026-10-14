/**
 * Type definitions for @boo/server
 *
 * Generated to support TypeScript consumers while keeping the core JS-based.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as stream from 'node:stream';

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents an HTTP method supported by the routing layer.
 */
export type HTTPMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'QUERY' | 'TRACE';

/**
 * Identifies an application-layer communication protocol.
 */
export type Protocol = 'http' | 'https';

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

// ═══════════════════════════════════════════════════════════════════════════
// VALUE OBJECTS
// ═══════════════════════════════════════════════════════════════════════════

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
}

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
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents an outgoing HTTP response.
 *
 * Instances are produced by the runtime and exposed as `exchange.response`.
 */
export interface Response {
  readonly statusCode: number;
  readonly statusText: string;
  readonly isCommitted: boolean;
  readonly bodyKind: BodyKind;
  readonly bodyLength: number | undefined;

  status(code: number): this;
  setHeader(name: string, value: string | number | (string | number)[]): this;
  setHeaders(
    headers: Record<string, string | number | (string | number)[]>,
  ): this;
  appendHeader(name: string, value: string | number): this;
  getHeader(name: string): string | number | (string | number)[] | undefined;
  hasHeader(name: string): boolean;
  removeHeader(name: string): this;
  getHeaders(): Readonly<Record<string, string | number | (string | number)[]>>;

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

// ═══════════════════════════════════════════════════════════════════════════
// EXCHANGE
// ═══════════════════════════════════════════════════════════════════════════

export interface ExchangeTiming {
  startedAt: number;
  endedAt?: number;
  duration?: number;
}

export interface ExchangeStartInfo {
  id: string;
  traceId: string;
  request: { method: string; pathname: string };
  timing: { startedAt: number };
}

export interface ExchangeEndInfo {
  id: string;
  traceId: string;
  request: { method: string; pathname: string };
  outcome: 'success' | 'error';
  timing: ExchangeTiming;
}

export interface ExchangeErrorInfo {
  id: string;
  traceId: string;
  error: Error;
  request: { method: string; pathname: string };
  timing: ExchangeTiming;
}

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

// ═══════════════════════════════════════════════════════════════════════════
// IPC
// ═══════════════════════════════════════════════════════════════════════════

export type IPCHandler<T = unknown, R = unknown> = (
  data: T,
) => R | Promise<R>;

export type IPCEventListener<T = unknown> = (data: T) => void;

/**
 * Owns the IPC subsystem and its application-facing API.
 *
 * Accessible through `server.ipc` while the server is listening.
 */
export interface IPCMain {
  handle<T = unknown, R = unknown>(
    channel: string,
    handler: IPCHandler<T, R>,
  ): this;
  removeHandler(channel: string): this;
  on<T = unknown>(channel: string, listener: IPCEventListener<T>): this;
  off<T = unknown>(channel: string, listener: IPCEventListener<T>): this;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION INPUTS
// ═══════════════════════════════════════════════════════════════════════════

export interface ListenOptionsInput {
  port?: number;
  host?: string;
  backlog?: number;
}

export interface RequestOptionsInput {
  bodyLimit?: number;
  trustProxy?: boolean | number;
}

export interface ResponseOptionsInput {
  etag?: boolean;
  defaultCharset?: string;
}

export interface StaticOptionsInput {
  root: string;
  index?: readonly string[];
  maxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  fallthrough?: boolean;
  extensions?: readonly string[];
  dotfiles?: boolean;
}

export interface CORSOptionsInput {
  origin?: true | string | readonly string[];
  methods?: readonly string[];
  allowedHeaders?: readonly string[];
  exposedHeaders?: readonly string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface SecurityHeadersOptionsInput {
  contentSecurityPolicy?: string | false;
  crossOriginEmbedderPolicy?: string | false;
  crossOriginOpenerPolicy?: string | false;
  crossOriginResourcePolicy?: string | false;
  originAgentCluster?: string | false;
  permissionsPolicy?: string | false;
  referrerPolicy?: string | false;
  strictTransportSecurity?: string | false;
  xContentTypeOptions?: string | false;
  xDnsPrefetchControl?: string | false;
  xDownloadOptions?: string | false;
  xFrameOptions?: string | false;
  xPermittedCrossDomainPolicies?: string | false;
  xXssProtection?: string | false;
}

export interface RateLimitOptionsInput {
  windowMs?: number;
  max?: number;
  statusCode?: number;
  message?: Record<string, unknown>;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface CookieParserOptionsInput {
  decode?: boolean;
}

export interface CookieSessionOptionsInput {
  name?: string;
  keys: readonly string[];
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  overwrite?: boolean;
}

export interface CookieOptionsInput {
  parser?: CookieParserOptionsInput;
  session?: CookieSessionOptionsInput;
}

export interface CSRFOptionsInput {
  cookieName?: string;
  headerName?: string;
  safeMethods?: readonly string[];
  tokenBytes?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface CompressOptionsInput {
  threshold?: number;
  level?: number;
  types?: readonly string[];
}

export interface ServerConfigurationOptionsInputBase {
  listen?: ListenOptionsInput;
  request?: RequestOptionsInput;
  response?: ResponseOptionsInput;
  static?: StaticOptionsInput;
  cors?: CORSOptionsInput;
  securityHeaders?: SecurityHeadersOptionsInput;
  rateLimit?: RateLimitOptionsInput;
  cookie?: CookieOptionsInput;
  csrf?: CSRFOptionsInput;
  compress?: CompressOptionsInput;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════
export interface ListenOptions {
  port: number | undefined;
  host: string | undefined;
  backlog: number | undefined;
}

export interface RequestOptions {
  bodyLimit: number | undefined;
  trustProxy: boolean | number | undefined;
}

export interface ResponseOptions {
  etag: boolean | undefined;
  defaultCharset: string | undefined;
}

export interface StaticOptions {
  root: string;
  index: readonly string[];
  maxAge: number;
  etag: boolean;
  lastModified: boolean;
  fallthrough: boolean;
  extensions: readonly string[] | undefined;
  dotfiles: boolean;
}

export interface CORSOptions {
  origin: true | string | readonly string[];
  methods: readonly string[];
  allowedHeaders: readonly string[] | undefined;
  exposedHeaders: readonly string[] | undefined;
  credentials: boolean;
  maxAge: number | undefined;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

export interface SecurityHeadersOptions {
  contentSecurityPolicy: string | false;
  crossOriginEmbedderPolicy: string | false;
  crossOriginOpenerPolicy: string | false;
  crossOriginResourcePolicy: string | false;
  originAgentCluster: string | false;
  permissionsPolicy: string | false;
  referrerPolicy: string | false;
  strictTransportSecurity: string | false;
  xContentTypeOptions: string | false;
  xDnsPrefetchControl: string | false;
  xDownloadOptions: string | false;
  xFrameOptions: string | false;
  xPermittedCrossDomainPolicies: string | false;
  xXssProtection: string | false;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  statusCode: number;
  message: Readonly<Record<string, unknown>>;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface CookieParserOptions {
  decode: boolean;
}

export interface CookieSessionOptions {
  name: string;
  keys: readonly string[];
  maxAge: number | undefined;
  path: string;
  domain: string | undefined;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
  overwrite: boolean;
}

export interface CookieOptions {
  parser: CookieParserOptions;
  session?: CookieSessionOptions;
}

export interface CSRFOptions {
  cookieName: string;
  headerName: string;
  safeMethods: readonly string[];
  tokenBytes: number;
  path: string;
  domain: string | undefined;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface CompressOptions {
  threshold: number;
  level: number;
  types: readonly string[] | undefined;
}

// ── ServerConfigurationObject ─────────────────────────────────────────────
export interface ServerConfigurationObject {
  connection?: ServerConnectionOptions;
  listen?: ListenOptions;
  request?: RequestOptions;
  response?: ResponseOptions;
  static?: StaticOptions;
  cors?: CORSOptions;
  securityHeaders?: SecurityHeadersOptions;
  rateLimit?: RateLimitOptions;
  cookie?: CookieOptions;
  csrf?: CSRFOptions;
  compress?: CompressOptions;
}

/**
 * Base contract shared by all server configurations.
 */
export interface ServerConfiguration {
  readonly transport: Transport;
  readonly protocol: Protocol;
  readonly connection: ServerConnectionOptions | undefined;
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
  toObject(): ServerConfigurationObject;
}

export declare class HttpsServerConfiguration implements ServerConfiguration {
  constructor(options?: HttpsServerConfigurationOptions);
  readonly transport: 'h1s';
  readonly protocol: 'https';
  readonly connection: https.ServerOptions | undefined;
  toObject(): ServerConfigurationObject;
}

export declare class Http2CleartextServerConfiguration
  implements ServerConfiguration
{
  constructor(options?: Http2CleartextServerConfigurationOptions);
  readonly transport: 'h2c';
  readonly protocol: 'http';
  readonly connection: http2.ServerOptions | undefined;
  toObject(): ServerConfigurationObject;
}

export declare class Http2SecureServerConfiguration
  implements ServerConfiguration
{
  constructor(options?: Http2SecureServerConfigurationOptions);
  readonly transport: 'h2';
  readonly protocol: 'https';
  readonly connection: http2.SecureServerOptions | undefined;
  toObject(): ServerConfigurationObject;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export declare class Router {
  constructor();

  use(...middlewares: MiddlewareFunction[]): this;
  all(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  get(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  post(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  put(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  patch(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  delete(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  head(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  trace(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
  query(pathnamePattern: string, ...middlewares: MiddlewareFunction[]): this;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface ListenEventData {
  endpoint: Endpoint;
  address: Address;
  elapsed: number;
}

export interface CloseEventData {
  elapsed: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVER
// ═══════════════════════════════════════════════════════════════════════════

export declare class Server {
  constructor(configuration: ServerConfiguration);

  readonly state: ServerState;
  readonly listening: boolean;
  readonly ipc: IPCMain;

  // ── Registration ─────────────────────────────────────────────────────────
  use(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  get(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  post(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  put(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  patch(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  delete(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  head(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  trace(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;
  query(
    pathnamePattern: string | MiddlewareFunction,
    ...middlewares: MiddlewareFunction[]
  ): this;

  mount(pathnamePattern: string, router: Router): this;
  notFound(handler: NotFoundHandler): this;
  systemError(handler: SystemErrorHandler): this;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  listen(): Promise<void>;
  close(): Promise<void>;

  // ── Events (typed overloads) ─────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default Server;

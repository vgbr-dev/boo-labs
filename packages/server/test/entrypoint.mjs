// @ts-check
/**
 * @file Central re-export of all classes and value-objects under test.
 * Import from here in test files instead of deep relative paths.
 *
 * @module test/entrypoint
 */

// ─── Core ────────────────────────────────────────────────────────────────────
export { default as Request } from '#Request';
export { default as Response } from '#Response';
export { default as Exchange, wrapResponseBody, discardResponseState } from '#Exchange';
export { default as ExchangeContext } from '../source/core/Exchange/ExchangeContext.mjs';
export { default as Telemetry } from '../source/core/Exchange/Telemetry.mjs';

// ─── Request parsers ─────────────────────────────────────────────────────────
export { default as BodyParser } from '../source/core/Request/BodyParser/BodyParser.mjs';
export { default as JSONParser } from '../source/core/Request/BodyParser/JSONParser.mjs';
export { default as MultipartParser } from '../source/core/Request/BodyParser/MultipartParser.mjs';
export { default as URLEncodedParser } from '../source/core/Request/BodyParser/URLEncodedParser.mjs';
export { default as RequestHeaders } from '../source/core/Request/RequestHeaders.mjs';

// ─── Routing ─────────────────────────────────────────────────────────────────
export { default as Router } from '#routing/Router';
export { default as RouterSystem } from '#routing/RouterSystem';
export { default as Pipeline } from '#routing/Pipeline';
export { default as ExchangeLayer } from '#routing/ExchangeLayer';
export { default as ExchangeMatcher } from '../source/core/routing/ExchangeLayer/ExchangeMatcher.mjs';
export { default as Route } from '../source/core/routing/Router/Route.mjs';
export { default as RouteRegister } from '../source/core/routing/RouterRegister/index.mjs';
export { default as OptionsMiddleware } from '../source/core/routing/RouterRegister/OptionsMiddleware.mjs';

// ─── Middlewares ─────────────────────────────────────────────────────────────
export { default as CSRFMiddleware } from '#middlewares/CSRFMiddleware';
export { default as CORSMiddleware } from '#middlewares/CORSMiddleware';
export { default as CompressMiddleware } from '#middlewares/CompressMiddleware';
export { default as CookieParserMiddleware } from '#middlewares/CookieParserMiddleware';
export { default as CookieSessionMiddleware } from '#middlewares/CookieSessionMiddleware';
export { default as RateLimitMiddleware } from '#middlewares/RateLimitMiddleware';
export { default as SecurityHeadersMiddleware } from '#middlewares/SecurityHeadersMiddleware';
export { default as StaticMiddleware } from '#middlewares/StaticMiddleware';

// ─── Application ─────────────────────────────────────────────────────────────
export { default as Kernel } from '#Kernel';
export { default as Server } from '#Server';
export {
  default as ServerConfiguration,
  composeConfiguration,
} from '#configurations/ServerConfiguration';
export { default as HttpServerConfiguration } from '#configurations/HttpServerConfiguration';
export { default as HttpsServerConfiguration } from '#configurations/HttpsServerConfiguration';
export { default as Http2SecureServerConfiguration } from '#configurations/Http2SecureServerConfiguration';
export { default as Http2CleartextServerConfiguration } from '#configurations/Http2CleartextServerConfiguration';

// ─── Value Objects (ServerOptions) ───────────────────────────────────────────
export { default as CSRFOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/CSRFOptions/CSRFOptionsValue.mjs';
export { default as CORSOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/CORSOptions/CORSOptionsValue.mjs';
export { default as CompressOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/CompressOptions/CompressOptionsValue.mjs';
export { default as CookieParserOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/CookieParserOptions/CookieParserOptionsValue.mjs';
export { default as CookieSessionOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/CookieSessionOptions/CookieSessionOptionsValue.mjs';
export { default as RateLimitOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/RateLimitOptions/RateLimitOptionsValue.mjs';
export { default as SecurityHeadersOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/SecurityHeadersOptions/SecurityHeadersOptionsValue.mjs';
export { default as StaticOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/StaticOptions/StaticOptionsValue.mjs';
export { default as ListenOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/ListenOptions/ListenOptionsValue.mjs';
export { default as RequestOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/RequestOptions/RequestOptionsValue.mjs';
export { default as ResponseOptionsValue } from '../source/application/configurations/ServerConfiguration/Options/ResponseOptions/ResponseOptionsValue.mjs';

// ─── Shared ──────────────────────────────────────────────────────────────────
export { default as ServerError } from '#shared/errors/ServerError';
export { ROUTER_BRAND, SERVER_CONFIGURATION_BRAND } from '#shared/constants/symbols/brands';

// ─── IPC ─────────────────────────────────────────────────────────────────────
export { default as IPCProtocol } from '../source/core/IPCMain/IPCProtocol.mjs';
export { default as WebSocketAdapter } from '../source/core/IPCMain/WebSocketAdapter.mjs';

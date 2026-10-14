// @ts-check
/**
 * @file Public API for the `@boo/server` package.
 *
 * @description Exposes the public classes for configuring, routing, and
 * running zero-dependency HTTP servers in Node.js, following Clean
 * Architecture principles.
 *
 * Exports:
 *
 * - Server (default): The main HTTP server class.
 * - Router: Provides route registration and composition.
 * - HttpServerConfiguration: Configuration for standard HTTP/1.1 servers.
 * - HttpsServerConfiguration: Configuration for secure HTTPS servers.
 * - Http2CleartextServerConfiguration: Configuration for cleartext HTTP/2 (h2c) servers.
 * - Http2SecureServerConfiguration: Configuration for secure HTTP/2 (h2) servers.
 *
 * @module BooServerAPI
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import Server from '#Server';
import Router from '#routing/Router';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';
import HttpsServerConfiguration from '#configurations/HttpsServerConfiguration';
import Http2CleartextServerConfiguration from '#configurations/Http2CleartextServerConfiguration';
import Http2SecureServerConfiguration from '#configurations/Http2SecureServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Public API namespace for the `@boo/server` package.
 *
 * Describes the classes exposed by the package's public entry point.
 *
 * @typedef  {object}                                   BooServerAPI
 * @property {typeof Server}                            default                           - Main HTTP server class.
 * @property {typeof Router}                            Router                            - Route registration and composition.
 * @property {typeof HttpServerConfiguration}           HttpServerConfiguration           - HTTP/1.1 server configuration.
 * @property {typeof HttpsServerConfiguration}          HttpsServerConfiguration          - HTTPS server configuration.
 * @property {typeof Http2CleartextServerConfiguration} Http2CleartextServerConfiguration - Cleartext HTTP/2 (h2c) server configuration.
 * @property {typeof Http2SecureServerConfiguration}    Http2SecureServerConfiguration    - Secure HTTP/2 (h2) server configuration.
 */

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Default export: The primary class used to create and run an HTTP server.
 *
 * @type {typeof Server}
 */
export default Server;

/**
 * Named exports: The router and the supported server configuration classes.
 */
export {
  Router,
  HttpServerConfiguration,
  HttpsServerConfiguration,
  Http2CleartextServerConfiguration,
  Http2SecureServerConfiguration,
};

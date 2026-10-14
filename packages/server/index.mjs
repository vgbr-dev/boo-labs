// @ts-check
/**
 * @file Entry point for `ES Module` consumers.
 *
 * @description Provides the default export and named exports of the
 * `@boo/server` public API for modern JavaScript environments using ES Modules.
 *
 * This file acts as a facade, re-exporting the main functionality from the
 * internal source module while maintaining a clean public boundary.
 *
 * @module @boo/server/esm
 * @since 1.0.0
 */

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export {
  default,
  Router,
  HttpServerConfiguration,
  HttpsServerConfiguration,
  Http2CleartextServerConfiguration,
  Http2SecureServerConfiguration,
} from './source/index.mjs';

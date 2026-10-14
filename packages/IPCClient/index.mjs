// @ts-check
/**
 * @file Entry point for `ES Module` consumers.
 *
 * @description Provides the default export and named exports of the
 * `@boo-labs/ipc-client` public API for modern JavaScript environments using
 * ES Modules.
 *
 * This file acts as a facade, re-exporting the main functionality from the
 * internal source module while maintaining a clean public boundary.
 *
 * @module @boo-labs/ipc-client/esm
 * @since 1.0.0
 */

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export { default } from './source/index.mjs';

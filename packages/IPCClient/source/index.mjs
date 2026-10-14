// @ts-check
/**
 * @file Public API for the `@boo-labs/ipc-client` package.
 *
 * @description Exposes the public class for connecting to a `@boo-labs/server`
 * IPC endpoint over WebSocket and exchanging invocations, events, handlers,
 * and listeners.
 *
 * Exports:
 *
 * - IPCClient (default): The main client class.
 *
 * @module BooIPCClientAPI
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT LOCAL MODULES
import IPCClient from '#core/IPCClient';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Public API namespace for the `@boo-labs/ipc-client` package.
 *
 * Describes the class exposed by the package's public entry point.
 *
 * @typedef  {object}           BooIPCClientAPI
 * @property {typeof IPCClient} default         - Main IPC client class.
 */

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Default export: The primary class used to connect and exchange IPC messages.
 *
 * @type {typeof IPCClient}
 */
export default IPCClient;

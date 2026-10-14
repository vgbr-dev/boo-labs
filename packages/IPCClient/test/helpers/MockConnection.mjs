// @ts-check
/**
 * @file Minimal connection mock for `IPCClientChannel` tests.
 *
 * @description Provides the subset of the transport contract required by
 * `IPCClientChannel`: `send`, `close`, `on`, `off`, and an internal
 * `receive` helper for simulating incoming messages.
 *
 * @module MockConnection
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { EventEmitter } from 'node:events';

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Minimal connection mock compatible with the channel expectations.
 *
 * @classdesc Extends `EventEmitter` and records outgoing messages for
 * assertions.
 */
class MockConnection extends EventEmitter {
  /**
   * Messages recorded by `send`.
   *
   * @type {string[]}
   */
  sent = [];

  /**
   * Whether the connection has been closed.
   *
   * @type {boolean}
   */
  closed = false;

  /**
   * Records an outgoing message when the connection is open.
   *
   * @param {string} data - Message payload to record.
   * @throws {Error} If the connection is closed.
   *
   * @example
   * ```js
   * const connection = new MockConnection();
   *
   * connection.send('hello');
   *
   * console.log(connection.sent);
   * // ['hello']
   * ```
   */
  send(data) {
    if (this.closed) {
      throw new Error('Connection is closed');
    }

    this.sent.push(data);
  }

  /**
   * Marks the connection as closed and emits the `close` event.
   *
   * @example
   * ```js
   * const connection = new MockConnection();
   *
   * connection.close();
   *
   * console.log(connection.closed);
   * // true
   * ```
   */
  close() {
    this.closed = true;
    this.emit('close');
  }

  /**
   * Simulates an incoming message from the remote endpoint.
   *
   * @param {string} data - Message payload to deliver.
   *
   * @example
   * ```js
   * const connection = new MockConnection();
   *
   * connection.on('message', data => console.log(data));
   *
   * connection.receive('hello');
   * // 'hello'
   * ```
   */
  receive(data) {
    this.emit('message', data);
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MockConnection;

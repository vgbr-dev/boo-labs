// @ts-check
/**
 * @file Provides a controllable WebSocket mock for client tests.
 *
 * @module MockWebSocket
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { EventEmitter } from 'node:events';

// » IMPORT THIRD PARTY MODULES

// » IMPORT LOCAL MODULES

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * WebSocket-compatible data accepted by the mock's `send()` method.
 *
 * @typedef {string | ArrayBuffer | Uint8Array} MockWebSocketData
 */

/**
 * Event payload emitted by the mock for incoming messages.
 *
 * @typedef  {object}            MockWebSocketMessage
 * @property {MockWebSocketData} data                 - Received message data.
 */

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Controllable WebSocket mock for testing `WebSocketClient` without a network
 * connection.
 *
 * @classdesc The mock implements the subset of the WebSocket interface required
 * by the client. It exposes methods to simulate connection events and records
 * outgoing messages for assertions.
 *
 * Every instance is registered in {@link MockWebSocket.instances}, allowing
 * tests to retrieve the created socket without accessing the client's private
 * state.
 */
class MockWebSocket extends EventEmitter {
  /** @type {number} */
  static CONNECTING = 0;

  /** @type {number} */
  static OPEN = 1;

  /** @type {number} */
  static CLOSING = 2;

  /** @type {number} */
  static CLOSED = 3;

  /**
   * Instances created during the current test lifecycle.
   *
   * Tests should clear this collection during setup or teardown to prevent state leaking
   * between test cases.
   *
   * @type {MockWebSocket[]}
   */
  static instances = [];

  /**
   * URL supplied when the mock was constructed.
   *
   * @type {string}
   */
  url;

  /**
   * Optional subprotocol or list of subprotocols supplied at construction.
   *
   * @type {string | string[] | undefined}
   */
  protocols;

  /**
   * Current simulated WebSocket connection state.
   *
   * @type {number}
   */
  readyState = MockWebSocket.CONNECTING;

  /**
   * Binary data representation requested by the client.
   *
   * @type {string}
   */
  binaryType = 'blob';

  /**
   * Data passed to {@link MockWebSocket.send}.
   *
   * @type {MockWebSocketData[]}
   */
  sent = [];

  /**
   * Indicates whether {@link MockWebSocket.close} has been called.
   *
   * @type {boolean}
   */
  closed = false;

  /**
   * Creates a mock WebSocket and registers it for test access.
   *
   * @param {string} url - WebSocket endpoint URL.
   * @param {string | string[]} [protocols] - Optional subprotocol or subprotocol list.
   *
   * @example
   * const socket = new MockWebSocket('ws://localhost:3000/ipc');
   *
   * assert.equal(socket.url, 'ws://localhost:3000/ipc');
   * assert.equal(socket.readyState, MockWebSocket.CONNECTING);
   */
  constructor(url, protocols) {
    super();

    this.url = url;
    this.protocols = protocols;

    MockWebSocket.instances.push(this);
  }

  /**
   * Registers a listener using the WebSocket-style method name.
   *
   * This mock delegates listener registration to `EventEmitter`.
   *
   * @param {string} event - Event name.
   * @param {(...args: any[]) => void} listener - Event listener.
   *
   * @example
   * ```js
   * const socket = new MockWebSocket('ws://localhost/ipc');
   *
   * socket.addEventListener('open', () => {
   *   console.log('opened');
   * });
   * ```
   */
  addEventListener(event, listener) {
    this.on(event, listener);
  }

  /**
   * Removes a previously registered listener.
   *
   * @param {string} event - Event name.
   * @param {(...args: any[]) => void} listener - Event listener to remove.
   *
   * @example
   * ```js
   * const onOpen = () => console.log('opened');
   *
   * socket.addEventListener('open', onOpen);
   * socket.removeEventListener('open', onOpen);
   * ```
   */
  removeEventListener(event, listener) {
    this.off(event, listener);
  }

  /**
   * Records an outgoing message when the connection is open.
   *
   * @param {MockWebSocketData} data - Data to send.
   * @throws {Error} If the connection is not open.
   *
   * @example
   * const socket = new MockWebSocket('ws://localhost:3000/ipc');
   *
   * socket.open();
   * socket.send('hello');
   *
   * assert.deepEqual(socket.sent, ['hello']);
   */
  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    this.sent.push(data);
  }

  /**
   * Simulates closing the connection.
   *
   * Sets the connection state to `CLOSED` and emits the `close` event.
   *
   * @example
   * ```js
   * socket.close();
   *
   * assert.equal(socket.readyState, MockWebSocket.CLOSED);
   * assert.equal(socket.closed, true);
   * ```
   */
  close() {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }

  /**
   * Simulates a successful connection opening.
   *
   * Sets the connection state to `OPEN` and emits the `open` event.
   *
   * @example
   * ```js
   * socket.open();
   *
   * assert.equal(socket.readyState, MockWebSocket.OPEN);
   * ```
   */
  open() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open');
  }

  /**
   * Simulates a WebSocket error.
   *
   * @param {Error} [error] - Error to emit.
   *
   * @example
   * ```js
   * socket.on('error', error => console.error(error));
   *
   * socket.error(new Error('Connection refused'));
   * ```
   */
  error(error = new Error('Mock WebSocket error')) {
    this.emit('error', error);
  }

  /**
   * Simulates receiving a message from the remote peer.
   *
   * Emits a `message` event with a payload containing the received data.
   *
   * @param {string | ArrayBuffer} data - Incoming message data.
   *
   * @example
   * ```js
   * socket.on('message', event => console.log(event.data));
   *
   * socket.message('{"type":"event"}');
   * ```
   */
  message(data) {
    this.emit('message', { data });
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MockWebSocket;

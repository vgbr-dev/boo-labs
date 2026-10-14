// @ts-check
/**
 * @file In-process duplex transport that mimics a WebSocket pair.
 *
 * @description Both ends share the same EventEmitter bus. Used by tests to
 * exercise the IPC client without a real WebSocket implementation.
 *
 * @module DuplexTransport
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODEJS MODULES
import { EventEmitter } from 'node:events';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Listener accepted by `addEventListener` and `removeEventListener`.
 *
 * @typedef {(...args: any[]) => void} DuplexTransportListener
 */
// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ FUNCTIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * In-process duplex transport that mimics a WebSocket endpoint.
 *
 * @classdesc Provides a lightweight event-based transport for testing IPC
 * communication without a real WebSocket implementation.
 */
class DuplexTransport extends EventEmitter {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  /** @type {number} */
  readyState = DuplexTransport.CONNECTING;

  /** @type {string} */
  binaryType = 'arraybuffer';

  /** @type {DuplexTransport | null} */
  peer = null;

  /** @type {string} */
  url = '';

  /**
   * Registers a listener for a transport event.
   *
   * @param {string} event - Name of the event to listen for.
   * @param {DuplexTransportListener} listener - Callback invoked when the event occurs.
   *
   * @example
   * ```js
   * transport.addEventListener('open', () => {
   *   console.log('Transport opened');
   * });
   * ```
   */
  addEventListener(event, listener) {
    this.on(event, listener);
  }

  /**
   * Removes a previously registered transport event listener.
   *
   * @param {string} event - Name of the event associated with the listener.
   * @param {DuplexTransportListener} listener - Previously registered callback.
   *
   * @example
   * ```js
   * const onOpen = () => console.log('Transport opened');
   *
   * transport.addEventListener('open', onOpen);
   * transport.removeEventListener('open', onOpen);
   * ```
   */
  removeEventListener(event, listener) {
    this.off(event, listener);
  }

  /**
   * Sends data to the peer as an asynchronous `message` event.
   *
   * @param {string | ArrayBuffer | ArrayBufferView} data - Data to deliver to the peer.
   * @throws {Error} If the transport is not open.
   *
   * @example
   * ```js
   * transport.open();
   * transport.send(JSON.stringify({ type: 'request' }));
   * ```
   */
  send(data) {
    if (this.readyState !== DuplexTransport.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Deliver to the peer as a message event
    queueMicrotask(() => {
      this.peer?.emit('message', { data });
    });
  }

  /**
   * Closes this transport and its peer, emitting a `close` event for each
   * endpoint that transitions to the closed state.
   *
   * Calling this method on an already closed transport has no effect.
   *
   * @example
   * ```js
   * transport.close();
   * ```
   *
   * @example
   * ```js
   * transport.addEventListener('close', () => {
   *   console.log('Transport closed');
   * });
   * transport.close();
   * ```
   */
  close() {
    if (this.readyState !== DuplexTransport.CLOSED) {
      this.readyState = DuplexTransport.CLOSED;
      this.emit('close');

      if (this.peer && this.peer.readyState !== DuplexTransport.CLOSED) {
        this.peer.readyState = DuplexTransport.CLOSED;
        this.peer.emit('close');
      }
    }
  }

  /**
   * Marks this transport as open and emits an `open` event.
   *
   * @example
   * ```js
   * transport.addEventListener('open', () => {
   *   console.log('Transport opened');
   * });
   *
   * transport.open();
   * ```
   */
  open() {
    this.readyState = DuplexTransport.OPEN;
    this.emit('open');
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default DuplexTransport;

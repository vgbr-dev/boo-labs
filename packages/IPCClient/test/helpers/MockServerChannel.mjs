// @ts-check
/**
 * @file Minimal server-side channel for integration tests.
 *
 * @description Uses the real `IPCProtocol` to mirror the behavior of
 * `IPCServerChannel` + `IPCMain`. Only the behavior required by the tests is
 * implemented.
 *
 * @module MockServerChannel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import DuplexTransport from './DuplexTransport.mjs';
import IPCProtocol from '../../source/core/IPCClient/IPCProtocol.mjs';
import IPCError from '#shared/errors/IPCError';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Handler registered on the mock server.
 *
 * @typedef {(data: unknown) => unknown | Promise<unknown>} MockInvokeHandler
 */

/**
 * Listener registered on the mock server.
 *
 * @typedef {(data: unknown) => void} MockEventListener
 */

/**
 * Represents a `message` event emitted by a `DuplexTransport`.
 *
 * @typedef  {object}             DuplexMessageEvent
 * @property {string|ArrayBuffer} data               - Encoded IPC message payload.
 */

// ━━ MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Minimal server-side channel for integration tests.
 *
 * @classdesc Uses the real `IPCProtocol` and provides the subset of
 * `IPCServerChannel` + `IPCMain` behavior required by the tests.
 */
class MockServerChannel {
  /** @type {DuplexTransport} */
  #connection;

  /** @type {IPCProtocol} */
  #protocol = new IPCProtocol();

  /** @type {Map<string, MockInvokeHandler>} */
  #handlers = new Map();

  /** @type {Map<string, Set<MockEventListener>>} */
  #listeners = new Map();

  /** @type {number} */
  #nextId = 0;

  /** @type {boolean} */
  #closed = false;

  /**
   * Creates a mock server channel bound to a transport connection.
   *
   * @param {DuplexTransport} connection - Transport endpoint connected to the client.
   *
   * @example
   * ```js
   * const server = new MockServerChannel(serverTransport);
   * ```
   */
  constructor(connection) {
    this.#connection = connection;

    connection.on('message', event => {
      const data =
        typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      void this.#onMessage(data);
    });

    connection.on('close', () => {
      this.#closed = true;
    });
  }

  /**
   * Registers a handler for client invocation requests on the specified channel.
   *
   * @param {string} channel - Channel name used to identify the invocation.
   * @param {MockInvokeHandler} handler - Function that processes the request data.
   *
   * @example
   * ```js
   * server.handle('users:get', data => ({ id: data }));
   *
   * ```
   * @example
   * ```js
   * server.handle('users:create', async data => {
   *   return { created: true, data };
   * });
   * ```
   */
  handle(channel, handler) {
    this.#handlers.set(channel, handler);
  }

  /**
   * Registers a listener for events received from the client.
   *
   * @param {string} channel - Channel name to listen on.
   * @param {MockEventListener} listener - Callback invoked with the event data.
   *
   * @example
   * ```js
   * server.on('users:updated', data => {
   *   console.log('User updated:', data);
   * });
   * ```
   */
  on(channel, listener) {
    if (!this.#listeners.has(channel)) {
      this.#listeners.set(channel, new Set());
    }

    this.#listeners.get(channel)?.add(listener);
  }

  /**
   * Sends an event from the mock server to the client.
   *
   * Does nothing if the transport connection has closed.
   *
   * @param {string} channel - Channel name identifying the event.
   * @param {unknown} [data] - Optional event payload.
   *
   * @example
   * ```js
   * server.emit('users:updated', { id: 42 });
   * ```
   *
   * @example
   * ```js
   * server.emit('users:refreshed');
   * ```
   */
  emit(channel, data) {
    if (!this.#closed) {
      const encoded = this.#protocol.encodeEvent(channel, data);
      this.#connection.send(encoded);
    }
  }

  /**
   * Invokes a handler registered on the client and waits for its response.
   *
   * The promise resolves with the returned result or rejects with an `IPCError`
   * when the client responds with an error.
   *
   * @param {string} channel - Channel name identifying the client handler.
   * @param {unknown} [data] - Optional invocation payload.
   * @returns {Promise<unknown>} Promise that settles with the handler result or an IPC error.
   *
   * @example
   * ```js
   * const result = await server.invoke('users:get', { id: 42 });
   * ```
   *
   * @example
   * ```js
   * try {
   *   await server.invoke('users:delete', { id: 42 });
   * } catch (error) {
   *   if (error instanceof IPCError) {
   *     console.error(error.message);
   *   }
   * }
   * ```
   */
  invoke(channel, data) {
    return new Promise((resolve, reject) => {
      const id = `server-${(this.#nextId += 1)}`;
      const encoded = this.#protocol.encodeInvoke(channel, id, data);

      /**
       * Handles a response message from the client.
       *
       * @param {DuplexMessageEvent} event - Message event emitted by the transport.
       */
      const onMessage = event => {
        try {
          const text =
            typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const message = this.#protocol.decodeMessage(text);

          if (message.type === 'response' && message.id === id) {
            this.#connection.off('message', onMessage);

            if ('error' in message) {
              const err = new IPCError(message.error.code);
              err.message = message.error.message;
              reject(err);
            } else {
              resolve(message.result);
            }
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      this.#connection.on('message', onMessage);
      this.#connection.send(encoded);
    });
  }

  /**
   * Processes an incoming protocol message.
   *
   * @param {string} text - Encoded protocol message received from the client.
   * @returns {Promise<void>} Promise that settles after message processing completes.
   */
  async #onMessage(text) {
    if (!this.#closed) {
      try {
        const message = this.#protocol.decodeMessage(text);

        if (message.type === 'invoke') {
          const handler = this.#handlers.get(message.channel);

          if (handler) {
            try {
              const result = await handler(message.data);
              this.#connection.send(this.#protocol.success(message.id, result));
            } catch (error) {
              this.#connection.send(this.#protocol.error(message.id, error));
            }
          } else {
            this.#connection.send(
              this.#protocol.error(message.id, {
                code: 'IPC_CHANNEL_NOT_FOUND',
                message: `No handler registered for channel "${message.channel}"`,
              }),
            );
          }
        } else if (message.type === 'event') {
          const set = this.#listeners.get(message.channel);

          if (set) {
            for (const listener of set) {
              try {
                listener(message.data);
              } catch {
                // Isolate listener failures.
              }
            }
          }
        }
      } catch {
        // Ignore malformed messages.
      }
    }
  }
}

// ━━ EXPORT MODULE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default MockServerChannel;

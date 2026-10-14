// @ts-check
/**
 * @file Contains the unit tests for WebSocketAdapter.
 *
 * @module test/unit/core/IPCMain/WebSocketAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import WebSocketAdapter from '../../../../source/core/IPCMain/WebSocketAdapter.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a permitted transport identity.
 *
 * @typedef {import('#adapters/TransportAdapter').TransportIdentity} TransportIdentity
 */

/**
 * Represents a transport adapter capable of managing a permitted transport.
 *
 * @typedef {import('#adapters/TransportAdapter').default<TransportIdentity>} TransportAdapter
 */

/**
 * Represents an established WebSocket connection contract.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketConnection} WebSocketConnection
 */

/**
 * Transport-level request used to accept or reject a WebSocket handshake.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketOpenRequest} WebSocketOpenRequest
 */

/**
 * Represents the state captured by the fake transport.
 *
 * @typedef  {object}                                             CapturedTransport
 * @property {((openRequest: WebSocketOpenRequest) => void)|null} onWebSocketHandler - Handler registered via `onWebSocket`.
 */

/**
 * Represents the result returned by the makeTransport helper.
 *
 * @typedef  {object}            MakeTransportResult
 * @property {TransportAdapter}  transport           - Fake transport adapter.
 * @property {CapturedTransport} captured            - Captured transport state.
 */

/**
 * Represents a single rejection captured by the fake open request.
 *
 * @typedef  {object} RejectionRecord
 * @property {number} code            - HTTP-like status code.
 * @property {string} message         - Rejection message.
 */

/**
 * Represents the state captured by the fake open request.
 *
 * @typedef  {object}                CapturedOpenRequest
 * @property {WebSocketConnection[]} accepted            - Connections accepted.
 * @property {RejectionRecord[]}     rejected            - Rejections recorded.
 */

/**
 * Options accepted by the makeOpenRequest helper.
 *
 * @typedef  {object}              MakeOpenRequestOptions
 * @property {string}              [url]                  - Upgrade URL (default: `'/ipc'`).
 * @property {WebSocketConnection} [connection]           - Connection returned by `accept()`.
 * @property {boolean}             [acceptRejects]        - When `true`, `accept()` rejects.
 */

/**
 * Represents the result returned by the makeOpenRequest helper.
 *
 * @typedef  {object}               MakeOpenRequestResult
 * @property {WebSocketOpenRequest} openRequest           - Fake upgrade request.
 * @property {CapturedOpenRequest}  captured              - Captured accept/reject calls.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Waits for pending microtasks to flush.
 *
 * @returns {Promise<void>} Resolves after the microtask queue is drained.
 */
function flush() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates a fake transport adapter that records the onWebSocket handler.
 *
 * @returns {MakeTransportResult} The fake transport and its captured state.
 */
function makeTransport() {
  /** @type {CapturedTransport} */
  const captured = { onWebSocketHandler: null };

  const transport = /** @type {TransportAdapter} */ ({
    /**
     * Registers a handler for WebSocket upgrade requests.
     *
     * @param {(openRequest: WebSocketOpenRequest) => void} handler - Handler invoked on each upgrade.
     */
    onWebSocket(handler) {
      captured.onWebSocketHandler = handler;
    },
  });

  return { transport, captured };
}

/**
 * Creates a fake WebSocketOpenRequest.
 *
 * @param {MakeOpenRequestOptions} [options] - Options controlling the fake request.
 * @returns {MakeOpenRequestResult} The fake upgrade request and its captured state.
 */
function makeOpenRequest({
  url = '/ipc',
  connection = { readyState: 1, send() {}, on() {}, close() {} },
  acceptRejects = false,
} = {}) {
  /** @type {CapturedOpenRequest} */
  const captured = {
    accepted: [],
    rejected: [],
  };

  /** @type {WebSocketOpenRequest} */
  const openRequest = {
    url,
    headers: {},

    /**
     * Accepts the upgrade and resolves with the connection.
     *
     * @returns {Promise<WebSocketConnection>} The established connection.
     */
    accept() {
      if (acceptRejects) {
        return Promise.reject(new Error('accept failed'));
      }

      captured.accepted.push(connection);
      return Promise.resolve(connection);
    },

    /**
     * Rejects the upgrade with a status code and message.
     *
     * @param {number} [code] - HTTP-like status code.
     * @param {string} [message] - Rejection message.
     */
    reject(code = 500, message = 'Upgrade rejected') {
      captured.rejected.push({ code, message });
    },
  };

  return { openRequest, captured };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('WebSocketAdapter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // onConnection()
  // ───────────────────────────────────────────────────────────────────────────
  test('onConnection()', async sub => {
    await sub.test('should subscribe to the transport once', () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      adapter.onConnection(() => {});

      assert.strictEqual(typeof captured.onWebSocketHandler, 'function');
    });

    await sub.test('should not re-subscribe on multiple onConnection calls', () => {
      const { transport } = makeTransport();

      /** @type {number} */
      let subscribeCount = 0;

      const originalOnWebSocket = transport.onWebSocket.bind(transport);

      /**
       * Wraps the transport subscription to count calls.
       *
       * @param {(openRequest: WebSocketOpenRequest) => void} handler - Handler to register.
       */
      transport.onWebSocket = handler => {
        subscribeCount += 1;
        originalOnWebSocket(handler);
      };

      const adapter = new WebSocketAdapter(transport);
      adapter.onConnection(() => {});
      adapter.onConnection(() => {});

      assert.strictEqual(subscribeCount, 1);
    });

    await sub.test('should replace the listener when called again', async () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      /** @type {WebSocketConnection[]} */
      const first = [];

      /** @type {WebSocketConnection[]} */
      const second = [];

      adapter.onConnection(c => first.push(c));
      adapter.onConnection(c => second.push(c));

      const { openRequest } = makeOpenRequest();

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(first.length, 0);
      assert.strictEqual(second.length, 1);
    });

    await sub.test('should reject non-function listeners', () => {
      const { transport } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      assert.throws(() => adapter.onConnection(/** @type {any} */ (42)), {
        name: 'TypeError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Accept and reject
  // ───────────────────────────────────────────────────────────────────────────
  test('Accept and reject', async sub => {
    await sub.test('should accept and forward a connection when no filter is set', async () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      /** @type {WebSocketConnection[]} */
      const received = [];

      adapter.onConnection(c => received.push(c));

      const connection = { readyState: 1, send() {}, on() {}, close() {} };
      const { openRequest, captured: openCaptured } = makeOpenRequest({ connection });

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(openCaptured.accepted.length, 1);
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0], connection);
    });

    await sub.test('should reject with 404 when the accept filter returns false', () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport, {
        accept: () => false,
      });

      adapter.onConnection(() => {});

      const { openRequest, captured: openCaptured } = makeOpenRequest();

      captured.onWebSocketHandler?.(openRequest);

      assert.strictEqual(openCaptured.rejected.length, 1);
      assert.strictEqual(openCaptured.rejected[0].code, 404);
    });

    await sub.test('should reject with 503 when no listener is registered', () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      adapter.onConnection(() => {});
      adapter.close();

      const { openRequest, captured: openCaptured } = makeOpenRequest();

      captured.onWebSocketHandler?.(openRequest);

      assert.strictEqual(openCaptured.rejected.length, 1);
      assert.strictEqual(openCaptured.rejected[0].code, 503);
    });

    await sub.test('should reject with 500 when accept rejects', async () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      adapter.onConnection(() => {});

      const { openRequest, captured: openCaptured } = makeOpenRequest({
        acceptRejects: true,
      });

      captured.onWebSocketHandler?.(openRequest);

      await flush();
      await flush();

      assert.strictEqual(openCaptured.rejected.length, 1);
      assert.strictEqual(openCaptured.rejected[0].code, 500);
    });

    await sub.test('should close the connection when the listener has been cleared', async () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      /** @type {((connection: WebSocketConnection) => void)|undefined} */
      let resolveAccept;

      /** @type {boolean} */
      let closed = false;

      const connection = {
        readyState: 1,
        send() {},
        on() {},
        close() {
          closed = true;
        },
      };

      adapter.onConnection(() => {});

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: '/ipc',
        headers: {},
        accept: () =>
          new Promise(resolve => {
            resolveAccept = resolve;
          }),
        reject() {},
      };

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      adapter.close();
      resolveAccept?.(connection);

      await flush();

      assert.strictEqual(closed, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // close()
  // ───────────────────────────────────────────────────────────────────────────
  test('close()', async sub => {
    await sub.test('should prevent further connection delivery', async () => {
      const { transport, captured } = makeTransport();
      const adapter = new WebSocketAdapter(transport);

      /** @type {WebSocketConnection[]} */
      const received = [];

      adapter.onConnection(c => received.push(c));

      adapter.close();

      const { openRequest } = makeOpenRequest();

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(received.length, 0);
    });
  });
});

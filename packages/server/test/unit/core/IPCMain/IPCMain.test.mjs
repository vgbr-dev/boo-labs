// @ts-check
/**
 * @file Contains the unit tests for IPCMain.
 *
 * @module test/unit/core/IPCMain/IPCMain
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCMain from '../../../../source/core/IPCMain/IPCMain.mjs';
import { createFakeWebSocketConnection } from '../../../helpers/createFakeWebSocketConnection.mjs';

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
 * Represents the result returned by the makeTransport helper.
 *
 * @typedef  {object}            MakeTransportResult
 * @property {TransportAdapter}  transport           - Fake transport adapter.
 * @property {CapturedTransport} captured            - Captured onWebSocket handler.
 */

/**
 * Represents the state captured by the fake transport.
 *
 * @typedef  {object}                                             CapturedTransport
 * @property {((openRequest: WebSocketOpenRequest) => void)|null} onWebSocketHandler - Handler registered via `onWebSocket`.
 */

/**
 * Options accepted by the connect helper.
 *
 * @typedef  {object} ConnectOptions
 * @property {string} [url]          - WebSocket upgrade URL (default: `'/ipc'`).
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Waits for pending microtasks to flush.
 *
 * @returns {Promise<void>}
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
  const captured = {
    onWebSocketHandler: null,
  };

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
 * Simulates a WebSocket connection through the transport.
 *
 * @param {CapturedTransport} captured - Captured transport state.
 * @param {ConnectOptions} [options] - Options controlling the connection.
 * @returns {Promise<ReturnType<typeof createFakeWebSocketConnection>>} The established fake connection.
 */
async function connect(captured, { url = '/ipc' } = {}) {
  const connection = createFakeWebSocketConnection();

  /** @type {WebSocketOpenRequest} */
  const openRequest = {
    url,
    headers: {},
    accept: async () => connection,
    reject: () => {},
  };

  captured.onWebSocketHandler?.(openRequest);

  await flush();

  return connection;
}

/**
 * Builds a JSON-encoded IPC invoke request.
 *
 * @param {string} channel - IPC channel name.
 * @param {string} id - Invocation identifier.
 * @param {unknown} [data] - Optional request payload.
 * @returns {string} JSON-encoded invoke message.
 */
function invokeMessage(channel, id, data) {
  return JSON.stringify({ type: 'invoke', channel, id, data });
}

/**
 * Builds a JSON-encoded IPC event message.
 *
 * @param {string} channel - IPC channel name.
 * @param {unknown} [data] - Optional event payload.
 * @returns {string} JSON-encoded event message.
 */
function eventMessage(channel, data) {
  return JSON.stringify({ type: 'event', channel, data });
}

/**
 * Instantiates IPCMain so it subscribes to the transport, without
 * exposing the instance to the test body.
 *
 * @param {TransportAdapter} transport - Fake transport adapter.
 * @returns {void}
 */
function bootstrapIPCMain(transport) {
  new IPCMain(transport);
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPCMain', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Constructor
  // ───────────────────────────────────────────────────────────────────────────
  test('Constructor', async sub => {
    await sub.test('should subscribe to the transport', () => {
      const { transport, captured } = makeTransport();

      new IPCMain(transport);

      assert.strictEqual(typeof captured.onWebSocketHandler, 'function');
    });

    await sub.test('should accept a custom path', async () => {
      const { transport, captured } = makeTransport();

      new IPCMain(transport, { path: '/custom-ipc' });

      const connection = createFakeWebSocketConnection();

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: '/custom-ipc',
        headers: {},
        accept: async () => connection,
        reject: () => {},
      };

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(connection._closed, false);
    });

    await sub.test('should reject connections that do not match the path', async () => {
      const { transport, captured } = makeTransport();

      new IPCMain(transport, { path: '/ipc' });

      /** @type {{ code?: number, message?: string }[]} */
      const rejected = [];

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: '/other',
        headers: {},
        accept: async () => createFakeWebSocketConnection(),
        reject: (code, message) => {
          rejected.push({ code, message });
        },
      };

      captured.onWebSocketHandler?.(openRequest);

      assert.strictEqual(rejected[0]?.code, 404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // handle()
  // ───────────────────────────────────────────────────────────────────────────
  test('handle()', async sub => {
    await sub.test('should register a handler and return this', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      const result = ipc.handle('users:get', () => {});

      assert.strictEqual(result, ipc);
    });

    await sub.test('should reject a non-string channel', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.handle(/** @type {any} */ (42), () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject an empty channel', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.handle('', () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject a non-function handler', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.handle('users:get', /** @type {any} */ ('nope')), {
        name: 'IPCError',
        code: 'IPC_INVALID_HANDLER',
      });
    });

    await sub.test('should replace an existing handler', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.handle('users:get', () => 'first');
      ipc.handle('users:get', () => 'second');

      const connection = await connect(captured);

      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.result, 'second');
    });

    await sub.test('should reject when IPCMain is closed', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.close();

      assert.throws(() => ipc.handle('users:get', () => {}), {
        name: 'IPCError',
        code: 'IPC_CLOSED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // removeHandler()
  // ───────────────────────────────────────────────────────────────────────────
  test('removeHandler()', async sub => {
    await sub.test('should return this', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.strictEqual(ipc.removeHandler('users:get'), ipc);
    });

    await sub.test('should make the handler unavailable', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.handle('users:get', () => ({ ok: true }));
      ipc.removeHandler('users:get');

      const connection = await connect(captured);

      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.error.code, 'IPC_CHANNEL_NOT_FOUND');
    });

    await sub.test('should be a no-op when the channel does not exist', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.doesNotThrow(() => ipc.removeHandler('unknown'));
    });

    await sub.test('should reject invalid channels', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.removeHandler(''), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject when IPCMain is closed', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.close();

      assert.throws(() => ipc.removeHandler('users:get'), {
        name: 'IPCError',
        code: 'IPC_CLOSED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // on() and off()
  // ───────────────────────────────────────────────────────────────────────────
  test('on() and off()', async sub => {
    await sub.test('on() should return this', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.strictEqual(
        ipc.on('notifications', () => {}),
        ipc,
      );
    });

    await sub.test('off() should return this', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.strictEqual(
        ipc.off('notifications', () => {}),
        ipc,
      );
    });

    await sub.test('should register and deliver events', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      /** @type {unknown[]} */
      const received = [];

      ipc.on('notifications', data => received.push(data));

      const connection = await connect(captured);
      connection._emit('message', eventMessage('notifications', { msg: 'hi' }));

      await flush();

      assert.deepStrictEqual(received, [{ msg: 'hi' }]);
    });

    await sub.test('should support multiple listeners for the same channel', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      /** @type {unknown[]} */
      const a = [];
      /** @type {unknown[]} */
      const b = [];

      ipc.on('notifications', data => a.push(data));
      ipc.on('notifications', data => b.push(data));

      const connection = await connect(captured);
      connection._emit('message', eventMessage('notifications', 1));

      await flush();

      assert.deepStrictEqual(a, [1]);
      assert.deepStrictEqual(b, [1]);
    });

    await sub.test('should isolate listener failures', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      /** @type {unknown[]} */
      const received = [];

      ipc.on('notifications', () => {
        throw new Error('boom');
      });
      ipc.on('notifications', data => received.push(data));

      const connection = await connect(captured);
      connection._emit('message', eventMessage('notifications', 1));

      await flush();

      assert.deepStrictEqual(received, [1]);
    });

    await sub.test('off() should remove a listener', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      /** @type {unknown[]} */
      const received = [];
      /**
       * Listener that records the payload it receives.
       *
       * @param {unknown} data - Payload delivered by the IPC event.
       * @returns {number} The new length of the `received` array.
       */
      const listener = data => received.push(data);

      ipc.on('notifications', listener);
      ipc.off('notifications', listener);

      const connection = await connect(captured);
      connection._emit('message', eventMessage('notifications', 1));

      await flush();

      assert.deepStrictEqual(received, []);
    });

    await sub.test('should reject invalid channels', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.on('', () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });

      assert.throws(() => ipc.off('', () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject non-function listeners', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      assert.throws(() => ipc.on('notifications', /** @type {any} */ ('nope')), {
        name: 'IPCError',
        code: 'IPC_INVALID_LISTENER',
      });
    });

    await sub.test('should reject when IPCMain is closed', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.close();

      assert.throws(() => ipc.on('notifications', () => {}), {
        name: 'IPCError',
        code: 'IPC_CLOSED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invoke dispatch
  // ───────────────────────────────────────────────────────────────────────────
  test('Invoke dispatch', async sub => {
    await sub.test('should invoke the registered handler', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      /** @type {unknown} */
      let receivedData = null;

      ipc.handle('users:get', data => {
        receivedData = data;
        return { id: '42' };
      });

      const connection = await connect(captured);
      connection._emit('message', invokeMessage('users:get', '1', { id: '42' }));

      await flush();

      assert.deepStrictEqual(receivedData, { id: '42' });

      const response = JSON.parse(connection._sent[0]);

      assert.deepStrictEqual(response.result, { id: '42' });
    });

    await sub.test('should send IPC_CHANNEL_NOT_FOUND when no handler is registered', async () => {
      const { transport, captured } = makeTransport();
      bootstrapIPCMain(transport);

      const connection = await connect(captured);
      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.id, '1');
      assert.strictEqual(response.error.code, 'IPC_CHANNEL_NOT_FOUND');
      assert.match(response.error.message, /users:get/);
    });

    await sub.test('should forward handler errors', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.handle('users:get', () => {
        throw new Error('handler failed');
      });

      const connection = await connect(captured);
      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.error.code, 'IPC_HANDLER_ERROR');
      assert.strictEqual(response.error.message, 'handler failed');
    });

    await sub.test('should support async handlers', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.handle('users:get', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { id: '42' };
      });

      const connection = await connect(captured);
      connection._emit('message', invokeMessage('users:get', '1'));

      await new Promise(resolve => setTimeout(resolve, 20));

      const response = JSON.parse(connection._sent[0]);

      assert.deepStrictEqual(response.result, { id: '42' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Connection lifecycle', async sub => {
    await sub.test('should track active connections', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const connection = await connect(captured);

      ipc.handle('users:get', () => ({ ok: true }));

      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      assert.strictEqual(connection._sent.length, 1);
    });

    await sub.test('should remove a connection when it closes', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const connection = await connect(captured);

      ipc.handle('users:get', () => ({ ok: true }));

      connection._emit('close');
      connection._emit('message', invokeMessage('users:get', '1'));

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });

    await sub.test(
      'should reject the WebSocket handshake when IPCMain is already closed',
      async () => {
        const { transport, captured } = makeTransport();
        const ipc = new IPCMain(transport);

        ipc.close();

        /** @type {boolean} */
        let accepted = false;

        /** @type {{ code?: number, message?: string }[]} */
        const rejected = [];

        /** @type {WebSocketOpenRequest} */
        const openRequest = {
          url: '/ipc',
          headers: {},
          accept: async () => {
            accepted = true;
            return createFakeWebSocketConnection();
          },
          reject: (code, message) => {
            rejected.push({ code, message });
          },
        };

        captured.onWebSocketHandler?.(openRequest);

        await flush();

        assert.strictEqual(accepted, false);
        assert.ok(rejected);
        assert.strictEqual(rejected[0].code, 503);
      },
    );

    await sub.test('should close an accepted connection when IPCMain is closed', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const connection = await connect(captured);

      ipc.close();

      assert.strictEqual(connection._closed, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // close()
  // ───────────────────────────────────────────────────────────────────────────
  test('close()', async sub => {
    await sub.test('should close all active connections', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const a = await connect(captured);
      const b = await connect(captured);

      ipc.close();

      assert.strictEqual(a._closed, true);
      assert.strictEqual(b._closed, true);
    });

    await sub.test('should be idempotent', () => {
      const { transport } = makeTransport();
      const ipc = new IPCMain(transport);

      ipc.close();

      assert.doesNotThrow(() => ipc.close());
    });

    await sub.test('should ignore connection close failures', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const connection = await connect(captured);

      connection.close = () => {
        throw new Error('close failed');
      };

      assert.doesNotThrow(() => ipc.close());
    });

    await sub.test('should ignore errors from listener failures', async () => {
      const { transport, captured } = makeTransport();
      const ipc = new IPCMain(transport);

      const connection = await connect(captured);

      ipc.close();

      // After closing, emitting must not throw.
      assert.doesNotThrow(() => connection._emit('message', invokeMessage('x', '1')));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Path matching
  // ───────────────────────────────────────────────────────────────────────────
  test('Path matching', async sub => {
    await sub.test('should accept a URL with a query string', async () => {
      const { transport, captured } = makeTransport();
      new IPCMain(transport, { path: '/ipc' });

      const connection = createFakeWebSocketConnection();

      /** @type {boolean} */
      let accepted = false;

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: '/ipc?version=1',
        headers: {},
        accept: async () => {
          accepted = true;
          return connection;
        },
        reject: () => {},
      };

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(accepted, true);
    });

    await sub.test('should accept an absolute URL', async () => {
      const { transport, captured } = makeTransport();
      new IPCMain(transport, { path: '/ipc' });

      const connection = createFakeWebSocketConnection();

      /** @type {boolean} */
      let accepted = false;

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: 'ws://localhost/ipc',
        headers: {},
        accept: async () => {
          accepted = true;
          return connection;
        },
        reject: () => {},
      };

      captured.onWebSocketHandler?.(openRequest);

      await flush();

      assert.strictEqual(accepted, true);
    });

    await sub.test('should reject a URL with a different path', async () => {
      const { transport, captured } = makeTransport();
      new IPCMain(transport, { path: '/ipc' });

      /** @type {{ code?: number, message?: string }[]} */
      const rejected = [];

      /** @type {WebSocketOpenRequest} */
      const openRequest = {
        url: '/other',
        headers: {},
        accept: async () => createFakeWebSocketConnection(),
        reject: (code, message) => {
          rejected.push({ code, message });
        },
      };

      captured.onWebSocketHandler?.(openRequest);

      assert.strictEqual(rejected[0]?.code, 404);
    });
  });
});

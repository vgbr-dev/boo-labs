// @ts-check
/**
 * @file Contains the unit tests for IPCClient.
 *
 * @module test/unit/IPCClient/IPCClient
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCClient from '../../../source/core/IPCClient/index.mjs';
import IPCError from '#shared/errors/IPCError';
import MockWebSocket from '../../helpers/MockWebSocket.mjs';

// ━━ HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Returns the most recently created `MockWebSocket` instance.
 *
 * @returns {MockWebSocket} The latest created mock WebSocket.
 * @throws {Error} If no `MockWebSocket` has been created yet.
 */
function latestSocket() {
  const socket = MockWebSocket.instances.at(-1);

  if (!socket) {
    throw new Error('No MockWebSocket instance created');
  }

  return socket;
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPCClient', () => {
  /** @type {typeof globalThis.WebSocket | undefined} */
  let originalWebSocket;
  /** @type {typeof globalThis.window | undefined} */
  let originalWindow;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
    originalWindow = globalThis.window;
    // @ts-expect-error — test mock
    globalThis.WebSocket = MockWebSocket;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    // @ts-expect-error — restore original
    globalThis.WebSocket = originalWebSocket;
    // @ts-expect-error — restore original
    globalThis.window = originalWindow;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Constructor / URL validation
  // ───────────────────────────────────────────────────────────────────────────
  test('Constructor / URL validation', async sub => {
    await sub.test('should accept a valid ws URL', () => {
      assert.doesNotThrow(() => new IPCClient('ws://localhost:3000/ipc'));
    });

    await sub.test('should accept a valid wss URL', () => {
      assert.doesNotThrow(() => new IPCClient('wss://api.example.com/ipc'));
    });

    await sub.test('should reject non-string URL', () => {
      assert.throws(() => new IPCClient(/** @type {any} */ (123)), {
        name: 'TypeError',
        message: /IPC URL must be a string/,
      });
    });

    await sub.test('should reject empty URL', () => {
      assert.throws(() => new IPCClient(''), {
        name: 'RangeError',
        message: /non-empty string/,
      });
    });

    await sub.test('should reject non-ws protocols', () => {
      assert.throws(() => new IPCClient('https://example.com/ipc'), {
        name: 'TypeError',
        message: /ws: or wss:/,
      });
    });

    await sub.test('should reject URLs with credentials', () => {
      assert.throws(() => new IPCClient('ws://user:pass@localhost/ipc'), {
        name: 'TypeError',
        message: /must not contain credentials/,
      });
    });

    await sub.test('should reject URLs with fragment', () => {
      assert.throws(() => new IPCClient('ws://localhost/ipc#section'), {
        name: 'TypeError',
        message: /must not contain a fragment/,
      });
    });

    await sub.test('should reject unparseable URLs', () => {
      assert.throws(() => new IPCClient('not-a-url'), {
        name: 'TypeError',
        message: /could not be parsed/,
      });
    });

    await sub.test('should resolve default URL from window.location (http)', () => {
      globalThis.window = {
        // @ts-expect-error — partial Location mock
        location: {
          protocol: 'http:',
          host: 'localhost:3000',
        },
      };

      const client = new IPCClient();
      assert.ok(client);
    });

    await sub.test('should resolve default URL from window.location (https → wss)', () => {
      globalThis.window = {
        // @ts-expect-error — partial Location mock
        location: {
          protocol: 'https:',
          host: 'api.example.com',
        },
      };

      const client = new IPCClient();
      assert.ok(client);
    });

    await sub.test('should throw when no URL and no window', () => {
      // @ts-expect-error — test mock
      globalThis.window = undefined;

      assert.throws(() => new IPCClient(), {
        name: 'ReferenceError',
        message: /browser location is unavailable/,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // connected
  // ───────────────────────────────────────────────────────────────────────────
  test('connected', async sub => {
    await sub.test('should be false before connect', () => {
      const client = new IPCClient('ws://localhost/ipc');
      assert.strictEqual(client.connected, false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // connect
  // ───────────────────────────────────────────────────────────────────────────
  test('connect', async sub => {
    await sub.test('should resolve when the WebSocket opens', async () => {
      const client = new IPCClient('ws://localhost/ipc');
      const socket = latestSocket();

      const connectPromise = client.connect();
      socket.open();

      await connectPromise;
      assert.strictEqual(client.connected, true);
    });

    await sub.test('should reject when the WebSocket errors', async () => {
      const client = new IPCClient('ws://localhost/ipc');
      const socket = latestSocket();

      const connectPromise = client.connect();
      socket.error();

      await assert.rejects(connectPromise, error => {
        assert.ok(error instanceof IPCError);
        assert.strictEqual(error.code, 'IPC_CONNECTION_FAILED');
        return true;
      });

      assert.strictEqual(client.connected, false);
    });

    await sub.test('should share the same promise for concurrent connect calls', async () => {
      const client = new IPCClient('ws://localhost/ipc');
      const socket = latestSocket();

      const p1 = client.connect();
      const p2 = client.connect();

      socket.open();

      await Promise.all([p1, p2]);
      assert.strictEqual(client.connected, true);
    });

    await sub.test('should be a no-op when already connected', async () => {
      const client = new IPCClient('ws://localhost/ipc');
      const socket = latestSocket();

      const first = client.connect();
      socket.open();
      await first;

      await client.connect();
      assert.strictEqual(client.connected, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Methods require connection
  // ───────────────────────────────────────────────────────────────────────────
  test('Methods require connection', async sub => {
    const client = new IPCClient('ws://localhost/ipc');

    await sub.test('handle should throw when not connected', () => {
      assert.throws(() => client.handle('users:get', async () => ({})), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });

    await sub.test('removeHandler should throw when not connected', () => {
      assert.throws(() => client.removeHandler('users:get'), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });

    await sub.test('on should throw when not connected', () => {
      assert.throws(() => client.on('users:updated', () => {}), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });

    await sub.test('off should throw when not connected', () => {
      assert.throws(() => client.off('users:updated', () => {}), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });

    await sub.test('invoke should throw when not connected', () => {
      assert.throws(() => client.invoke('users:get'), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });

    await sub.test('send should throw when not connected', () => {
      assert.throws(() => client.send('notifications:ping'), {
        name: 'IPCError',
        code: 'IPC_NOT_CONNECTED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // close
  // ───────────────────────────────────────────────────────────────────────────
  test('close', async sub => {
    await sub.test('should close the connection and clear channel', async () => {
      const client = new IPCClient('ws://localhost/ipc');
      const socket = latestSocket();

      const connectPromise = client.connect();
      socket.open();
      await connectPromise;

      assert.strictEqual(client.connected, true);
      client.close();
      assert.strictEqual(client.connected, false);
    });

    await sub.test('should be safe to call when never connected', () => {
      const client = new IPCClient('ws://localhost/ipc');
      assert.doesNotThrow(() => client.close());
    });
  });
});

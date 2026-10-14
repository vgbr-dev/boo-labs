// @ts-check
/**
 * @file Contains the unit tests for WebSocketClient.
 *
 * @module test/unit/IPCClient/WebSocketClient
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import WebSocketClient from '../../../source/core/IPCClient/WebSocketClient.mjs';
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
suite('WebSocketClient', () => {
  /** @type {typeof globalThis.WebSocket | undefined} */
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
    // @ts-expect-error — test mock
    globalThis.WebSocket = MockWebSocket;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    // @ts-expect-error — restore original
    globalThis.WebSocket = originalWebSocket;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Constructor
  // ───────────────────────────────────────────────────────────────────────────
  test('Constructor', async sub => {
    await sub.test('should throw when WebSocket is not available', () => {
      // @ts-expect-error — test mock
      globalThis.WebSocket = undefined;

      assert.throws(() => new WebSocketClient('ws://localhost/ipc'), {
        name: 'ReferenceError',
        message: /WebSocket is not available/,
      });
    });

    await sub.test('should create a connection with the given URL', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();

      assert.ok(client);
      assert.strictEqual(socket.url, 'ws://localhost/ipc');
      assert.strictEqual(typeof client.readyState, 'number');
    });

    await sub.test('should accept protocols option', () => {
      const client = new WebSocketClient('ws://localhost/ipc', {
        protocols: ['ipc.v1'],
      });
      const socket = latestSocket();

      assert.ok(client);
      assert.deepStrictEqual(socket.protocols, ['ipc.v1']);
    });

    await sub.test('should set binaryType to arraybuffer when supported', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();

      assert.ok(client);
      assert.strictEqual(socket.binaryType, 'arraybuffer');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // readyState
  // ───────────────────────────────────────────────────────────────────────────
  test('readyState', async sub => {
    await sub.test('should expose the native readyState', () => {
      const client = new WebSocketClient('ws://localhost/ipc');

      assert.strictEqual(typeof client.readyState, 'number');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // on / off
  // ───────────────────────────────────────────────────────────────────────────
  test('on / off', async sub => {
    await sub.test('should reject non-function listeners', () => {
      const client = new WebSocketClient('ws://localhost/ipc');

      assert.throws(() => client.on('open', /** @type {any} */ ('not a function')), {
        name: 'TypeError',
        message: /listener must be a function/,
      });
    });

    await sub.test('should reject unsupported events', () => {
      const client = new WebSocketClient('ws://localhost/ipc');

      assert.throws(
        // @ts-expect-error — testing an unsupported event on purpose
        () => client.on('unknown', () => {}),
        {
          name: 'TypeError',
          message: /Unsupported event/,
        },
      );
    });

    await sub.test('should register and invoke open listener', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();
      let called = false;

      client.on('open', () => {
        called = true;
      });

      socket.open();

      assert.strictEqual(called, true);
    });

    await sub.test('should register and invoke message listener', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();
      /** @type {unknown} */
      let received = null;

      client.on('message', data => {
        received = data;
      });

      socket.open();
      socket.message('{"type":"event"}');

      assert.strictEqual(received, '{"type":"event"}');
    });

    await sub.test('should remove listener with off', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();
      let count = 0;

      const listener = () => {
        count += 1;
      };

      client.on('open', listener);
      client.off('open', listener);

      socket.open();

      assert.strictEqual(count, 0);
    });

    await sub.test('should isolate listener failures', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();
      let secondCalled = false;

      client.on('open', () => {
        throw new Error('listener failure');
      });

      client.on('open', () => {
        secondCalled = true;
      });

      socket.open();

      assert.strictEqual(secondCalled, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // send
  // ───────────────────────────────────────────────────────────────────────────
  test('send', async sub => {
    await sub.test('should throw when connection is not open', () => {
      const client = new WebSocketClient('ws://localhost/ipc');

      assert.throws(() => client.send('hello'), {
        message: /WebSocket connection is not open/,
      });
    });

    await sub.test('should send data when connection is open', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();

      socket.open();

      client.send('{"type":"ping"}');

      assert.deepStrictEqual(socket.sent, ['{"type":"ping"}']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // close
  // ───────────────────────────────────────────────────────────────────────────
  test('close', async sub => {
    await sub.test('should close an open connection', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();

      socket.open();
      client.close();

      assert.strictEqual(socket.closed, true);
    });

    await sub.test('should be safe to call when already closed', () => {
      const client = new WebSocketClient('ws://localhost/ipc');
      const socket = latestSocket();

      socket.open();
      client.close();

      assert.doesNotThrow(() => client.close());
    });
  });
});

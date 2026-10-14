// @ts-check
/**
 * @file Contains the integration tests for the IPC subsystem over a real
 * HTTP server.
 *
 * @module test/integration/ipc/IPCMain
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Kernel from '#Kernel';
import HttpServerConfiguration from '#configurations/HttpServerConfiguration';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Data emitted with the listen event.
 *
 * @typedef {import('#Kernel').ListenEventData} ListenEventData
 */

/**
 * Represents the result returned by the makeKernel helper.
 *
 * @typedef  {object} MakeKernelResult
 * @property {Kernel} kernel           - Kernel bound to a random free port.
 * @property {string} endpoint         - Base URL where the kernel is listening.
 */

/**
 * Represents a decoded IPC message received over the wire.
 *
 * @typedef  {object}          IPCMessage
 * @property {string}          [id]       - Invocation identifier.
 * @property {string}          [type]     - Message type.
 * @property {unknown}         [result]   - Successful result payload.
 * @property {IPCErrorPayload} [error]    - Error payload.
 */

/**
 * Represents the normalized IPC wire error.
 *
 * @typedef  {object} IPCErrorPayload
 * @property {string} code            - Error code.
 * @property {string} message         - Error message.
 */
// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Waits for a WebSocket open event.
 *
 * @param {WebSocket} socket - WebSocket to observe.
 * @returns {Promise<void>} Resolves when the socket opens.
 */
function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', err => reject(err), { once: true });
  });
}

/**
 * Waits for the next incoming WebSocket message.
 *
 * @param {WebSocket} socket - WebSocket to observe.
 * @returns {Promise<IPCMessage>} Resolves with the parsed message payload.
 */
function waitForMessage(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener(
      'message',
      event => {
        try {
          resolve(JSON.parse(String(event.data)));
        } catch (error) {
          reject(error);
        }
      },
      { once: true },
    );
    socket.addEventListener('error', err => reject(err), { once: true });
  });
}

/**
 * Creates a Kernel bound to a random free port and captures the endpoint.
 *
 * @returns {Promise<MakeKernelResult>} The kernel and its listening endpoint.
 */
async function makeKernel() {
  const configuration = new HttpServerConfiguration({
    listen: { host: '127.0.0.1', port: 0 },
  });

  const kernel = new Kernel(configuration);

  const state = {
    /** @type {ListenEventData|null} */
    listenEvent: null,
  };

  kernel.onListen(data => {
    state.listenEvent = data;
  });

  await kernel.listen();

  assert.ok(state.listenEvent);

  return { kernel, endpoint: state.listenEvent.endpoint.displayUrl };
}

/**
 * Opens a WebSocket connection to the IPC endpoint.
 *
 * @param {string} endpoint - Base URL of the server.
 * @param {string} [path] - WebSocket path (default: `'/ipc'`).
 * @returns {Promise<WebSocket>} The opened WebSocket.
 */
async function openSocket(endpoint, path = '/ipc') {
  const base = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
  const url = new URL(path, base);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  const socket = new WebSocket(url.href);

  await waitForOpen(socket);

  return socket;
}

/**
 * Closes a WebSocket and waits for the close event.
 *
 * @param {WebSocket} socket - WebSocket to close.
 * @returns {Promise<void>} Resolves when the socket is fully closed.
 */
function closeSocket(socket) {
  return new Promise(resolve => {
    if (socket.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }

    socket.addEventListener('close', () => resolve(), { once: true });
    socket.close();
  });
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPC integration', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // invoke
  // ───────────────────────────────────────────────────────────────────────────
  test('invoke', async sub => {
    await sub.test('should invoke a registered handler over a real WebSocket', async () => {
      const { kernel, endpoint } = await makeKernel();

      try {
        kernel.ipc.handle('users:get', id => ({ id, name: 'Alice' }));

        const socket = await openSocket(endpoint);

        try {
          socket.send(
            JSON.stringify({
              type: 'invoke',
              channel: 'users:get',
              id: '1',
              data: '42',
            }),
          );

          const response = await waitForMessage(socket);

          assert.deepStrictEqual(response, {
            type: 'response',
            id: '1',
            result: { id: '42', name: 'Alice' },
          });
        } finally {
          await closeSocket(socket);
        }
      } finally {
        await kernel.close();
      }
    });

    await sub.test('should respond with IPC_CHANNEL_NOT_FOUND', async () => {
      const { kernel, endpoint } = await makeKernel();

      try {
        const socket = await openSocket(endpoint);

        try {
          socket.send(
            JSON.stringify({
              type: 'invoke',
              channel: 'missing',
              id: '2',
            }),
          );

          const response = await waitForMessage(socket);

          assert.strictEqual(response.id, '2');
          assert.strictEqual(response.error?.code, 'IPC_CHANNEL_NOT_FOUND');
        } finally {
          await closeSocket(socket);
        }
      } finally {
        await kernel.close();
      }
    });

    await sub.test('should forward handler errors over the wire', async () => {
      const { kernel, endpoint } = await makeKernel();

      try {
        kernel.ipc.handle('fail', () => {
          throw new Error('handler boom');
        });

        const socket = await openSocket(endpoint);

        try {
          socket.send(
            JSON.stringify({
              type: 'invoke',
              channel: 'fail',
              id: '3',
            }),
          );

          const response = await waitForMessage(socket);

          assert.strictEqual(response.error?.code, 'IPC_HANDLER_ERROR');
          assert.strictEqual(response.error?.message, 'handler boom');
        } finally {
          await closeSocket(socket);
        }
      } finally {
        await kernel.close();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // event
  // ───────────────────────────────────────────────────────────────────────────
  test('event', async sub => {
    await sub.test('should dispatch an event to a registered listener', async () => {
      const { kernel, endpoint } = await makeKernel();

      try {
        /** @type {unknown[]} */
        const received = [];

        kernel.ipc.on('notification', data => received.push(data));

        const socket = await openSocket(endpoint);

        try {
          socket.send(
            JSON.stringify({
              type: 'event',
              channel: 'notification',
              data: { msg: 'hi' },
            }),
          );

          await new Promise(resolve => setTimeout(resolve, 50));

          assert.deepStrictEqual(received, [{ msg: 'hi' }]);
        } finally {
          await closeSocket(socket);
        }
      } finally {
        await kernel.close();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('lifecycle', async sub => {
    await sub.test('should reject the WebSocket handshake after close', async () => {
      const { kernel, endpoint } = await makeKernel();

      await kernel.close();

      const base = endpoint.startsWith('http') ? endpoint : `http://${endpoint}`;
      const url = new URL('/ipc', base);

      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

      const socket = new WebSocket(url.href);

      await assert.rejects(() => waitForOpen(socket));
    });
  });
});

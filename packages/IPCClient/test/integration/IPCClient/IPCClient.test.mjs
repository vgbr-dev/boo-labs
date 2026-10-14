// @ts-check
/**
 * @file Contains the integration tests for IPCClient.
 *
 * These tests exercise the full client stack (IPCClient → IPCClientChannel →
 * IPCProtocol → WebSocketClient) against a lightweight in-process mock of the
 * server side.
 *
 * @module test/integration/IPCClient/IPCClient
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCClient from '../../../source/core/IPCClient/index.mjs';
import IPCError from '#shared/errors/IPCError';
import DuplexTransport from '../../helpers/DuplexTransport.mjs';
import MockServerChannel from '../../helpers/MockServerChannel.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a connected client and server pair used by tests.
 *
 * @typedef  {object}            ConnectedPair
 * @property {IPCClient}         client          - Connected IPC client.
 * @property {MockServerChannel} server          - Mock server channel bound to the transport.
 * @property {DuplexTransport}   clientTransport - Client-side transport endpoint.
 * @property {() => void}        restore         - Restores the original `WebSocket`.
 */
// ━━ HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Creates a pair of connected `DuplexTransport` instances.
 *
 * @returns {[DuplexTransport, DuplexTransport]} Client and server endpoints.
 */
function createDuplexPair() {
  const client = new DuplexTransport();
  const server = new DuplexTransport();

  client.peer = server;
  server.peer = client;

  return [client, server];
}

/**
 * Replaces `globalThis.WebSocket` with a mock that returns the provided
 * transport instance.
 *
 * @param {DuplexTransport} transport - Transport instance to return on construction.
 * @returns {() => void} Restores the original `WebSocket`.
 */
function installWebSocketMock(transport) {
  const original = globalThis.WebSocket;

  // @ts-expect-error — test mock
  globalThis.WebSocket = function MockWebSocket(url) {
    transport.url = url;
    return transport;
  };

  // @ts-expect-error — test mock
  globalThis.WebSocket.CONNECTING = DuplexTransport.CONNECTING;
  // @ts-expect-error — test mock
  globalThis.WebSocket.OPEN = DuplexTransport.OPEN;
  // @ts-expect-error — test mock
  globalThis.WebSocket.CLOSED = DuplexTransport.CLOSED;

  return () => {
    globalThis.WebSocket = original;
  };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates a connected client and server pair for a test.
 *
 * @returns {Promise<ConnectedPair>} The connected pair and its cleanup function.
 */
async function createConnectedPair() {
  const [clientTransport, serverTransport] = createDuplexPair();
  const restore = installWebSocketMock(clientTransport);

  const server = new MockServerChannel(serverTransport);
  const client = new IPCClient('ws://localhost/ipc');

  const connectPromise = client.connect();
  clientTransport.open();
  serverTransport.open();
  await connectPromise;

  return { client, server, clientTransport, restore };
}

// ───────────────────────────────────────────────────────────────────────────
// Connection lifecycle
// ───────────────────────────────────────────────────────────────────────────
test('IPCClient — Connection lifecycle', async subtest => {
  await subtest.test('should report not connected before open', async () => {
    const [clientTransport, serverTransport] = createDuplexPair();
    const restore = installWebSocketMock(clientTransport);

    const client = new IPCClient('ws://localhost/ipc');

    assert.strictEqual(client.connected, false);

    try {
      client.close();
    } catch {
      // ignore
    }

    restore();
    void serverTransport;
  });

  await subtest.test('should connect successfully', async () => {
    const { client, restore } = await createConnectedPair();

    assert.strictEqual(client.connected, true);

    client.close();
    restore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Client → Server invoke
// ───────────────────────────────────────────────────────────────────────────

test('IPCClient — Client → Server invoke', async subtest => {
  await subtest.test('should round-trip an invocation', async () => {
    const { client, server, restore } = await createConnectedPair();

    server.handle('users:get', async data => {
      if (typeof data !== 'object' || data === null || !('id' in data)) {
        throw new Error('Invalid payload');
      }

      const { id } = data;

      return { id, name: 'Victor' };
    });

    const user = await client.invoke('users:get', { id: '42' });

    assert.deepStrictEqual(user, { id: '42', name: 'Victor' });

    client.close();
    restore();
  });

  await subtest.test('should propagate handler errors', async () => {
    const { client, server, restore } = await createConnectedPair();

    server.handle('users:get', async () => {
      throw new Error('User not found');
    });

    await assert.rejects(
      () => client.invoke('users:get', { id: 'missing' }),
      error => {
        assert.ok(error instanceof IPCError);
        assert.match(error.message, /User not found/);
        return true;
      },
    );

    client.close();
    restore();
  });

  await subtest.test('should reject with CHANNEL_NOT_FOUND when no handler exists', async () => {
    const { client, restore } = await createConnectedPair();

    await assert.rejects(
      () => client.invoke('unknown:channel'),
      error => {
        assert.ok(error instanceof IPCError);
        assert.strictEqual(error.code, 'IPC_CHANNEL_NOT_FOUND');
        return true;
      },
    );

    client.close();
    restore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Client → Server send (event)
// ───────────────────────────────────────────────────────────────────────────

test('IPCClient — Client → Server send (event)', async subtest => {
  await subtest.test('should deliver a one-way event', async () => {
    const { client, server, restore } = await createConnectedPair();

    const receivedPromise = new Promise(resolve => {
      server.on('notifications:subscribe', resolve);
    });

    client.send('notifications:subscribe', { userId: '42' });

    assert.deepStrictEqual(await receivedPromise, { userId: '42' });

    client.close();
    restore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Server → Client event
// ───────────────────────────────────────────────────────────────────────────

test('IPCClient — Server → Client event', async subtest => {
  await subtest.test('should deliver events from server to client listeners', async () => {
    const { client, server, restore } = await createConnectedPair();

    const receivedPromise = new Promise(resolve => {
      client.on('users:updated', resolve);
    });

    server.emit('users:updated', { id: '42', name: 'Updated' });

    assert.deepStrictEqual(await receivedPromise, { id: '42', name: 'Updated' });

    client.close();
    restore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Server → Client invoke
// ───────────────────────────────────────────────────────────────────────────

test('IPCClient — Server → Client invoke', async subtest => {
  await subtest.test('should allow the server to invoke a client handler', async () => {
    const { client, server, restore } = await createConnectedPair();

    client.handle('client:echo', async data => ({ echoed: data }));

    const result = await server.invoke('client:echo', { hello: 'world' });

    assert.deepStrictEqual(result, { echoed: { hello: 'world' } });

    client.close();
    restore();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Close behaviour
// ───────────────────────────────────────────────────────────────────────────

test('IPCClient — Close behaviour', async subtest => {
  await subtest.test('should reject pending invokes when the connection closes', async () => {
    const { client, restore } = await createConnectedPair();

    const pending = client.invoke('slow:operation');

    client.close();

    await assert.rejects(pending, error => {
      assert.ok(error instanceof IPCError);
      assert.ok(error.code === 'IPC_CLOSED' || error.code === 'IPC_CONNECTION_ERROR');
      return true;
    });

    restore();
  });
});

// @ts-check
/**
 * @file Contains the unit tests for IPCServerChannel.
 *
 * @module test/unit/core/IPCMain/IPCServerChannel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCServerChannel from '../../../../source/core/IPCMain/IPCServerChannel.mjs';
import { createFakeWebSocketConnection } from '../../../helpers/createFakeWebSocketConnection.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents an established WebSocket connection contract.
 *
 * @typedef {import('#adapters/TransportAdapter').WebSocketConnection} WebSocketConnection
 */

/**
 * Represents a decoded IPC request.
 *
 * @typedef {import('../../../../source/core/IPCMain/IPCProtocol.mjs').IPCRequest} IPCRequest
 */

/**
 * Represents a response payload supplied by the IPC host.
 *
 * @typedef {import('../../../../source/core/IPCMain/IPCServerChannel.mjs').IPCResponsePayload} IPCResponsePayload
 */

/**
 * Represents the internal capability supplied by IPCMain to dispatch IPC requests.
 *
 * @typedef {import('../../../../source/core/IPCMain/IPCServerChannel.mjs').IPCChannelHost} IPCChannelHost
 */

/**
 * Represents a single captured dispatch invocation.
 *
 * @typedef  {object}                                CapturedRequest
 * @property {IPCRequest}                            request         - Dispatched request.
 * @property {(payload: IPCResponsePayload) => void} respond         - Respond function passed to dispatch.
 */

/**
 * Represents the state captured by the fake host.
 *
 * @typedef  {object}            CapturedHost
 * @property {CapturedRequest[]} requests     - All dispatched requests.
 */

/**
 * Represents the result returned by the makeHost helper.
 *
 * @typedef  {object}         MakeHostResult
 * @property {IPCChannelHost} host           - Fake IPC host.
 * @property {CapturedHost}   captured       - Captured state.
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
 * Creates a host that records dispatched requests.
 *
 * @param {(request: IPCRequest, respond: (payload: IPCResponsePayload) => void) => void|Promise<void>} [handler] - Optional handler invoked for each dispatch.
 * @returns {MakeHostResult} The fake host and its captured state.
 */
function makeHost(handler) {
  /** @type {CapturedHost} */
  const captured = { requests: [] };

  /** @type {IPCChannelHost} */
  const host = {
    /**
     * Records and optionally handles a dispatched request.
     *
     * @param {IPCRequest} request - The dispatched request.
     * @param {(payload: IPCResponsePayload) => void} respond - Respond function to send a reply.
     * @returns {Promise<void>} Resolves when dispatch completes.
     */
    async dispatch(request, respond) {
      captured.requests.push({ request, respond });

      if (handler) {
        await handler(request, respond);
      }
    },
  };

  return { host, captured };
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPCServerChannel', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should register message, close, and error handlers', () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      assert.ok(connection._listeners.has('message'));
      assert.ok(connection._listeners.has('close'));
      assert.ok(connection._listeners.has('error'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Event dispatch
  // ───────────────────────────────────────────────────────────────────────────
  test('Event dispatch', async sub => {
    await sub.test('should dispatch an event request', async () => {
      const connection = createFakeWebSocketConnection();
      const { host, captured } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
          data: { msg: 'hi' },
        }),
      );

      await flush();

      assert.strictEqual(captured.requests.length, 1);
      assert.strictEqual(captured.requests[0].request.type, 'event');
      assert.strictEqual(captured.requests[0].request.channel, 'notifications');
    });

    await sub.test('should not send a response for events', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });

    await sub.test('should isolate event dispatch failures', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost(() => {
        throw new Error('dispatch failed');
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
        }),
      );

      await flush();

      // El canal sigue operativo.
      assert.strictEqual(connection._closed, false);
      assert.strictEqual(connection._sent.length, 0);
    });

    await sub.test('should accept a Buffer message', async () => {
      const connection = createFakeWebSocketConnection();
      const { host, captured } = makeHost();

      new IPCServerChannel(connection, host);

      const buffer = Buffer.from(
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
        }),
        'utf8',
      );

      connection._emit('message', buffer);

      await flush();

      assert.strictEqual(captured.requests.length, 1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Invoke dispatch
  // ───────────────────────────────────────────────────────────────────────────
  test('Invoke dispatch', async sub => {
    await sub.test('should dispatch an invoke request', async () => {
      const connection = createFakeWebSocketConnection();
      const { host, captured } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(captured.requests.length, 1);
      assert.strictEqual(captured.requests[0].request.type, 'invoke');
      assert.strictEqual(captured.requests[0].request.id, '42');
    });

    await sub.test('should send a success response', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost((_request, respond) => {
        respond({ result: { name: 'Victor' } });
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 1);

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.type, 'response');
      assert.strictEqual(response.id, '42');
      assert.deepStrictEqual(response.result, { name: 'Victor' });
    });

    await sub.test('should send an error response when the handler throws', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost(() => {
        throw new Error('handler failed');
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 1);

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.id, '42');
      assert.strictEqual(response.error.code, 'IPC_HANDLER_ERROR');
      assert.strictEqual(response.error.message, 'handler failed');
    });

    await sub.test('should ignore additional respond calls', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost((_request, respond) => {
        respond({ result: 'first' });
        respond({ result: 'second' });
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 1);

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.result, 'first');
    });

    await sub.test('should not send a response when dispatch never responds', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Decode failures
  // ───────────────────────────────────────────────────────────────────────────
  test('Decode failures', async sub => {
    await sub.test('should not respond to an invalid JSON payload', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit('message', 'not json');

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });

    await sub.test('should send a badMessage response when the id can be recovered', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      // JSON válido pero el request no pasa la validación de canal.
      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: '',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 1);

      const response = JSON.parse(connection._sent[0]);

      assert.strictEqual(response.id, '42');
      assert.strictEqual(response.error.code, 'IPC_BAD_MESSAGE');
      assert.match(response.error.message, /channel/);
    });

    await sub.test('should not respond when the id cannot be recovered', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      // Falta el id.
      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });

    await sub.test('should not respond to an unknown message type', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'unknown',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Connection lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Connection lifecycle', async sub => {
    await sub.test('should stop processing messages after close', async () => {
      const connection = createFakeWebSocketConnection();
      const { host, captured } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit('close');
      connection._emit(
        'message',
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
        }),
      );

      await flush();

      assert.strictEqual(captured.requests.length, 0);
    });

    await sub.test('should stop processing messages after error', async () => {
      const connection = createFakeWebSocketConnection();
      const { host, captured } = makeHost();

      new IPCServerChannel(connection, host);

      connection._emit('error', new Error('boom'));
      connection._emit(
        'message',
        JSON.stringify({
          type: 'event',
          channel: 'notifications',
        }),
      );

      await flush();

      assert.strictEqual(captured.requests.length, 0);
    });

    await sub.test('should not send after close', async () => {
      const connection = createFakeWebSocketConnection();
      const { host } = makeHost((_request, respond) => {
        respond({ result: 'ok' });
      });

      new IPCServerChannel(connection, host);

      connection._emit('close');
      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._sent.length, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Send failures
  // ───────────────────────────────────────────────────────────────────────────
  test('Send failures', async sub => {
    await sub.test('should close the connection when send throws', async () => {
      const connection = createFakeWebSocketConnection();
      connection.send = () => {
        throw new Error('send failed');
      };

      const { host } = makeHost((_request, respond) => {
        respond({ result: 'ok' });
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      await flush();

      assert.strictEqual(connection._closed, true);
    });

    await sub.test('should ignore close failures during force close', async () => {
      const connection = createFakeWebSocketConnection();
      connection.send = () => {
        throw new Error('send failed');
      };
      connection.close = () => {
        throw new Error('close failed');
      };

      const { host } = makeHost((_request, respond) => {
        respond({ result: 'ok' });
      });

      new IPCServerChannel(connection, host);

      connection._emit(
        'message',
        JSON.stringify({
          type: 'invoke',
          channel: 'users:get',
          id: '42',
        }),
      );

      // No debe lanzar.
      await flush();
    });
  });
});

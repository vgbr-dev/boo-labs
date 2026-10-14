// @ts-check
/**
 * @file Contains the unit tests for IPCClientChannel.
 *
 * @module test/unit/IPCClient/IPCClientChannel
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCClientChannel from '../../../source/core/IPCClient/IPCClientChannel.mjs';
import IPCError from '#shared/errors/IPCError';
import MockConnection from '../../helpers/MockConnection.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPCClientChannel', () => {
  /** @type {MockConnection} */
  let connection;
  /** @type {IPCClientChannel} */
  let channel;

  beforeEach(() => {
    connection = new MockConnection();
    channel = new IPCClientChannel(/** @type {any} */ (connection));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // handle / removeHandler
  // ───────────────────────────────────────────────────────────────────────────
  test('handle / removeHandler', async sub => {
    await sub.test('should register a handler', () => {
      const handler = async () => ({ ok: true });
      assert.doesNotThrow(() => channel.handle('users:get', handler));
    });

    await sub.test('should reject invalid channel names', () => {
      assert.throws(() => channel.handle('', async () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });

      assert.throws(() => channel.handle(/** @type {any} */ (123), async () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject non-function handlers', () => {
      assert.throws(() => channel.handle('users:get', /** @type {any} */ ('nope')), {
        name: 'IPCError',
        code: 'IPC_INVALID_HANDLER',
      });
    });

    await sub.test('should remove a handler', () => {
      channel.handle('users:get', async () => ({}));
      assert.doesNotThrow(() => channel.removeHandler('users:get'));
    });

    await sub.test('should reject operations after close', () => {
      channel.close();
      assert.throws(() => channel.handle('users:get', async () => ({})), {
        name: 'IPCError',
        code: 'IPC_CLOSED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // on / off
  // ───────────────────────────────────────────────────────────────────────────
  test('on / off', async sub => {
    await sub.test('should register a listener', () => {
      const listener = () => {};
      assert.doesNotThrow(() => channel.on('users:updated', listener));
    });

    await sub.test('should reject invalid channel names', () => {
      assert.throws(() => channel.on('', () => {}), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject non-function listeners', () => {
      assert.throws(() => channel.on('users:updated', /** @type {any} */ (null)), {
        name: 'IPCError',
        code: 'IPC_INVALID_LISTENER',
      });
    });

    await sub.test('should remove a listener', () => {
      const listener = () => {};
      channel.on('users:updated', listener);
      assert.doesNotThrow(() => channel.off('users:updated', listener));
    });

    await sub.test('should be safe to remove a non-registered listener', () => {
      assert.doesNotThrow(() => channel.off('users:updated', () => {}));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // invoke
  // ───────────────────────────────────────────────────────────────────────────
  test('invoke', async sub => {
    await sub.test('should send an encoded invoke message', async () => {
      const promise = channel.invoke('users:get', { id: '42' });

      assert.strictEqual(connection.sent.length, 1);
      const payload = JSON.parse(connection.sent[0]);
      assert.strictEqual(payload.type, 'invoke');
      assert.strictEqual(payload.channel, 'users:get');
      assert.ok(typeof payload.id === 'string' && payload.id.length > 0);
      assert.deepStrictEqual(payload.data, { id: '42' });

      // Resolve the pending invocation so the test finishes cleanly
      connection.receive(
        JSON.stringify({
          type: 'response',
          id: payload.id,
          result: { name: 'Victor' },
        }),
      );

      const result = await promise;
      assert.deepStrictEqual(result, { name: 'Victor' });
    });

    await sub.test('should resolve with the remote result', async () => {
      const promise = channel.invoke('users:get', { id: '1' });
      const payload = JSON.parse(connection.sent[0]);

      connection.receive(
        JSON.stringify({
          type: 'response',
          id: payload.id,
          result: { id: '1', name: 'Ada' },
        }),
      );

      const result = await promise;
      assert.deepStrictEqual(result, { id: '1', name: 'Ada' });
    });

    await sub.test('should reject with IPCError on error response', async () => {
      const promise = channel.invoke('users:get', { id: 'missing' });
      const payload = JSON.parse(connection.sent[0]);

      connection.receive(
        JSON.stringify({
          type: 'response',
          id: payload.id,
          error: {
            code: 'IPC_CHANNEL_NOT_FOUND',
            message: 'No handler registered for channel "users:get"',
          },
        }),
      );

      await assert.rejects(promise, error => {
        assert.ok(error instanceof IPCError);
        assert.strictEqual(error.code, 'IPC_CHANNEL_NOT_FOUND');
        assert.match(error.message, /No handler registered/);
        return true;
      });
    });

    await sub.test('should reject invalid channel names', () => {
      assert.throws(() => channel.invoke(''), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });

    await sub.test('should reject after close', () => {
      channel.close();
      assert.throws(() => channel.invoke('users:get'), {
        name: 'IPCError',
        code: 'IPC_CLOSED',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // send
  // ───────────────────────────────────────────────────────────────────────────
  test('send', async sub => {
    await sub.test('should send an encoded event message', () => {
      channel.send('notifications:subscribe', { userId: '42' });

      assert.strictEqual(connection.sent.length, 1);
      const payload = JSON.parse(connection.sent[0]);
      assert.strictEqual(payload.type, 'event');
      assert.strictEqual(payload.channel, 'notifications:subscribe');
      assert.deepStrictEqual(payload.data, { userId: '42' });
    });

    await sub.test('should allow sending without data', () => {
      channel.send('notifications:ping');

      const payload = JSON.parse(connection.sent[0]);
      assert.strictEqual(payload.type, 'event');
      assert.strictEqual(payload.channel, 'notifications:ping');
      // data may be undefined / omitted
    });

    await sub.test('should reject invalid channel names', () => {
      assert.throws(() => channel.send(''), {
        name: 'IPCError',
        code: 'IPC_INVALID_CHANNEL',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Incoming messages
  // ───────────────────────────────────────────────────────────────────────────
  test('Incoming messages', async sub => {
    await sub.test('should dispatch events to registered listeners', async () => {
      /** @type {unknown} */
      let received = null;

      channel.on('users:updated', data => {
        received = data;
      });

      connection.receive(
        JSON.stringify({
          type: 'event',
          channel: 'users:updated',
          data: { id: '42', name: 'Updated' },
        }),
      );

      // Allow microtask queue to flush
      await Promise.resolve();
      assert.deepStrictEqual(received, { id: '42', name: 'Updated' });
    });

    await sub.test('should handle remote invoke and reply with success', async () => {
      /**
       * Adds two numbers received as an invoke payload.
       *
       * @param {unknown} data - Payload containing two numbers.
       * @returns {Promise<number>} The sum of `a` and `b`.
       */
      async function mathAddHandler(data) {
        if (
          typeof data === 'object' &&
          data !== null &&
          'a' in data &&
          'b' in data &&
          typeof data.a === 'number' &&
          typeof data.b === 'number'
        ) {
          return data.a + data.b;
        }

        throw new TypeError('Expected a payload containing two numbers.');
      }
      channel.handle('math:add', mathAddHandler);

      connection.receive(
        JSON.stringify({
          type: 'invoke',
          channel: 'math:add',
          id: 'req-1',
          data: { a: 2, b: 3 },
        }),
      );

      // Allow async handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      assert.strictEqual(connection.sent.length, 1);
      const response = JSON.parse(connection.sent[0]);
      assert.strictEqual(response.type, 'response');
      assert.strictEqual(response.id, 'req-1');
      assert.strictEqual(response.result, 5);
    });

    await sub.test('should reply with error when no handler is registered', async () => {
      connection.receive(
        JSON.stringify({
          type: 'invoke',
          channel: 'unknown:channel',
          id: 'req-2',
        }),
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      assert.strictEqual(connection.sent.length, 1);
      const response = JSON.parse(connection.sent[0]);
      assert.strictEqual(response.type, 'response');
      assert.strictEqual(response.id, 'req-2');
      assert.ok(response.error);
      assert.strictEqual(response.error.code, 'IPC_CHANNEL_NOT_FOUND');
    });

    await sub.test('should reply with error when handler throws', async () => {
      channel.handle('failing', async () => {
        throw new Error('boom');
      });

      connection.receive(
        JSON.stringify({
          type: 'invoke',
          channel: 'failing',
          id: 'req-3',
        }),
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      const response = JSON.parse(connection.sent[0]);
      assert.strictEqual(response.type, 'response');
      assert.strictEqual(response.id, 'req-3');
      assert.ok(response.error);
      assert.strictEqual(response.error.code, 'IPC_HANDLER_ERROR');
      assert.match(response.error.message, /boom/);
    });

    await sub.test('should ignore malformed messages', async () => {
      assert.doesNotThrow(() => {
        connection.receive('not-json');
        connection.receive('{"type":"unknown"}');
        connection.receive(JSON.stringify({ type: 'response' })); // missing id
      });
    });

    await sub.test('should isolate listener failures', async () => {
      let secondCalled = false;

      channel.on('users:updated', () => {
        throw new Error('listener failure');
      });
      channel.on('users:updated', () => {
        secondCalled = true;
      });

      connection.receive(
        JSON.stringify({
          type: 'event',
          channel: 'users:updated',
          data: {},
        }),
      );

      await Promise.resolve();
      assert.strictEqual(secondCalled, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // close
  // ───────────────────────────────────────────────────────────────────────────
  test('close', async sub => {
    await sub.test('should reject pending invocations on close', async () => {
      const promise = channel.invoke('users:get', { id: '1' });
      channel.close();

      await assert.rejects(promise, error => {
        assert.ok(error instanceof IPCError);
        assert.strictEqual(error.code, 'IPC_CLOSED');
        return true;
      });
    });

    await sub.test('should be safe to call multiple times', () => {
      channel.close();
      assert.doesNotThrow(() => channel.close());
    });

    await sub.test('should close the underlying connection', () => {
      channel.close();
      assert.strictEqual(connection.closed, true);
    });
  });
});

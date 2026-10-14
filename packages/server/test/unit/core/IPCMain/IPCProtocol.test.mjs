// @ts-check
/**
 * @file Contains the unit tests for IPCProtocol.
 *
 * @module test/unit/core/IPCMain/IPCProtocol
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import IPCProtocol from '../../../../source/core/IPCMain/IPCProtocol.mjs';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('IPCProtocol', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // decode() — invoke
  // ───────────────────────────────────────────────────────────────────────────
  test('decode() invoke', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should decode a valid invoke request', () => {
      const request = protocol.decode('{"type":"invoke","channel":"users:get","id":"42"}');

      assert.deepStrictEqual(request, {
        type: 'invoke',
        channel: 'users:get',
        id: '42',
        data: undefined,
      });
    });

    await sub.test('should preserve the data field', () => {
      const request = protocol.decode('{"type":"invoke","channel":"c","id":"1","data":{"a":1}}');

      assert.deepStrictEqual(request.data, { a: 1 });
    });

    await sub.test('should allow data to be undefined', () => {
      const request = protocol.decode('{"type":"invoke","channel":"c","id":"1"}');

      assert.strictEqual(request.data, undefined);
    });

    await sub.test('should preserve null data', () => {
      const request = protocol.decode('{"type":"invoke","channel":"c","id":"1","data":null}');

      assert.strictEqual(request.data, null);
    });

    await sub.test('should preserve falsy data values', () => {
      [
        ['false', false],
        ['0', 0],
        ['""', ''],
      ].forEach(([value, expected]) => {
        const request = protocol.decode(`{"type":"invoke","channel":"c","id":"1","data":${value}}`);

        assert.strictEqual(request.data, expected);
      });
    });

    await sub.test('should reject a payload that is not valid JSON', () => {
      assert.throws(() => protocol.decode('not json'), {
        name: 'TypeError',
        message: /valid JSON/,
      });
    });

    await sub.test('should reject a payload that is not a plain object', () => {
      ['"a string"', '[1,2,3]', '42', 'null'].forEach(payload => {
        assert.throws(() => protocol.decode(payload), {
          name: 'TypeError',
          message: /plain object/,
        });
      });
    });

    await sub.test('should reject a payload without a type', () => {
      assert.throws(() => protocol.decode('{}'), {
        name: 'ReferenceError',
        message: /requires a "type" property/,
      });
    });

    await sub.test('should reject an unknown type', () => {
      assert.throws(() => protocol.decode('{"type":"unknown"}'), {
        name: 'TypeError',
        message: /"invoke" or "event"/,
      });
    });

    // ── channel ──────────────────────────────────────────────────────────────

    await sub.test('should reject an invoke without a channel', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","id":"1"}'), {
        name: 'ReferenceError',
        message: /requires a "channel"/,
      });
    });

    await sub.test('should reject an invoke with a non-string channel', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":42,"id":"1"}'), {
        name: 'TypeError',
        message: /channel must be a string/,
      });
    });

    await sub.test('should reject an invoke with a null channel', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":null,"id":"1"}'), {
        name: 'TypeError',
        message: /channel must be a string/,
      });
    });

    await sub.test('should reject an invoke with an empty channel', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"","id":"1"}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });

    await sub.test('should reject a channel containing only spaces', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"   ","id":"1"}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });

    await sub.test('should reject a channel containing only tabs and newlines', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"\\t\\n","id":"1"}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });

    // ── id ───────────────────────────────────────────────────────────────────

    await sub.test('should reject an invoke without an id', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c"}'), {
        name: 'ReferenceError',
        message: /requires an "id"/,
      });
    });

    await sub.test('should reject an invoke with a non-string id', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c","id":42}'), {
        name: 'TypeError',
        message: /id must be a string/,
      });
    });

    await sub.test('should reject an invoke with a null id', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c","id":null}'), {
        name: 'TypeError',
        message: /id must be a string/,
      });
    });

    await sub.test('should reject an invoke with an empty id', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c","id":""}'), {
        name: 'RangeError',
        message: /id must be a non-empty string/,
      });
    });

    await sub.test('should reject an id containing only spaces', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c","id":"   "}'), {
        name: 'RangeError',
        message: /id must be a non-empty string/,
      });
    });

    await sub.test('should reject an id containing only tabs and newlines', () => {
      assert.throws(() => protocol.decode('{"type":"invoke","channel":"c","id":"\\t\\n"}'), {
        name: 'RangeError',
        message: /id must be a non-empty string/,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // decode() — event
  // ───────────────────────────────────────────────────────────────────────────
  test('decode() event', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should decode a valid event request', () => {
      const request = protocol.decode('{"type":"event","channel":"notifications"}');

      assert.deepStrictEqual(request, {
        type: 'event',
        channel: 'notifications',
        data: undefined,
      });
    });

    await sub.test('should preserve the data field', () => {
      const request = protocol.decode('{"type":"event","channel":"c","data":[1,2,3]}');

      assert.deepStrictEqual(request.data, [1, 2, 3]);
    });

    await sub.test('should allow data to be undefined', () => {
      const request = protocol.decode('{"type":"event","channel":"c"}');

      assert.strictEqual(request.data, undefined);
    });

    await sub.test('should preserve null data', () => {
      const request = protocol.decode('{"type":"event","channel":"c","data":null}');

      assert.strictEqual(request.data, null);
    });

    await sub.test('should reject an event without a channel', () => {
      assert.throws(() => protocol.decode('{"type":"event"}'), {
        name: 'ReferenceError',
        message: /requires a "channel"/,
      });
    });

    await sub.test('should reject an event with a non-string channel', () => {
      assert.throws(() => protocol.decode('{"type":"event","channel":42}'), {
        name: 'TypeError',
        message: /channel must be a string/,
      });
    });

    await sub.test('should reject an event with a null channel', () => {
      assert.throws(() => protocol.decode('{"type":"event","channel":null}'), {
        name: 'TypeError',
        message: /channel must be a string/,
      });
    });

    await sub.test('should reject an event with an empty channel', () => {
      assert.throws(() => protocol.decode('{"type":"event","channel":""}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });

    await sub.test('should reject an event channel containing only spaces', () => {
      assert.throws(() => protocol.decode('{"type":"event","channel":"   "}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });

    await sub.test('should reject an event channel containing only tabs and newlines', () => {
      assert.throws(() => protocol.decode('{"type":"event","channel":"\\t\\n"}'), {
        name: 'RangeError',
        message: /channel must be a non-empty string/,
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // encode()
  // ───────────────────────────────────────────────────────────────────────────
  test('encode()', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should serialize a response', () => {
      const encoded = protocol.encode({
        type: 'response',
        id: '42',
        result: { name: 'Victor' },
      });

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        result: { name: 'Victor' },
      });
    });

    await sub.test('should serialize an error response', () => {
      const encoded = protocol.encode({
        type: 'response',
        id: '42',
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Request failed',
        },
      });

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Request failed',
        },
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // success()
  // ───────────────────────────────────────────────────────────────────────────
  test('success()', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should serialize a successful response', () => {
      const encoded = protocol.success('42', { name: 'Victor' });

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        result: { name: 'Victor' },
      });
    });

    await sub.test('should preserve a null result', () => {
      const encoded = protocol.success('42', null);

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        result: null,
      });
    });

    await sub.test('should preserve falsy results', () => {
      [
        [false, false],
        [0, 0],
        ['', ''],
      ].forEach(([result, expected]) => {
        const encoded = protocol.success('42', result);

        assert.strictEqual(JSON.parse(encoded).result, expected);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // error()
  // ───────────────────────────────────────────────────────────────────────────
  test('error()', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should normalize an Error instance', () => {
      const encoded = protocol.error('42', new Error('boom'));

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        error: {
          code: 'IPC_HANDLER_ERROR',
          message: 'boom',
        },
      });
    });

    await sub.test('should preserve code and message from a domain error', () => {
      const domainError = Object.assign(new Error('failed'), {
        code: 'MY_CODE',
      });

      const encoded = protocol.error('42', domainError);

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        error: {
          code: 'MY_CODE',
          message: 'failed',
        },
      });
    });

    await sub.test('should handle a plain object with code and message', () => {
      const encoded = protocol.error('42', {
        code: 'PLAIN_CODE',
        message: 'plain message',
      });

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'PLAIN_CODE',
        message: 'plain message',
      });
    });

    await sub.test('should stringify a string error', () => {
      const encoded = protocol.error('42', 'oops');

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: 'oops',
      });
    });

    await sub.test('should stringify a numeric error', () => {
      const encoded = protocol.error('42', 404);

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: '404',
      });
    });

    await sub.test('should handle null', () => {
      const encoded = protocol.error('42', null);

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: 'null',
      });
    });

    await sub.test('should handle undefined', () => {
      const encoded = protocol.error('42', undefined);

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: 'undefined',
      });
    });

    await sub.test('should normalize a plain object without code', () => {
      const encoded = protocol.error('42', { message: 'plain message' });

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: '[object Object]',
      });
    });

    await sub.test('should normalize a plain object without message', () => {
      const encoded = protocol.error('42', { code: 'PLAIN_CODE' });

      assert.deepStrictEqual(JSON.parse(encoded).error, {
        code: 'IPC_HANDLER_ERROR',
        message: '[object Object]',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // badMessage()
  // ───────────────────────────────────────────────────────────────────────────
  test('badMessage()', async sub => {
    const protocol = new IPCProtocol();

    await sub.test('should serialize a bad message response', () => {
      const encoded = protocol.badMessage('42', 'Invalid payload');

      assert.deepStrictEqual(JSON.parse(encoded), {
        type: 'response',
        id: '42',
        error: {
          code: 'IPC_BAD_MESSAGE',
          message: 'Invalid payload',
        },
      });
    });
  });
});

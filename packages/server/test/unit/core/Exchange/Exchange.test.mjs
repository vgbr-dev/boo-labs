// @ts-check
/**
 * @file Contains the unit tests for Exchange.
 *
 * @module test/unit/core/Exchange/Exchange
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import { Transform } from 'node:stream';

// » IMPORT LOCAL MODULES
import Exchange, { wrapResponseBody, discardResponseState } from '#Exchange';
import Request from '#Request';
import Response from '#Response';
import { createFakeHttp1Response } from '../../../helpers/fakeServerResponse.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the input shape accepted by `createMockIncomingMessage`.
 *
 * @typedef {Parameters<typeof createMockIncomingMessage>[0]} MockIncomingMessageOptions
 */

/**
 * Represents the result of `createFakeHttp1Response`.
 *
 * @typedef {ReturnType<typeof createFakeHttp1Response>} FakeHttp1Response
 */

/**
 * Represents the result of `makeExchange`.
 *
 * @typedef  {object}            MakeExchangeResult
 * @property {Exchange}          exchange           - The constructed exchange.
 * @property {FakeHttp1Response} serverResponse     - The fake server response attached to it.
 */

/**
 * Represents the state captured by the `onCommitError` test.
 *
 * @typedef  {object}        CapturedCommitErrorState
 * @property {Error|null}    error                    - The captured commit error.
 * @property {Exchange|null} exchange                 - The exchange passed to the hook.
 * @property {number}        hasHeaderCalls           - Number of times `hasHeader` was called.
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Creates an Exchange bound to a mock incoming message and a fake server
 * response.
 *
 * @param {MockIncomingMessageOptions} [messageOptions] - Options for the mock message.
 * @param {object} [exchangeOptions] - Additional options passed to the Exchange constructor.
 * @returns {MakeExchangeResult} The exchange and the fake server response.
 */
function makeExchange(messageOptions = {}, exchangeOptions = {}) {
  const message = createMockIncomingMessage({
    headers: { host: 'example.com' },
    ...messageOptions,
  });

  const serverResponse = createFakeHttp1Response();

  const exchange = new Exchange(
    /** @type {any} */ (message),
    /** @type {any} */ (serverResponse),
    exchangeOptions,
  );

  return { exchange, serverResponse };
}

/**
 * Creates a valid transform stream for `wrapResponseBody` tests.
 *
 * @returns {Transform} A no-op Transform stream.
 */
function makeTransform() {
  return new Transform({
    transform(_chunk, _encoding, callback) {
      callback();
    },
  });
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Exchange', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should create a Request and a Response', () => {
      const { exchange } = makeExchange();

      assert.ok(exchange.request instanceof Request);
      assert.ok(exchange.response instanceof Response);
    });

    await sub.test('should expose an empty state object without prototype', () => {
      const { exchange } = makeExchange();

      assert.deepStrictEqual(Object.keys(exchange.state), []);
      assert.strictEqual(Object.getPrototypeOf(exchange.state), null);
    });

    await sub.test('should capture startedAt', () => {
      const before = performance.now();
      const { exchange } = makeExchange();
      const after = performance.now();

      assert.ok(exchange.startedAt >= before && exchange.startedAt <= after);
    });

    await sub.test('should generate id, traceId, and spanId', () => {
      const { exchange } = makeExchange();

      assert.match(exchange.id, /^[0-9a-f-]{36}$/i);
      assert.match(exchange.traceId, /^[0-9a-f]{32}$/);
      assert.match(exchange.spanId, /^[0-9a-f]{16}$/);
    });

    await sub.test('should expose an AbortSignal', () => {
      const { exchange } = makeExchange();

      assert.ok(exchange.signal instanceof AbortSignal);
    });

    await sub.test('should abort immediately when the incoming message is destroyed', () => {
      const message = createMockIncomingMessage({ headers: { host: 'example.com' } });

      /** @type {any} */ (message).destroyed = true;

      const serverResponse = createFakeHttp1Response();
      const exchange = new Exchange(
        /** @type {any} */ (message),
        /** @type {any} */ (serverResponse),
      );

      assert.strictEqual(exchange.signal.aborted, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // traceparent on response
  // ───────────────────────────────────────────────────────────────────────────
  test('traceparent header', async sub => {
    await sub.test('should set traceparent on the response at commit', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};
      const traceparent = /** @type {string} */ (headers['traceparent']);

      assert.strictEqual(typeof traceparent, 'string');
      assert.match(traceparent, /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    });

    await sub.test('should preserve an existing traceparent', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.setHeader('traceparent', 'custom-value');
      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};

      assert.strictEqual(headers['traceparent'], 'custom-value');
    });

    await sub.test('should honor an incoming traceparent', () => {
      const { exchange, serverResponse } = makeExchange({
        headers: {
          host: 'example.com',
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      });

      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};
      const traceparent = /** @type {string} */ (headers['traceparent']);

      assert.ok(traceparent.includes('4bf92f3577b34da6a3ce929d0e0e4736'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // x-request-id header
  // ───────────────────────────────────────────────────────────────────────────
  test('x-request-id header', async sub => {
    await sub.test('should set x-request-id at commit', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};

      assert.strictEqual(headers['x-request-id'], exchange.id);
    });

    await sub.test('should preserve an existing x-request-id', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.setHeader('x-request-id', 'custom-id');
      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};

      assert.strictEqual(headers['x-request-id'], 'custom-id');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Server-Timing header
  // ───────────────────────────────────────────────────────────────────────────
  test('Server-Timing header', async sub => {
    await sub.test('should set Server-Timing at commit', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};
      const timing = /** @type {string} */ (headers['server-timing']);

      assert.strictEqual(typeof timing, 'string');
      assert.ok(timing.includes('received;desc="Received"'));
      assert.ok(timing.includes('processing;dur='));
      assert.ok(timing.includes('sent;desc="Sent"'));
    });

    await sub.test('should preserve an existing Server-Timing', () => {
      const { exchange, serverResponse } = makeExchange();

      exchange.response.setHeader('Server-Timing', 'custom');
      exchange.response.send('ok').end();

      const headers = serverResponse._calls.writeHead[0]?.headers ?? {};

      assert.strictEqual(headers['server-timing'], 'custom');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // abort()
  // ───────────────────────────────────────────────────────────────────────────
  test('abort()', async sub => {
    await sub.test('should mark the signal as aborted', () => {
      const { exchange } = makeExchange();

      exchange.abort();

      assert.strictEqual(exchange.signal.aborted, true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // onCommitError
  // ───────────────────────────────────────────────────────────────────────────
  test('onCommitError', async sub => {
    await sub.test('should be invoked when the response fails to commit', () => {
      /** @type {CapturedCommitErrorState} */
      const captured = { error: null, exchange: null, hasHeaderCalls: 0 };

      const { exchange } = makeExchange(
        {},
        {
          /**
           * Captures the commit error and the exchange.
           *
           * @param {Error} error - The commit error.
           * @param {Exchange} exc - The exchange where the error occurred.
           */
          onCommitError(error, exc) {
            captured.error = error;
            captured.exchange = exc;
          },
        },
      );

      exchange.response.hasHeader = () => {
        captured.hasHeaderCalls += 1;
        throw new Error('commit failed');
      };

      exchange.response.send('ok').end();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // wrapResponseBody
  // ───────────────────────────────────────────────────────────────────────────
  test('wrapResponseBody()', async sub => {
    await sub.test('should delegate to Response.wrapBody', () => {
      const { exchange } = makeExchange();
      exchange.response.send('hello');

      assert.doesNotThrow(() => wrapResponseBody(exchange.response, makeTransform()));
      assert.strictEqual(exchange.response.bodyKind, 'stream');
    });

    await sub.test('should throw when the response is not a Response instance', () => {
      assert.throws(() => wrapResponseBody(/** @type {any} */ ({}), makeTransform()), {
        name: 'TypeError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // discardResponseState
  // ───────────────────────────────────────────────────────────────────────────
  test('discardResponseState()', async sub => {
    await sub.test('should delegate to Response.discardUncommittedState', () => {
      const { exchange } = makeExchange();
      exchange.response.status(201).send('hello');

      discardResponseState(exchange.response);

      assert.strictEqual(exchange.response.statusCode, 200);
      assert.strictEqual(exchange.response.bodyKind, 'none');
    });

    await sub.test('should throw when the response is not a Response instance', () => {
      assert.throws(() => discardResponseState(/** @type {any} */ ({})), {
        name: 'TypeError',
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // createSnapshot()
  // ───────────────────────────────────────────────────────────────────────────
  test('createSnapshot()', async sub => {
    await sub.test('should throw when the exchange is not an Exchange instance', () => {
      assert.throws(
        () => Exchange.createSnapshot(/** @type {any} */ (null), 'pending', undefined, undefined),
        { name: 'TypeError' },
      );

      assert.throws(
        () => Exchange.createSnapshot(/** @type {any} */ ({}), 'pending', undefined, undefined),
        { name: 'TypeError' },
      );

      assert.throws(
        () =>
          Exchange.createSnapshot(
            /** @type {any} */ ('not-an-exchange'),
            'pending',
            undefined,
            undefined,
          ),
        { name: 'TypeError' },
      );
    });

    await sub.test('should produce a non-terminal snapshot when endedAt is undefined', () => {
      const { exchange } = makeExchange();

      const info = Exchange.createSnapshot(exchange, 'pending', undefined, undefined);

      assert.strictEqual(info.outcome, 'pending');
      assert.strictEqual(info.timing.endedAt, undefined);
      assert.strictEqual(info.timing.duration, undefined);
      assert.strictEqual(info.error, undefined);
    });

    await sub.test('should produce a terminal success snapshot with rounded duration', () => {
      const { exchange } = makeExchange();
      const endedAt = exchange.startedAt + 42.7;

      const info = Exchange.createSnapshot(exchange, 'success', endedAt, undefined);

      assert.strictEqual(info.outcome, 'success');
      assert.strictEqual(info.timing.endedAt, endedAt);
      assert.strictEqual(info.timing.duration, 43);
      assert.strictEqual(info.error, undefined);
    });

    await sub.test('should produce a terminal error snapshot with the given error', () => {
      const { exchange } = makeExchange();
      const error = new Error('boom');
      const endedAt = exchange.startedAt + 10;

      const info = Exchange.createSnapshot(exchange, 'error', endedAt, error);

      assert.strictEqual(info.outcome, 'error');
      assert.strictEqual(info.timing.duration, 10);
      assert.strictEqual(info.error, error);
    });

    await sub.test('should copy id, traceId, request, and response metadata', () => {
      const { exchange } = makeExchange({
        headers: { host: 'example.com', 'user-agent': 'test-agent' },
      });

      const info = Exchange.createSnapshot(exchange, 'success', exchange.startedAt + 1, undefined);

      assert.strictEqual(info.id, exchange.id);
      assert.strictEqual(info.traceId, exchange.traceId);
      assert.strictEqual(info.request.method, exchange.request.method);
      assert.strictEqual(info.request.pathname, exchange.request.pathname);
      assert.strictEqual(info.request.ip, exchange.request.ip);
      assert.strictEqual(info.request.userAgent, 'test-agent');
      assert.strictEqual(info.response.statusCode, exchange.response.statusCode);
    });

    await sub.test('should use the first value when user-agent is an array', () => {
      const { exchange } = makeExchange({
        headers: { host: 'example.com', 'user-agent': ['agent-1', 'agent-2'] },
      });

      const info = Exchange.createSnapshot(exchange, 'success', exchange.startedAt + 1, undefined);

      assert.strictEqual(info.request.userAgent, 'agent-1');
    });

    await sub.test('should expose undefined userAgent when the header is absent', () => {
      const { exchange } = makeExchange({
        headers: { host: 'example.com' },
      });

      const info = Exchange.createSnapshot(exchange, 'success', exchange.startedAt + 1, undefined);

      assert.strictEqual(info.request.userAgent, undefined);
    });

    await sub.test('should freeze the snapshot and its nested objects', () => {
      const { exchange } = makeExchange();

      const info = Exchange.createSnapshot(exchange, 'success', exchange.startedAt + 1, undefined);

      assert.strictEqual(Object.isFrozen(info), true);
      assert.strictEqual(Object.isFrozen(info.timing), true);
      assert.strictEqual(Object.isFrozen(info.request), true);
      assert.strictEqual(Object.isFrozen(info.response), true);
    });

    await sub.test('should throw when mutating a frozen snapshot field', () => {
      const { exchange } = makeExchange();

      const info = Exchange.createSnapshot(exchange, 'success', exchange.startedAt + 1, undefined);

      assert.throws(
        () => {
          /** @type {any} */ (info).outcome = 'mutated';
        },
        { name: 'TypeError' },
      );
    });
  });
});

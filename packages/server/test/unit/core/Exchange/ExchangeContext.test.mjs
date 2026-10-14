// @ts-check
/**
 * @file Contains the unit tests for ExchangeContext.
 *
 * @module test/unit/core/Exchange/ExchangeContext
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import ExchangeContext from '../../../../source/core/Exchange/ExchangeContext.mjs';
import Telemetry from '../../../../source/core/Exchange/Telemetry.mjs';

// ━━ CONSTANTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * A valid W3C traceparent header value.
 *
 * @type {string}
 */
const VALID_TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('ExchangeContext', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should generate id, traceId, and spanId', () => {
      const context = new ExchangeContext();

      assert.strictEqual(typeof context.id, 'string');
      assert.match(context.id, /^[0-9a-f-]{36}$/i);
      assert.strictEqual(typeof context.traceId, 'string');
      assert.match(context.traceId, /^[0-9a-f]{32}$/);
      assert.strictEqual(typeof context.spanId, 'string');
      assert.match(context.spanId, /^[0-9a-f]{16}$/);
    });

    await sub.test('should default trace flags to 01', () => {
      const context = new ExchangeContext();

      const traceparent = context.traceparent();
      const flags = traceparent.split('-')[3];

      assert.strictEqual(flags, '01');
    });

    await sub.test('should expose an AbortSignal', () => {
      const context = new ExchangeContext();

      assert.ok(context.signal instanceof AbortSignal);
      assert.strictEqual(context.signal.aborted, false);
    });

    await sub.test('should expose a Telemetry instance', () => {
      const context = new ExchangeContext();

      assert.ok(context.telemetry instanceof Telemetry);
    });

    await sub.test('should generate distinct ids across instances', () => {
      const a = new ExchangeContext();
      const b = new ExchangeContext();

      assert.notStrictEqual(a.id, b.id);
      assert.notStrictEqual(a.traceId, b.traceId);
      assert.notStrictEqual(a.spanId, b.spanId);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // traceparent extraction
  // ───────────────────────────────────────────────────────────────────────────
  test('traceparent extraction', async sub => {
    await sub.test('should parse a valid traceparent', () => {
      const context = new ExchangeContext({ traceparent: VALID_TRACEPARENT });

      assert.strictEqual(context.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');

      const flags = context.traceparent().split('-')[3];
      assert.strictEqual(flags, '01');
    });

    await sub.test('should always generate a new spanId', () => {
      const context = new ExchangeContext({ traceparent: VALID_TRACEPARENT });

      assert.notStrictEqual(context.spanId, '00f067aa0ba902b7');
      assert.match(context.spanId, /^[0-9a-f]{16}$/);
    });

    await sub.test('should ignore a traceparent with a different version', () => {
      const context = new ExchangeContext({
        traceparent: '01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      });

      assert.notStrictEqual(context.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    });

    await sub.test('should ignore an all-zero traceId', () => {
      const zeroTrace = '0'.repeat(32);

      const context = new ExchangeContext({
        traceparent: `00-${zeroTrace}-00f067aa0ba902b7-01`,
      });

      assert.notStrictEqual(context.traceId, zeroTrace);
    });

    await sub.test('should ignore a malformed traceparent', () => {
      const context = new ExchangeContext({ traceparent: 'not-a-traceparent' });

      assert.match(context.traceId, /^[0-9a-f]{32}$/);
      assert.notStrictEqual(context.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    });

    await sub.test('should ignore a non-string traceparent', () => {
      const context = new ExchangeContext({
        traceparent: /** @type {any} */ (42),
      });

      assert.match(context.traceId, /^[0-9a-f]{32}$/);
    });

    await sub.test('should normalize case to lowercase', () => {
      const context = new ExchangeContext({
        traceparent: VALID_TRACEPARENT.toUpperCase(),
      });

      assert.strictEqual(context.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // traceparent()
  // ───────────────────────────────────────────────────────────────────────────
  test('traceparent()', async sub => {
    await sub.test('should return the W3C format', () => {
      const context = new ExchangeContext();

      const parts = context.traceparent().split('-');

      assert.strictEqual(parts.length, 4);
      assert.strictEqual(parts[0], '00');
      assert.match(parts[1], /^[0-9a-f]{32}$/);
      assert.match(parts[2], /^[0-9a-f]{16}$/);
      assert.match(parts[3], /^[0-9a-f]{2}$/);
    });

    await sub.test('should preserve the incoming traceId', () => {
      const context = new ExchangeContext({ traceparent: VALID_TRACEPARENT });

      const parts = context.traceparent().split('-');

      assert.strictEqual(parts[1], '4bf92f3577b34da6a3ce929d0e0e4736');
    });

    await sub.test('should preserve the incoming trace flags', () => {
      const context = new ExchangeContext({
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      });

      const parts = context.traceparent().split('-');

      assert.strictEqual(parts[3], '00');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // abort()
  // ───────────────────────────────────────────────────────────────────────────
  test('abort()', async sub => {
    await sub.test('should mark the signal as aborted', () => {
      const context = new ExchangeContext();

      context.abort();

      assert.strictEqual(context.signal.aborted, true);
    });

    await sub.test('should emit the abort event', async () => {
      const context = new ExchangeContext();

      await new Promise(resolve => {
        context.signal.addEventListener('abort', resolve, { once: true });
        context.abort();
      });

      assert.strictEqual(context.signal.aborted, true);
    });

    await sub.test('should be idempotent', () => {
      const context = new ExchangeContext();

      context.abort();
      assert.doesNotThrow(() => context.abort());
    });
  });
});

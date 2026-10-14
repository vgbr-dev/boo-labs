// @ts-check
/**
 * @file Contains the unit tests for Http2Adapter.
 *
 * @module test/unit/infrastructure/adapters/Http2Adapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Http2Adapter from '#adapters/Http2Adapter';
import TransportAdapter from '#adapters/TransportAdapter';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Http2Adapter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should extend TransportAdapter', () => {
      const adapter = new Http2Adapter();

      assert.ok(adapter instanceof TransportAdapter);
    });

    await sub.test('should create the adapter without options', () => {
      assert.doesNotThrow(() => new Http2Adapter());
    });

    await sub.test('should create the adapter with options', () => {
      assert.doesNotThrow(
        () =>
          new Http2Adapter({
            settings: { enablePush: false },
          }),
      );
    });

    await sub.test('should accept an empty options object', () => {
      assert.doesNotThrow(() => new Http2Adapter({}));
    });

    await sub.test('should expose the https protocol', () => {
      const adapter = new Http2Adapter();

      assert.strictEqual(adapter.protocol, 'https');
    });

    await sub.test('should expose the h2 transport', () => {
      const adapter = new Http2Adapter();

      assert.strictEqual(adapter.transport, 'h2');
    });

    await sub.test('should not be listening before listen()', () => {
      const adapter = new Http2Adapter();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should not return an endpoint before listen()', () => {
      const adapter = new Http2Adapter();

      assert.strictEqual(adapter.endpoint(), null);
    });

    await sub.test('should not return an address before listen()', () => {
      const adapter = new Http2Adapter();

      assert.strictEqual(adapter.address(), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket handling
  // ───────────────────────────────────────────────────────────────────────────
  test('WebSocket handling', async sub => {
    await sub.test('should register a WebSocket handler without throwing', () => {
      const adapter = new Http2Adapter();

      assert.doesNotThrow(() => {
        adapter.onWebSocket(() => {});
      });
    });
  });
});

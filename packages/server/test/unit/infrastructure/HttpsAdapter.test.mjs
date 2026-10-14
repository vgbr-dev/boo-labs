// @ts-check
/**
 * @file Contains the unit tests for HttpsAdapter.
 *
 * @module test/unit/infrastructure/adapters/HttpsAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import HttpsAdapter from '#adapters/HttpsAdapter';
import TransportAdapter from '#adapters/TransportAdapter';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('HttpsAdapter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should extend TransportAdapter', () => {
      const adapter = new HttpsAdapter();

      assert.ok(adapter instanceof TransportAdapter);
    });

    await sub.test('should create the adapter without options', () => {
      assert.doesNotThrow(() => new HttpsAdapter());
    });

    await sub.test('should create the adapter with options', () => {
      assert.doesNotThrow(
        () =>
          new HttpsAdapter({
            keepAliveTimeout: 65_000,
          }),
      );
    });

    await sub.test('should accept an empty options object', () => {
      assert.doesNotThrow(() => new HttpsAdapter({}));
    });

    await sub.test('should expose the https protocol', () => {
      const adapter = new HttpsAdapter();

      assert.strictEqual(adapter.protocol, 'https');
    });

    await sub.test('should expose the h1s transport', () => {
      const adapter = new HttpsAdapter();

      assert.strictEqual(adapter.transport, 'h1s');
    });

    await sub.test('should not be listening before listen()', () => {
      const adapter = new HttpsAdapter();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should not return an endpoint before listen()', () => {
      const adapter = new HttpsAdapter();

      assert.strictEqual(adapter.endpoint(), null);
    });

    await sub.test('should not return an address before listen()', () => {
      const adapter = new HttpsAdapter();

      assert.strictEqual(adapter.address(), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket handling
  // ───────────────────────────────────────────────────────────────────────────
  test('WebSocket handling', async sub => {
    await sub.test('should register a WebSocket handler without throwing', () => {
      const adapter = new HttpsAdapter();

      assert.doesNotThrow(() => {
        adapter.onWebSocket(() => {});
      });
    });
  });
});

// @ts-check
/**
 * @file Contains the unit tests for Http2CleartextAdapter.
 *
 * @module test/unit/infrastructure/adapters/Http2CleartextAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Http2CleartextAdapter from '#adapters/Http2CleartextAdapter';
import TransportAdapter from '#adapters/TransportAdapter';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Http2CleartextAdapter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should extend TransportAdapter', () => {
      const adapter = new Http2CleartextAdapter();

      assert.ok(adapter instanceof TransportAdapter);
    });

    await sub.test('should create the adapter without options', () => {
      assert.doesNotThrow(() => new Http2CleartextAdapter());
    });

    await sub.test('should create the adapter with options', () => {
      assert.doesNotThrow(
        () =>
          new Http2CleartextAdapter({
            settings: { enablePush: false },
          }),
      );
    });

    await sub.test('should accept an empty options object', () => {
      assert.doesNotThrow(() => new Http2CleartextAdapter({}));
    });

    await sub.test('should expose the http protocol', () => {
      const adapter = new Http2CleartextAdapter();

      assert.strictEqual(adapter.protocol, 'http');
    });

    await sub.test('should expose the h2c transport', () => {
      const adapter = new Http2CleartextAdapter();

      assert.strictEqual(adapter.transport, 'h2c');
    });

    await sub.test('should not be listening before listen()', () => {
      const adapter = new Http2CleartextAdapter();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should not return an endpoint before listen()', () => {
      const adapter = new Http2CleartextAdapter();

      assert.strictEqual(adapter.endpoint(), null);
    });

    await sub.test('should not return an address before listen()', () => {
      const adapter = new Http2CleartextAdapter();

      assert.strictEqual(adapter.address(), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Lifecycle', async sub => {
    await sub.test('should listen on an ephemeral port', async () => {
      const adapter = new Http2CleartextAdapter();

      try {
        await adapter.listen({ host: '127.0.0.1', port: 0 });

        assert.strictEqual(adapter.listening, true);

        const address = adapter.address();

        assert.ok(address);
        assert.ok(address.port > 0);
      } finally {
        await adapter.close();
      }
    });

    await sub.test('should invoke the onListen handler when listening', async () => {
      const adapter = new Http2CleartextAdapter();

      /** @type {boolean} */
      let invoked = false;

      try {
        await adapter.listen({ host: '127.0.0.1', port: 0 }, () => {
          invoked = true;
        });

        assert.strictEqual(invoked, true);
      } finally {
        await adapter.close();
      }
    });

    await sub.test('should expose the endpoint after listen()', async () => {
      const adapter = new Http2CleartextAdapter();

      try {
        await adapter.listen({ host: '127.0.0.1', port: 0 });

        const endpoint = adapter.endpoint();

        assert.ok(endpoint);
        assert.strictEqual(typeof endpoint.displayUrl, 'string');
      } finally {
        await adapter.close();
      }
    });

    await sub.test('should close cleanly', async () => {
      const adapter = new Http2CleartextAdapter();

      await adapter.listen({ host: '127.0.0.1', port: 0 });
      await adapter.close();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should invoke the onClose handler when closed', async () => {
      const adapter = new Http2CleartextAdapter();

      /** @type {boolean} */
      let invoked = false;

      await adapter.listen({ host: '127.0.0.1', port: 0 });
      await adapter.close(() => {
        invoked = true;
      });

      assert.strictEqual(invoked, true);
    });

    await sub.test('should reject when the port is already in use', async () => {
      const first = new Http2CleartextAdapter();
      const second = new Http2CleartextAdapter();

      try {
        await first.listen({ host: '127.0.0.1', port: 0 });

        const address = first.address();

        assert.ok(address);

        await assert.rejects(() => second.listen({ host: '127.0.0.1', port: address.port }));
      } finally {
        await second.close().catch(() => {});
        await first.close();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // WebSocket handling
  // ───────────────────────────────────────────────────────────────────────────
  test('WebSocket handling', async sub => {
    await sub.test('should register a WebSocket handler without throwing', () => {
      const adapter = new Http2CleartextAdapter();

      assert.doesNotThrow(() => {
        adapter.onWebSocket(() => {});
      });
    });
  });
});

// @ts-check
/**
 * @file Contains the unit tests for HttpAdapter.
 *
 * @module test/unit/infrastructure/adapters/HttpAdapter
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import HttpAdapter from '#adapters/HttpAdapter';
import TransportAdapter from '#adapters/TransportAdapter';

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('HttpAdapter', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should extend TransportAdapter', () => {
      const adapter = new HttpAdapter();

      assert.ok(adapter instanceof TransportAdapter);
    });

    await sub.test('should create the adapter without options', () => {
      assert.doesNotThrow(() => new HttpAdapter());
    });

    await sub.test('should create the adapter with options', () => {
      assert.doesNotThrow(
        () =>
          new HttpAdapter({
            keepAliveTimeout: 65_000,
          }),
      );
    });

    await sub.test('should accept an empty options object', () => {
      assert.doesNotThrow(() => new HttpAdapter({}));
    });

    await sub.test('should expose the http protocol', () => {
      const adapter = new HttpAdapter();

      assert.strictEqual(adapter.protocol, 'http');
    });

    await sub.test('should expose the h1 transport', () => {
      const adapter = new HttpAdapter();

      assert.strictEqual(adapter.transport, 'h1');
    });

    await sub.test('should not be listening before listen()', () => {
      const adapter = new HttpAdapter();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should not return an endpoint before listen()', () => {
      const adapter = new HttpAdapter();

      assert.strictEqual(adapter.endpoint(), null);
    });

    await sub.test('should not return an address before listen()', () => {
      const adapter = new HttpAdapter();

      assert.strictEqual(adapter.address(), null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  test('Lifecycle', async sub => {
    await sub.test('should listen on an ephemeral port', async () => {
      const adapter = new HttpAdapter();

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

    await sub.test('should expose the endpoint after listen()', async () => {
      const adapter = new HttpAdapter();

      try {
        await adapter.listen({ host: '127.0.0.1', port: 0 });

        const endpoint = adapter.endpoint();

        assert.ok(endpoint);
      } finally {
        await adapter.close();
      }
    });

    await sub.test('should close cleanly', async () => {
      const adapter = new HttpAdapter();

      await adapter.listen({ host: '127.0.0.1', port: 0 });
      await adapter.close();

      assert.strictEqual(adapter.listening, false);
    });

    await sub.test('should reject when the port is already in use', async () => {
      const first = new HttpAdapter();
      const second = new HttpAdapter();

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
  // Request handling
  // ───────────────────────────────────────────────────────────────────────────
  test('Request handling', async sub => {
    await sub.test('should register a request handler', async () => {
      const adapter = new HttpAdapter();

      assert.doesNotThrow(() =>
        adapter.onRequest((_req, res) => {
          res.statusCode = 200;
          res.end();
        }),
      );
    });

    await sub.test('should dispatch an incoming request', async () => {
      const adapter = new HttpAdapter();
      let handled = false;

      adapter.onRequest((_req, res) => {
        handled = true;
        res.statusCode = 200;
        res.end('ok');
      });

      try {
        await adapter.listen({ host: '127.0.0.1', port: 0 });

        const endpoint = adapter.endpoint();

        assert.ok(endpoint);

        const response = await fetch(`${endpoint}/`);

        assert.strictEqual(response.status, 200);
        assert.strictEqual(handled, true);
      } finally {
        await adapter.close();
      }
    });
  });
});

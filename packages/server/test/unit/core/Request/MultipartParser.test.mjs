// @ts-check
/**
 * @file Contains the unit tests for MultipartParser.
 *
 * @module test/unit/core/Request/MultipartParser
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import MultipartParser from '../../../../source/core/Request/BodyParser/MultipartParser.mjs';
import { createMockIncomingMessage } from '../../../helpers/createMockIncomingMessage.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents a single part used to build a multipart body.
 *
 * @typedef  {object}                 MultipartPart
 * @property {Record<string, string>} headers       - Part headers (Content-Disposition, Content-Type, etc.).
 * @property {string}                 content       - Raw part content.
 */

/**
 * Represents the input shape accepted by `makeParser`.
 *
 * @typedef {Parameters<typeof createMockIncomingMessage>[0]} MockIncomingMessageOptions
 */

// ━━ TEST HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Builds a multipart body from an array of parts.
 *
 * @param {string} boundary - Multipart boundary string.
 * @param {MultipartPart[]} parts - Parts to include in the body.
 * @returns {string} The assembled multipart body.
 */
function buildMultipartBody(boundary, parts) {
  const lines = [];

  for (const part of parts) {
    lines.push(`--${boundary}`);

    for (const [name, value] of Object.entries(part.headers)) {
      lines.push(`${name}: ${value}`);
    }

    lines.push('');
    lines.push(part.content);
  }

  lines.push(`--${boundary}--`);

  return lines.join('\r\n');
}

/**
 * Creates a MultipartParser bound to a mock incoming message.
 *
 * @param {string} body - Raw multipart body.
 * @param {string} boundary - Multipart boundary string.
 * @param {number} [bodyLimit] - Maximum body size in bytes. Defaults to 10 MiB.
 * @returns {MultipartParser} A parser bound to the mock message.
 */
function makeParser(body, boundary, bodyLimit = 10 * 1024 * 1024) {
  const message = createMockIncomingMessage({
    headers: {
      'content-length': String(Buffer.byteLength(body)),
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  return new MultipartParser(/** @type {any} */ (message), bodyLimit);
}

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('MultipartParser', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Boundary extraction
  // ───────────────────────────────────────────────────────────────────────────
  test('Boundary extraction', async sub => {
    await sub.test('should reject when no boundary is present', async () => {
      const message = createMockIncomingMessage({
        headers: {
          'content-type': 'multipart/form-data',
          'content-length': '10',
        },
        body: 'x'.repeat(10),
      });

      const parser = new MultipartParser(/** @type {any} */ (message), 1024);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject an invalid boundary', async () => {
      // '@' no está permitido por el patrón RFC 2046 del parser.
      const boundary = 'invalid@boundary';
      const body = buildMultipartBody(boundary, [
        { headers: { 'Content-Disposition': 'form-data; name="field"' }, content: 'value' },
      ]);

      const parser = makeParser(body, boundary);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should accept a quoted boundary', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        { headers: { 'Content-Disposition': 'form-data; name="field"' }, content: 'value' },
      ]);

      const message = createMockIncomingMessage({
        headers: {
          'content-length': String(Buffer.byteLength(body)),
          'content-type': `multipart/form-data; boundary="${boundary}"`,
        },
        body,
      });

      const parser = new MultipartParser(/** @type {any} */ (message), 10 * 1024 * 1024);

      assert.doesNotThrow(() => parser.parse());
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Payload parsing
  // ───────────────────────────────────────────────────────────────────────────
  test('Payload parsing', async sub => {
    await sub.test('should parse an empty multipart body', async () => {
      const boundary = 'simple-boundary';
      const body = `--${boundary}--`;
      const parser = makeParser(body, boundary);

      const formData = await parser.parse();

      assert.deepStrictEqual([...formData.keys()], []);
    });

    await sub.test('should parse a single text field', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        {
          headers: { 'Content-Disposition': 'form-data; name="username"' },
          content: 'john',
        },
      ]);
      const parser = makeParser(body, boundary);

      const formData = await parser.parse();

      assert.strictEqual(formData.get('username'), 'john');
    });

    await sub.test('should parse multiple text fields', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        { headers: { 'Content-Disposition': 'form-data; name="a"' }, content: '1' },
        { headers: { 'Content-Disposition': 'form-data; name="b"' }, content: '2' },
      ]);
      const parser = makeParser(body, boundary);

      const formData = await parser.parse();

      assert.strictEqual(formData.get('a'), '1');
      assert.strictEqual(formData.get('b'), '2');
    });

    await sub.test('should parse a file upload', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        {
          headers: {
            'Content-Disposition': 'form-data; name="avatar"; filename="pic.png"',
            'Content-Type': 'image/png',
          },
          content: 'fake-png-bytes',
        },
      ]);
      const parser = makeParser(body, boundary);

      const formData = await parser.parse();
      const file = formData.get('avatar');

      assert.ok(file instanceof File);
      assert.strictEqual(file.name, 'pic.png');
      assert.strictEqual(file.type, 'image/png');
    });

    await sub.test('should parse filename* with UTF-8 encoding', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        {
          headers: {
            'Content-Disposition': `form-data; name="file"; filename*=UTF-8''caf%C3%A9.txt`,
          },
          content: 'content',
        },
      ]);
      const parser = makeParser(body, boundary);

      const formData = await parser.parse();
      const file = /** @type {File} */ (formData.get('file'));

      assert.strictEqual(file.name, 'café.txt');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Malformed payloads
  // ───────────────────────────────────────────────────────────────────────────
  test('Malformed payloads', async sub => {
    await sub.test('should reject when the part lacks Content-Disposition', async () => {
      const boundary = 'simple-boundary';
      const body = `--${boundary}\r\nContent-Type: text/plain\r\n\r\nvalue\r\n--${boundary}--`;
      const parser = makeParser(body, boundary);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject a non-form-data disposition', async () => {
      const boundary = 'simple-boundary';
      const body = `--${boundary}\r\nContent-Disposition: attachment; name="x"\r\n\r\nvalue\r\n--${boundary}--`;
      const parser = makeParser(body, boundary);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject a part without a name', async () => {
      const boundary = 'simple-boundary';
      const body = `--${boundary}\r\nContent-Disposition: form-data\r\n\r\nvalue\r\n--${boundary}--`;
      const parser = makeParser(body, boundary);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject a filename* with a non-UTF-8 charset', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        {
          headers: {
            'Content-Disposition': `form-data; name="file"; filename*=ISO-8859-1''caf%E9.txt`,
          },
          content: 'content',
        },
      ]);
      const parser = makeParser(body, boundary);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_PARSE_FAILED',
      });
    });

    await sub.test('should reject when the body exceeds the limit', async () => {
      const boundary = 'simple-boundary';
      const body = buildMultipartBody(boundary, [
        {
          headers: { 'Content-Disposition': 'form-data; name="a"' },
          content: 'x'.repeat(200),
        },
      ]);
      const parser = makeParser(body, boundary, 10);

      await assert.rejects(() => parser.parse(), {
        name: 'RequestError',
        code: 'BODY_LIMIT_EXCEEDED',
      });
    });
  });
});

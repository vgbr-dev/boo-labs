// @ts-check
/**
 * @file Contains the unit tests for Telemetry.
 *
 * @module test/unit/core/Exchange/Telemetry
 */

// ━━ IMPORT MODULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// » IMPORT NATIVE NODE MODULES
import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// » IMPORT LOCAL MODULES
import Telemetry from '../../../../source/core/Exchange/Telemetry.mjs';

// ━━ TYPE DEFINITIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Represents the telemetry data collected during an exchange.
 *
 * @typedef {import('../../../../source/core/Exchange/Telemetry.mjs').TelemetryData} TelemetryData
 */

// ━━ TESTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
suite('Telemetry', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // Construction
  // ───────────────────────────────────────────────────────────────────────────
  test('Construction', async sub => {
    await sub.test('should record serverReceivedAt and processStartAt', () => {
      const before = Date.now();
      const telemetry = new Telemetry();
      const after = Date.now();

      const data = telemetry.toObject();

      assert.ok(data.serverReceivedAt >= before && data.serverReceivedAt <= after);
      assert.strictEqual(typeof data.processStartAt, 'number');
      assert.ok(data.processStartAt >= 0);
    });

    await sub.test('should initialize processDuration and serverSentAt as null', () => {
      const telemetry = new Telemetry();

      const data = telemetry.toObject();

      assert.strictEqual(data.processDuration, null);
      assert.strictEqual(data.serverSentAt, null);
    });

    await sub.test('should expose the class name as Symbol.toStringTag', () => {
      const telemetry = new Telemetry();

      assert.strictEqual(telemetry[Symbol.toStringTag], 'Telemetry');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // markProcessDuration()
  // ───────────────────────────────────────────────────────────────────────────
  test('markProcessDuration()', async sub => {
    await sub.test('should set processDuration', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();

      /** @type {TelemetryData} */
      const data = telemetry.toObject();

      assert.strictEqual(typeof data.processDuration, 'number');
      assert.ok(typeof data.processDuration === 'number' && data.processDuration >= 0);
    });

    await sub.test('should be idempotent', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();
      const first = telemetry.toObject().processDuration;

      telemetry.markProcessDuration();
      const second = telemetry.toObject().processDuration;

      assert.strictEqual(first, second);
    });

    await sub.test('should return the instance', () => {
      const telemetry = new Telemetry();

      assert.strictEqual(telemetry.markProcessDuration(), telemetry);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // markServerSentAt()
  // ───────────────────────────────────────────────────────────────────────────
  test('markServerSentAt()', async sub => {
    await sub.test('should set serverSentAt', () => {
      const telemetry = new Telemetry();
      const before = Date.now();

      telemetry.markServerSentAt();

      const after = Date.now();
      const data = telemetry.toObject();

      assert.ok(
        typeof data.serverSentAt === 'number' &&
          data.serverSentAt >= before &&
          data.serverSentAt <= after,
      );
    });

    await sub.test('should be idempotent', () => {
      const telemetry = new Telemetry();

      telemetry.markServerSentAt();
      const first = telemetry.toObject().serverSentAt;

      telemetry.markServerSentAt();
      const second = telemetry.toObject().serverSentAt;

      assert.strictEqual(first, second);
    });

    await sub.test('should return the instance', () => {
      const telemetry = new Telemetry();

      assert.strictEqual(telemetry.markServerSentAt(), telemetry);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // toObject() / toJSON()
  // ───────────────────────────────────────────────────────────────────────────
  test('toObject() and toJSON()', async sub => {
    await sub.test('toObject() should return a snapshot with the four fields', () => {
      const telemetry = new Telemetry();

      const data = telemetry.toObject();

      assert.deepStrictEqual(Object.keys(data).sort(), [
        'processDuration',
        'processStartAt',
        'serverReceivedAt',
        'serverSentAt',
      ]);
    });

    await sub.test('toObject() should reflect the current state', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();
      telemetry.markServerSentAt();

      const data = telemetry.toObject();

      assert.strictEqual(typeof data.processDuration, 'number');
      assert.strictEqual(typeof data.serverSentAt, 'number');
    });

    await sub.test('toJSON() should match toObject()', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();
      telemetry.markServerSentAt();

      assert.deepStrictEqual(telemetry.toJSON(), telemetry.toObject());
    });

    await sub.test('JSON.stringify should use toJSON()', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();

      const parsed = JSON.parse(JSON.stringify(telemetry));

      assert.strictEqual(typeof parsed.processDuration, 'number');
      assert.strictEqual(typeof parsed.serverReceivedAt, 'number');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // entries()
  // ───────────────────────────────────────────────────────────────────────────
  test('entries()', async sub => {
    await sub.test('should always include the received marker', () => {
      const telemetry = new Telemetry();

      const entries = telemetry.entries();

      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0][0], 'Server-Timing');
      assert.ok(entries[0][1].includes('received;desc="Received"'));
    });

    await sub.test('should omit processing when no duration has been recorded', () => {
      const telemetry = new Telemetry();

      const [, value] = telemetry.entries()[0];

      assert.strictEqual(value.includes('processing'), false);
    });

    await sub.test('should include processing when a duration has been recorded', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();

      const [, value] = telemetry.entries()[0];

      assert.ok(value.includes('processing;dur='));
      assert.ok(value.includes(';desc="Processing"'));
    });

    await sub.test('should omit sent when no timestamp has been recorded', () => {
      const telemetry = new Telemetry();

      const [, value] = telemetry.entries()[0];

      assert.strictEqual(value.includes('sent'), false);
    });

    await sub.test('should include sent when a timestamp has been recorded', () => {
      const telemetry = new Telemetry();

      telemetry.markServerSentAt();

      const [, value] = telemetry.entries()[0];

      assert.ok(value.includes('sent;desc="Sent"'));
    });

    await sub.test('should return a single header entry', () => {
      const telemetry = new Telemetry();

      telemetry.markProcessDuration();
      telemetry.markServerSentAt();

      const entries = telemetry.entries();

      assert.strictEqual(entries.length, 1);
      assert.strictEqual(entries[0].length, 2);
    });
  });
});

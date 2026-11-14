import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasurementCsv, toMeasurementCsv } from "../src/lib/csv.js";

const header = "date,left_step_time,right_step_time,walking_speed,balance_score";

test("parses a standard measurement file", () => {
  const rows = parseMeasurementCsv(`${header}\nSample 01,0.60,0.62,0.78,76`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].walking_speed, 0.78);
});

test("supports quoted commas and escaped quotes in dates", () => {
  const rows = parseMeasurementCsv(`${header}\n"Session, \"\"A\"\"",0.60,0.62,0.78,76`);
  assert.equal(rows[0].date, 'Session, "A"');
});

test("supports CRLF and blank lines", () => {
  const rows = parseMeasurementCsv(`${header}\r\nSample 01,0.60,0.62,0.78,76\r\n\r\nSample 02,0.59,0.61,0.83,78\r\n`);
  assert.equal(rows.length, 2);
});

test("rejects missing columns", () => {
  assert.throws(() => parseMeasurementCsv("date,left_step_time\nSample,0.6"), /Missing columns/);
});

test("rejects invalid numeric measurements", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,unknown,0.62,0.78,76`), /must be a valid number/);
});

test("rejects non-positive step durations and negative speed", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0,0.62,0.78,76`), /step times must be positive/);
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0.6,0.62,-0.1,76`), /walking speed cannot be negative/);
});

test("rejects an unclosed quoted field", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\n"Sample,0.6,0.62,0.78,76`), /quoted field was not closed/);
});

test("exports and re-imports measurement rows", () => {
  const source = [{ date: "Session, A", left_step_time: 0.6, right_step_time: 0.62, walking_speed: 0.78, balance_score: 76 }];
  assert.deepEqual(parseMeasurementCsv(toMeasurementCsv(source)), source);
});

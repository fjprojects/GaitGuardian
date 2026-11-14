import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasurementCsv, toMeasurementCsv } from "../src/lib/csv.js";
import { filterAndSortMeasurements, summarizeMeasurements } from "../src/lib/analysis.js";

const header = "date,left_step_time,right_step_time,walking_speed,balance_score";
const sampleRows = [
  { date: "Sample 01", left_step_time: 0.6, right_step_time: 0.62, walking_speed: 0.78, balance_score: 76 },
  { date: "Sample 02", left_step_time: 0.59, right_step_time: 0.61, walking_speed: 0.83, balance_score: 78 },
  { date: "Sample 03", left_step_time: 0.58, right_step_time: 0.6, walking_speed: 1.02, balance_score: 83 },
];

test("parses a standard measurement file", () => {
  const rows = parseMeasurementCsv(`${header}\nSample 01,0.60,0.62,0.78,76`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].walking_speed, 0.78);
});

test("supports quoted commas and escaped quotes in dates", () => {
  const rows = parseMeasurementCsv(`${header}\n"Session, ""A""",0.60,0.62,0.78,76`);
  assert.equal(rows[0].date, 'Session, "A"');
});

test("supports CRLF, blank lines and whitespace after a closing quote", () => {
  const rows = parseMeasurementCsv(`${header}\r\n"Sample 01"  ,0.60,0.62,0.78,76\r\n\r\nSample 02,0.59,0.61,0.83,78\r\n`);
  assert.equal(rows.length, 2);
});

test("rejects missing columns", () => {
  assert.throws(() => parseMeasurementCsv("date,left_step_time\nSample,0.6"), /Missing columns/);
});

test("rejects duplicate columns", () => {
  assert.throws(() => parseMeasurementCsv("date,left_step_time,left_step_time,right_step_time,walking_speed,balance_score\nSample,0.6,0.6,0.62,0.78,76"), /Duplicate column names/);
});

test("rejects rows with missing or extra columns", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0.6,0.62,0.78`), /expected 5 columns but found 4/);
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0.6,0.62,0.78,76,extra`), /expected 5 columns but found 6/);
});

test("rejects invalid numeric measurements", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,unknown,0.62,0.78,76`), /must be a valid number/);
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0.6,0.62,Infinity,76`), /must be a valid number/);
});

test("rejects non-positive step durations and negative speed", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0,0.62,0.78,76`), /step times must be positive/);
  assert.throws(() => parseMeasurementCsv(`${header}\nSample,0.6,0.62,-0.1,76`), /walking speed cannot be negative/);
});

test("rejects an unclosed quoted field and text after a closing quote", () => {
  assert.throws(() => parseMeasurementCsv(`${header}\n"Sample,0.6,0.62,0.78,76`), /quoted field was not closed/);
  assert.throws(() => parseMeasurementCsv(`${header}\n"Sample"x,0.6,0.62,0.78,76`), /unexpected characters after a quoted field/);
});

test("exports and re-imports measurement rows", () => {
  const source = [{ date: "Session, A", left_step_time: 0.6, right_step_time: 0.62, walking_speed: 0.78, balance_score: 76 }];
  assert.deepEqual(parseMeasurementCsv(toMeasurementCsv(source)), source);
});

test("filters by sample label and inclusive walking-speed range", () => {
  assert.deepEqual(
    filterAndSortMeasurements(sampleRows, { query: "SAMPLE", minWalkingSpeed: "0.8", maxWalkingSpeed: "1.02" }).map((row) => row.date),
    ["Sample 02", "Sample 03"],
  );
});

test("sorts numeric measurements without mutating the source", () => {
  const copy = [...sampleRows];
  assert.deepEqual(filterAndSortMeasurements(sampleRows, { sort: "walking_speed", order: "desc" }).map((row) => row.date), ["Sample 03", "Sample 02", "Sample 01"]);
  assert.deepEqual(sampleRows, copy);
});

test("invalid and inverted speed ranges return no matching records", () => {
  assert.deepEqual(filterAndSortMeasurements(sampleRows, { minWalkingSpeed: "fast" }), []);
  assert.deepEqual(filterAndSortMeasurements(sampleRows, { minWalkingSpeed: "1.1", maxWalkingSpeed: "0.8" }), []);
});

test("summarizes measurements using descriptive min, max and mean only", () => {
  const summary = summarizeMeasurements(sampleRows);
  assert.equal(summary.measurement_count, 3);
  assert.deepEqual(summary.statistics.walking_speed, { minimum: 0.78, maximum: 1.02, average: 0.877 });
  assert.deepEqual(summary.statistics.balance_score, { minimum: 76, maximum: 83, average: 79 });
});

test("summaries remain well-defined for empty datasets", () => {
  const summary = summarizeMeasurements([]);
  assert.equal(summary.measurement_count, 0);
  assert.deepEqual(summary.statistics.walking_speed, { minimum: null, maximum: null, average: null });
});

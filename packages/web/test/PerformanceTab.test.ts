import assert from "node:assert/strict";
import test from "node:test";
import { fmtMetric } from "../src/PerformanceTab.js";

test("fmtMetric renders missing metrics without throwing", () => {
  assert.equal(fmtMetric(undefined, 1, " ms"), "—");
  assert.equal(fmtMetric(null, 1, " ms"), "—");
  assert.equal(fmtMetric(Number.NaN, 1, " ms"), "—");
});

test("fmtMetric formats finite metrics", () => {
  assert.equal(fmtMetric(16.666, 1, " ms"), "16.7 ms");
  assert.equal(fmtMetric(60, 0), "60");
});
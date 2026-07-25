import assert from "node:assert/strict";
import test from "node:test";
import { EARLY_ACCESS_FEATURES } from "@palserver/shared";
import { compatibilityLicenseStatus, type LicenseCache } from "./license.js";

const allFeatures = EARLY_ACCESS_FEATURES.map((feature) => feature.id);
const checkedAt = "2026-01-01T00:00:00.000Z";

function cache(patch: Partial<LicenseCache>): LicenseCache {
  return {
    valid: false,
    tier: null,
    features: [],
    expiresAt: null,
    reason: null,
    checkedAt,
    ...patch,
  };
}

test("missing license remains metadata and exposes every feature", () => {
  const status = compatibilityLicenseStatus(false, null, "12345678-machine");
  assert.equal(status.hasKey, false);
  assert.equal(status.valid, false);
  assert.deepEqual(status.features, allFeatures);
});

test("invalid license remains metadata and exposes every feature", () => {
  const status = compatibilityLicenseStatus(true, cache({ reason: "invalid" }), "12345678-machine");
  assert.equal(status.valid, false);
  assert.equal(status.reason, "invalid");
  assert.deepEqual(status.features, allFeatures);
});

test("expired license remains metadata and exposes every feature", () => {
  const status = compatibilityLicenseStatus(
    true,
    cache({ reason: "expired", expiresAt: "2025-12-31T00:00:00.000Z" }),
    "12345678-machine",
  );
  assert.equal(status.valid, false);
  assert.equal(status.reason, "expired");
  assert.deepEqual(status.features, allFeatures);
});

test("valid license metadata cannot narrow the available feature catalog", () => {
  const status = compatibilityLicenseStatus(
    true,
    cache({ valid: true, tier: "supporter", features: [allFeatures[0]], reason: null }),
    "12345678-machine",
  );
  assert.equal(status.valid, true);
  assert.equal(status.tier, "supporter");
  assert.deepEqual(status.features, allFeatures);
});
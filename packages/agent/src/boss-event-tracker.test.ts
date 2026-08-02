import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BossEventTracker } from "./boss-event-tracker.js";
import { onAgentEvent, type AgentEvent } from "./events.js";
import type { ServerDriver } from "./driver.js";
import type { InstanceRecord, InstanceStore } from "./store.js";

const boss = {
  name: "81_1_grass_FBOSS_4",
  alive: true as boolean | null,
  diedAt: -1,
  respawnedAt: -1,
  respawnInterval: -1,
  x: 100,
  y: 200,
  z: 300,
};

test("missing and malformed boss state emit no transition", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "palserver-boss-events-"));
  const statePath = path.join(root, "Pal", "Saved", "palserver-boss-state.json");
  const rec = { id: "wine-1", backend: "native", runtime: "wine", serverDir: root } as InstanceRecord;
  const store = {
    list: () => [rec],
    instanceDir: () => root,
  } as unknown as InstanceStore;
  const driver = {
    status: async () => ({ status: "running", runtimeId: "test" }),
  } as unknown as ServerDriver;
  const tracker = new BossEventTracker(store, () => driver, () => true);
  const events: AgentEvent[] = [];
  const off = onAgentEvent((event) => {
    if (event.type === "boss.killed" || event.type === "boss.respawn") events.push(event);
  });

  try {
    await tracker.reconcileNow();
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, "not json");
    await tracker.reconcileNow();
    assert.equal(events.length, 0);

    const state = {
      version: 1,
      generatedAt: 2_000_000_000,
      tick: 1,
      spawnerTotal: 1,
      bossCount: 1,
      aliveCount: 1,
      bosses: [boss],
    };
    fs.writeFileSync(statePath, JSON.stringify(state));
    await tracker.reconcileNow();
    assert.equal(events.length, 0);

    fs.writeFileSync(statePath, JSON.stringify({
      ...state,
      tick: 2,
      aliveCount: 0,
      bosses: [{ ...boss, alive: false, diedAt: 2_000_000_010 }],
    }));
    await tracker.reconcileNow();
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "boss.killed");
  } finally {
    off();
    tracker.stop();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
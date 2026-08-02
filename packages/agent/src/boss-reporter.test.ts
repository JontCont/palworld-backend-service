import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  bossReporterDependencies,
  fetchRemoteBossLua,
  getBossReporterStatus,
  installBossReporter,
  removeBossReporter,
  supportsBossReporter,
  versionFromReleaseUrl,
} from "./boss-reporter.js";
import type { DriverContext } from "./driver.js";
import { dockerRuntimeFiles } from "./runtime-files.js";
import type { InstanceRecord } from "./store.js";

test("parses the release tag from a main.lua asset URL", () => {
  assert.equal(
    versionFromReleaseUrl(
      "https://github.com/io-software-ai/palserver-boss-reporter/releases/download/v1.6/main.lua",
    ),
    "1.6",
  );
});

test("downloads main.lua through latest/download without using the GitHub API", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/releases/latest/download/main.lua")) {
      assert.equal(init?.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://github.com/io-software-ai/palserver-boss-reporter/releases/download/1.6/main.lua",
        },
      });
    }
    if (url.endsWith("/releases/download/1.6/main.lua")) {
      return new Response("-- PalserverBossReporter\nreturn {}", { status: 200 });
    }
    throw new Error(`unexpected request: ${url}`);
  };

  try {
    const result = await fetchRemoteBossLua();
    assert.equal(result?.version, "1.6");
    assert.match(result?.lua ?? "", /PalserverBossReporter/);
    assert.equal(calls.some((url) => url.includes("api.github.com")), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createWineInstall(withUe4ss: boolean): {
  root: string;
  rec: InstanceRecord;
  ctx: DriverContext;
} {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "palserver-boss-reporter-"));
  const win64 = path.join(root, "Pal", "Binaries", "Win64");
  fs.mkdirSync(path.join(win64, "ue4ss", "Mods"), { recursive: true });
  if (withUe4ss) fs.writeFileSync(path.join(win64, "ue4ss", "UE4SS.dll"), "loader");
  return {
    root,
    rec: { id: "wine-1", backend: "native", runtime: "wine", serverDir: root } as InstanceRecord,
    ctx: { instanceDir: root },
  };
}

test("installs idempotently and removes reporter artifacts while preserving UE4SS", async (context) => {
  const fixture = createWineInstall(true);
  const win64 = path.join(fixture.root, "Pal", "Binaries", "Win64");
  const mods = path.join(win64, "ue4ss", "Mods");
  const modDir = path.join(mods, "PalserverBossReporter");
  const marker = path.join(win64, ".palserver-boss-reporter.json");
  const state = path.join(fixture.root, "Pal", "Saved", "palserver-boss-state.json");
  context.mock.method(bossReporterDependencies, "fetchRemoteLua", async () => ({
    lua: "-- PalserverBossReporter\nreturn {}",
    version: "1.6",
  }));

  try {
    assert.deepEqual(await installBossReporter(fixture.rec, fixture.ctx), { version: "1.6" });
    assert.deepEqual(await installBossReporter(fixture.rec, fixture.ctx), { version: "1.6" });
    assert.equal(fs.readFileSync(path.join(modDir, "Scripts", "main.lua"), "utf8").includes("PalserverBossReporter"), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(marker, "utf8")), { version: "1.6" });
    const modsTxt = fs.readFileSync(path.join(mods, "mods.txt"), "utf8");
    assert.equal(modsTxt.split("\n").filter((line) => line.startsWith("PalserverBossReporter")).length, 1);

    fs.mkdirSync(path.dirname(state), { recursive: true });
    fs.writeFileSync(state, "{}");
    await removeBossReporter(fixture.rec, fixture.ctx);
    assert.equal(fs.existsSync(modDir), false);
    assert.equal(fs.existsSync(marker), false);
    assert.equal(fs.existsSync(state), false);
    assert.equal(fs.existsSync(path.join(win64, "ue4ss", "UE4SS.dll")), true);
    assert.equal(fs.readFileSync(path.join(mods, "mods.txt"), "utf8").includes("PalserverBossReporter"), false);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("does not write reporter marker when UE4SS dependency installation fails", async (context) => {
  const fixture = createWineInstall(false);
  const marker = path.join(fixture.root, "Pal", "Binaries", "Win64", ".palserver-boss-reporter.json");
  context.mock.method(bossReporterDependencies, "installComponent", async () => {
    throw new Error("archive upload failed");
  });

  try {
    await assert.rejects(installBossReporter(fixture.rec, fixture.ctx), /archive upload failed/);
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("does not write reporter marker when Lua delivery fails", async (context) => {
  const fixture = createWineInstall(true);
  const marker = path.join(fixture.root, "Pal", "Binaries", "Win64", ".palserver-boss-reporter.json");
  context.mock.method(bossReporterDependencies, "fetchRemoteLua", async () => null);

  try {
    await assert.rejects(
      installBossReporter(fixture.rec, fixture.ctx),
      (error: unknown) => error instanceof Error &&
        (error as Error & { statusCode?: number }).statusCode === 502,
    );
    assert.equal(fs.existsSync(marker), false);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("reporter eligibility follows the server binary runtime", () => {
  const records = [
    [{ backend: "docker", runtime: "wine" }, true, "Docker Wine"],
    [{ backend: "docker", runtime: "native" }, false, "Docker native Linux"],
    [{ backend: "k8s", runtime: "wine" }, true, "Kubernetes Wine"],
    [{ backend: "native", runtime: "native" }, process.platform === "win32", "native host"],
  ] as const;
  for (const [record, expected, label] of records) {
    assert.equal(supportsBossReporter(record as InstanceRecord), expected, label);
  }
});

test("Docker Wine status inspects the /palworld installation", async (context) => {
  const calls: string[][] = [];
  context.mock.method(
    dockerRuntimeFiles,
    "exec",
    async (_record: InstanceRecord, command: string[]) => {
      calls.push(command);
      const target = command.at(-1) ?? "";
      if (command[0] === "cat") throw new Error("missing state");
      if (target.endsWith("/Pal/Binaries/Win64")) return "";
      if (target.endsWith("/Pal/Binaries/Win64/ue4ss/Mods")) return "";
      if (target.endsWith("/Pal/Binaries/Win64/ue4ss/UE4SS.dll")) return "";
      throw new Error("missing path");
    },
  );
  const status = await getBossReporterStatus(
    { id: "wine-1", backend: "docker", runtime: "wine" } as InstanceRecord,
    { instanceDir: "unused" },
  );
  assert.equal(status.supported, true);
  assert.equal(status.ue4ss, true);
  assert.equal(calls.some((command) => command.includes("/palworld/Pal/Binaries/Win64")), true);
});

test("Docker native Linux status rejects before runtime filesystem access", async (context) => {
  let calls = 0;
  context.mock.method(dockerRuntimeFiles, "exec", async () => {
    calls += 1;
    return "";
  });
  const status = await getBossReporterStatus(
    { id: "linux-1", backend: "docker", runtime: "native" } as InstanceRecord,
    { instanceDir: "unused" },
  );
  assert.equal(status.supported, false);
  assert.match(status.reason ?? "", /Windows server binary/);
  assert.equal(calls, 0);
});

test("status exposes the spec example as fresh and marks older state stale", async (context) => {
  const fixture = createWineInstall(false);
  const statePath = path.join(fixture.root, "Pal", "Saved", "palserver-boss-state.json");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  context.mock.method(Date, "now", () => 2_000_000_030_000);
  const state = {
    version: 1,
    generatedAt: 2_000_000_000,
    tick: 1,
    spawnerTotal: 0,
    bossCount: 0,
    aliveCount: 0,
    bosses: [],
  };

  try {
    fs.writeFileSync(statePath, JSON.stringify(state));
    const fresh = await getBossReporterStatus(fixture.rec, fixture.ctx);
    assert.equal(fresh.supported, true);
    assert.equal(fresh.state?.generatedAt, 2_000_000_000);
    assert.equal(fresh.stale, false);

    fs.writeFileSync(statePath, JSON.stringify({ ...state, generatedAt: 1_999_999_900 }));
    const stale = await getBossReporterStatus(fixture.rec, fixture.ctx);
    assert.equal(stale.stale, true);

    fs.writeFileSync(statePath, "not json");
    const malformed = await getBossReporterStatus(fixture.rec, fixture.ctx);
    assert.equal(malformed.state, null);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

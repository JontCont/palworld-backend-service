import assert from "node:assert/strict";
import test from "node:test";
import type { DriverContext } from "./driver.js";
import {
  dockerRuntimeFiles,
  resolveDockerRuntimePath,
  runtimeExists,
  runtimeMkdir,
  runtimeReadText,
  runtimeRemove,
  runtimeWriteBytes,
} from "./runtime-files.js";
import type { InstanceRecord } from "./store.js";

const rec = { id: "wine-1", backend: "docker", runtime: "wine" } as InstanceRecord;
const ctx = { instanceDir: "unused-for-docker" } as DriverContext;

test("resolves Docker paths below /palworld and rejects escape paths", () => {
  assert.equal(
    resolveDockerRuntimePath("Pal/Saved/palserver-boss-state.json"),
    "/palworld/Pal/Saved/palserver-boss-state.json",
  );
  for (const value of ["", ".", "/etc/passwd", "../outside", "Pal/../outside", "C:/outside"]) {
    assert.throws(() => resolveDockerRuntimePath(value), /路徑不合法/);
  }
});

test("Docker text reads preserve exact content", async (context) => {
  const calls: string[][] = [];
  context.mock.method(dockerRuntimeFiles, "exec", async (_record: InstanceRecord, command: string[]) => {
    calls.push(command);
    return "{\"bosses\":[]}\n\n";
  });
  const text = await runtimeReadText(rec, ctx, "Pal/Saved/palserver-boss-state.json");
  assert.equal(text, "{\"bosses\":[]}\n\n");
  assert.deepEqual(calls, [["cat", "/palworld/Pal/Saved/palserver-boss-state.json"]]);
});

test("Docker exists distinguishes successful and failed test commands", async (context) => {
  context.mock.method(dockerRuntimeFiles, "exec", async () => "");
  assert.equal(await runtimeExists(rec, ctx, "Pal/Binaries/Win64", "d"), true);

  context.mock.restoreAll();
  context.mock.method(dockerRuntimeFiles, "exec", async () => {
    throw new Error("容器內命令失敗(exit 1):test");
  });
  assert.equal(await runtimeExists(rec, ctx, "Pal/Binaries/Win64/missing", "f"), false);
});

test("Docker exists preserves container-level conflict errors", async (context) => {
  context.mock.method(dockerRuntimeFiles, "exec", async () => {
    throw Object.assign(new Error("找不到容器"), { statusCode: 409 });
  });
  await assert.rejects(
    runtimeExists(rec, ctx, "Pal/Binaries/Win64", "d"),
    (error: unknown) => error instanceof Error &&
      (error as Error & { statusCode?: number }).statusCode === 409,
  );
});

test("Docker byte writes are base64-safe and create their parent", async (context) => {
  let command: string[] = [];
  context.mock.method(dockerRuntimeFiles, "exec", async (_record: InstanceRecord, value: string[]) => {
    command = value;
    return "";
  });
  const content = Uint8Array.from([0, 10, 39, 255]);
  await runtimeWriteBytes(rec, ctx, "Pal/Saved/data.bin", content);
  assert.equal(command[0], "sh");
  assert.equal(command[4], "/palworld/Pal/Saved/data.bin");
  assert.deepEqual(Buffer.from(command[5], "base64"), Buffer.from(content));
  assert.match(command[2], /mkdir -p/);
});

test("Docker mkdir and remove pass normalized paths as argv", async (context) => {
  const calls: string[][] = [];
  context.mock.method(dockerRuntimeFiles, "exec", async (_record: InstanceRecord, command: string[]) => {
    calls.push(command);
    return "";
  });
  await runtimeMkdir(rec, ctx, "Pal/Binaries/Win64/Mods");
  await runtimeRemove(rec, ctx, "Pal/Binaries/Win64/Mods/Reporter");
  assert.deepEqual(calls, [
    ["mkdir", "-p", "/palworld/Pal/Binaries/Win64/Mods"],
    ["rm", "-rf", "--", "/palworld/Pal/Binaries/Win64/Mods/Reporter"],
  ]);
});

test("invalid Docker paths are rejected before executor calls", async (context) => {
  let calls = 0;
  context.mock.method(dockerRuntimeFiles, "exec", async () => {
    calls += 1;
    return "";
  });
  await assert.rejects(runtimeReadText(rec, ctx, "/etc/passwd"), /路徑不合法/);
  await assert.rejects(runtimeRemove(rec, ctx, "../outside"), /路徑不合法/);
  assert.equal(calls, 0);
});
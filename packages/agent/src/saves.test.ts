import assert from "node:assert/strict";
import test from "node:test";
import type { DriverContext } from "./driver.js";
import { restoreBackup } from "./saves.js";
import type { InstanceRecord } from "./store.js";

test("running Docker instances must stop before restoring a backup", async () => {
  const rec = { backend: "docker" } as InstanceRecord;
  const ctx = { instanceDir: "unused" } as DriverContext;

  await assert.rejects(
    restoreBackup(rec, ctx, "D633AB18412D40AD925A1661BF37C569__test.tar.gz", true),
    (error: unknown) => error instanceof Error && error.message === "請先停止伺服器再還原存檔" &&
      (error as Error & { statusCode?: number }).statusCode === 409,
  );
});
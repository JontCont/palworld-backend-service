import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { extract } from "tar-stream";
import { collectTarRoot, transferComponentToDocker } from "./mods.js";
import type { InstanceRecord } from "./store.js";

const rec = { id: "wine-1", backend: "docker", runtime: "wine" } as InstanceRecord;

test("Docker component archives preserve the game container uid and gid", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "palserver-tar-owner-test-"));
  fs.mkdirSync(path.join(root, "Pal", "Binaries", "Win64"), { recursive: true });
  fs.writeFileSync(path.join(root, "Pal", "Binaries", "Win64", "dwmapi.dll"), "proxy");

  try {
    const archive = await collectTarRoot(root);
    const headers: { name: string; uid?: number; gid?: number }[] = [];
    const unpack = extract();
    const finished = new Promise<void>((resolve, reject) => {
      unpack.on("entry", (header, stream, next) => {
        headers.push(header);
        stream.on("end", next);
        stream.resume();
      });
      unpack.on("finish", resolve);
      unpack.on("error", reject);
    });
    unpack.end(archive);
    await finished;

    assert.ok(headers.some((header) => header.name === "Pal/"));
    assert.ok(headers.some((header) => header.name.endsWith("dwmapi.dll")));
    assert.ok(headers.every((header) => header.uid === 1000 && header.gid === 1000));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Docker component transfer uploads one Win64-rooted archive without exec", async () => {
  const extractedDir = fs.mkdtempSync(path.join(os.tmpdir(), "palserver-mod-test-"));
  fs.mkdirSync(path.join(extractedDir, "ue4ss", "Mods"), { recursive: true });
  fs.writeFileSync(path.join(extractedDir, "dwmapi.dll"), "proxy");
  fs.writeFileSync(path.join(extractedDir, "ue4ss", "UE4SS.dll"), "loader");
  let destination = "";
  let uploaded = "";

  try {
    await transferComponentToDocker(rec, extractedDir, ["dwmapi.dll", "ue4ss"], {
      collect: async (root) => {
        assert.equal(
          fs.readFileSync(path.join(root, "Pal", "Binaries", "Win64", "dwmapi.dll"), "utf8"),
          "proxy",
        );
        assert.equal(
          fs.readFileSync(path.join(root, "Pal", "Binaries", "Win64", "ue4ss", "UE4SS.dll"), "utf8"),
          "loader",
        );
        return Buffer.from("tar archive");
      },
      put: async (_record, archive, target) => {
        uploaded = archive.toString("utf8");
        destination = target;
      },
    });
    assert.equal(destination, "/palworld");
    assert.equal(uploaded, "tar archive");
  } finally {
    fs.rmSync(extractedDir, { recursive: true, force: true });
  }
});
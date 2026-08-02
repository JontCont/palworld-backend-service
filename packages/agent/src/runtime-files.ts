import fs from "node:fs";
import path from "node:path";
import type { DriverContext } from "./driver.js";
import type { InstanceRecord } from "./store.js";
import { execInInstanceFilesystem } from "./docker.js";
import { serverRoot } from "./native.js";
import {
  deletePathInPod,
  execInPod,
  makeDirInPod,
  POD_ROOT,
  readFileInPod,
  resolvePodPath,
  writeFileBytesInPod,
} from "./k8s-files.js";

export const dockerRuntimeFiles = {
  exec: execInInstanceFilesystem,
};

export function resolveDockerRuntimePath(relPath: string): string {
  const target = resolvePodPath(relPath);
  if (target === POD_ROOT) {
    throw Object.assign(new Error("路徑不合法"), { statusCode: 400 });
  }
  return target;
}

/** Paths passed to this module are relative to the game install root. */
function hostPath(rec: InstanceRecord, ctx: DriverContext, relPath: string): string {
  return path.join(serverRoot(rec, ctx), ...relPath.split("/"));
}

export async function runtimeExists(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
  kind: "e" | "d" | "f" = "e",
): Promise<boolean> {
  if (rec.backend === "docker") {
    const target = resolveDockerRuntimePath(relPath);
    try {
      await dockerRuntimeFiles.exec(rec, ["test", `-${kind}`, target]);
      return true;
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error;
      return false;
    }
  }
  if (rec.backend === "k8s") {
    try {
      await execInPod(rec, ["test", `-${kind}`, `/palworld/${relPath}`]);
      return true;
    } catch {
      return false;
    }
  }
  const target = hostPath(rec, ctx, relPath);
  try {
    const stat = fs.statSync(target);
    return kind === "d" ? stat.isDirectory() : kind === "f" ? stat.isFile() : true;
  } catch {
    return false;
  }
}

export async function runtimeReadText(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
): Promise<string> {
  if (rec.backend === "docker") {
    return dockerRuntimeFiles.exec(rec, ["cat", resolveDockerRuntimePath(relPath)]);
  }
  if (rec.backend === "k8s") return readFileInPod(rec, relPath);
  return fs.readFileSync(hostPath(rec, ctx, relPath), "utf8");
}

export async function runtimeWriteBytes(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
  content: Uint8Array,
): Promise<void> {
  if (rec.backend === "docker") {
    const target = resolveDockerRuntimePath(relPath);
    const encoded = Buffer.from(content).toString("base64");
    await dockerRuntimeFiles.exec(rec, [
      "sh",
      "-c",
      'mkdir -p "$(dirname "$1")" && printf %s "$2" | base64 -d > "$1"',
      "palserver-write",
      target,
      encoded,
    ]);
    return;
  }
  if (rec.backend === "k8s") {
    const parent = path.posix.dirname(relPath);
    await makeDirInPod(rec, parent === "." ? "" : parent);
    await writeFileBytesInPod(rec, relPath, content);
    return;
  }
  const target = hostPath(rec, ctx, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

export async function runtimeWriteText(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
  content: string,
): Promise<void> {
  await runtimeWriteBytes(rec, ctx, relPath, Buffer.from(content, "utf8"));
}

export async function runtimeMkdir(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
): Promise<void> {
  if (rec.backend === "docker") {
    await dockerRuntimeFiles.exec(rec, ["mkdir", "-p", resolveDockerRuntimePath(relPath)]);
    return;
  }
  if (rec.backend === "k8s") {
    await makeDirInPod(rec, relPath);
    return;
  }
  fs.mkdirSync(hostPath(rec, ctx, relPath), { recursive: true });
}

export async function runtimeRemove(
  rec: InstanceRecord,
  ctx: DriverContext,
  relPath: string,
): Promise<void> {
  if (rec.backend === "docker") {
    await dockerRuntimeFiles.exec(rec, ["rm", "-rf", "--", resolveDockerRuntimePath(relPath)]);
    return;
  }
  if (rec.backend === "k8s") {
    await deletePathInPod(rec, relPath);
    return;
  }
  fs.rmSync(hostPath(rec, ctx, relPath), { recursive: true, force: true });
}


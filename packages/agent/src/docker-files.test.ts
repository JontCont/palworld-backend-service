import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test, { type TestContext } from "node:test";
import type Docker from "dockerode";
import {
  containerSecurityOptions,
  docker,
  execInInstanceFilesystem,
  type InstanceFilesystemOperations,
} from "./docker.js";
import type { InstanceRecord } from "./store.js";

const rec = { id: "wine-1", backend: "docker", runtime: "wine" } as InstanceRecord;

test("only Wine containers bypass the regressed Docker seccomp profile", () => {
  assert.deepEqual(containerSecurityOptions(rec), ["seccomp=unconfined"]);
  assert.equal(
    containerSecurityOptions({ ...rec, runtime: "native" } as InstanceRecord),
    undefined,
  );
});

function operations(running: boolean, calls: string[]): InstanceFilesystemOperations {
  const container = {
    inspect: async () => ({ State: { Running: running }, Config: { Image: "palserver/wine:test" } }),
  } as unknown as Docker.Container;
  return {
    find: async () => container,
    execRunning: async (_container, command) => {
      calls.push(`running:${command.join(" ")}`);
      return "running output\n";
    },
    execStopped: async (_record, _container, image, command) => {
      calls.push(`stopped:${image}:${command.join(" ")}`);
      return "stopped output\n";
    },
  };
}

test("running instance filesystem command uses checked container exec without trimming", async () => {
  const calls: string[] = [];
  const output = await execInInstanceFilesystem(rec, ["cat", "/palworld/state.json"], operations(true, calls));
  assert.equal(output, "running output\n");
  assert.deepEqual(calls, ["running:cat /palworld/state.json"]);
});

test("stopped instance filesystem command uses the source image volume helper", async () => {
  const calls: string[] = [];
  const output = await execInInstanceFilesystem(rec, ["test", "-f", "/palworld/state.json"], operations(false, calls));
  assert.equal(output, "stopped output\n");
  assert.deepEqual(calls, ["stopped:palserver/wine:test:test -f /palworld/state.json"]);
});

test("filesystem command propagates non-zero helper failures", async () => {
  const ops = operations(false, []);
  ops.execStopped = async () => {
    throw new Error("容器內命令失敗(exit 7):denied");
  };
  await assert.rejects(
    execInInstanceFilesystem(rec, ["cat", "/palworld/state.json"], ops),
    /exit 7.*denied/,
  );
});

test("filesystem command reports a missing game container", async () => {
  const ops = operations(false, []);
  ops.find = async () => null;
  await assert.rejects(
    execInInstanceFilesystem(rec, ["cat", "/palworld/state.json"], ops),
    (error: unknown) => error instanceof Error && error.message === "找不到容器" &&
      (error as Error & { statusCode?: number }).statusCode === 409,
  );
});

async function exerciseDefaultStoppedHelper(
  context: TestContext,
  statusCode: number,
): Promise<{ output?: string; error?: unknown; removeCount: number; helperUser?: string }> {
  const source = {
    id: "game-container",
    inspect: async () => ({
      State: { Running: false },
      Config: { Image: "palserver/wine:test" },
    }),
  } as unknown as Docker.Container;
  const attached = new PassThrough();
  let removeCount = 0;
  const helper = {
    attach: async () => attached,
    start: async () => {
      attached.end(statusCode === 0 ? "helper output\n" : "denied\n");
    },
    wait: async () => ({ StatusCode: statusCode }),
    remove: async () => { removeCount += 1; },
  } as unknown as Docker.Container;

  let listCall = 0;
  let helperUser: string | undefined;
  context.mock.method(docker, "listContainers", async () =>
    listCall++ === 0 ? [{ Id: "game-container" }] : []);
  context.mock.method(docker, "getContainer", () => source);
  context.mock.method(docker, "createContainer", async (options: Docker.ContainerCreateOptions) => {
    helperUser = options.User;
    return helper;
  });
  context.mock.method(
    docker.modem,
    "demuxStream",
    (stream: NodeJS.ReadableStream, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream) => {
      stream.pipe(statusCode === 0 ? stdout : stderr);
    },
  );

  try {
    return {
      output: await execInInstanceFilesystem(rec, ["cat", "/palworld/state.json"]),
      removeCount,
      helperUser,
    };
  } catch (error) {
    return { error, removeCount, helperUser };
  }
}

test("stopped filesystem helper removes itself after success", async (context) => {
  const result = await exerciseDefaultStoppedHelper(context, 0);
  assert.equal(result.output, "helper output\n");
  assert.equal(result.removeCount, 1);
  assert.equal(result.helperUser, "0:0");
});

test("stopped filesystem helper removes itself after non-zero exit", async (context) => {
  const result = await exerciseDefaultStoppedHelper(context, 9);
  assert.match(String(result.error), /exit 9.*denied/);
  assert.equal(result.removeCount, 1);
});
## Context

The Compose file runs the management agent with access to the host Docker socket. The agent creates a sibling game container for each Docker-backed instance. A Wine instance uses the Windows PalServer binary under Linux and persists the complete game installation in the game container's `/palworld` Docker volume.

The boss reporter already treats `runtime: "wine"` as a Windows server and uses `runtime-files.ts` for status, installation, state reads, and removal. That abstraction handles native files and Kubernetes Pods, but Docker falls through to the agent host filesystem. Existing Docker mod transfer also relies on container exec even though reporter routes require the game to be stopped before DLL or Lua changes.

## Goals / Non-Goals

**Goals:**

- Make the existing runtime file contract operate on `/palworld` inside Docker instances.
- Support reporter inspection, installation, update, state reads, and removal for Wine Docker instances when the route's stopped/running preconditions are met.
- Preserve exact stdout for JSON reads and detect non-zero container command exits.
- Explicitly load UE4SS's `dwmapi.dll` proxy in the Wine image.
- Keep all temporary helper containers bounded, labeled, and removed after every outcome.

**Non-Goals:**

- A reporter for the native Linux PalServer binary.
- Changes to the public boss respawn API or state JSON schema.
- Changes to native and Kubernetes storage semantics.
- General-purpose container orchestration beyond instance filesystem access.
- UI or Discord event behavior changes.

## Decisions

### Route Docker runtime files through a state-aware volume executor

Add an internal Docker operation that executes filesystem commands against an instance's mounted volumes. It inspects the game container state and uses `execInContainerChecked` while the game container is running. When the game container is stopped, it creates a short-lived helper from the same image, overrides the entrypoint, attaches the game container's volumes read-write, runs the command, captures stdout/stderr and exit status, and removes the helper in a `finally` path.

`runtime-files.ts` keeps its existing exported function signatures. For Docker records it maps validated relative game paths beneath `/palworld` and delegates `test`, `cat`, `mkdir`, write, and `rm` operations to the state-aware executor. Reads preserve stdout without trimming because JSON and text files are data, not command output. Writes encode content as base64 and decode it inside the filesystem context so binary content does not pass through shell interpolation.

Every relative path is normalized and rejected if it is absolute, empty where a file is required, or contains a parent traversal segment. Commands receive paths as positional arguments instead of interpolating paths into shell source.

Alternative considered: inspect the Docker volume mountpoint and read it from the agent container. This fails under Compose because Docker daemon host paths are not mounted into the agent and would couple the agent to daemon internals. Running all operations through helpers was also rejected because the 15-second boss event poll would create continuous container churn.

### Transfer UE4SS to stopped Docker containers with the archive API

For Docker component installation, package the extracted component tree under `Pal/Binaries/Win64` and upload it at `/palworld` using the existing Docker archive API. Docker archive copy supports stopped containers and avoids one exec per extracted file. Kubernetes retains its current Pod transfer path, and native instances retain direct filesystem extraction.

Reporter-specific Lua and marker files continue through `runtime-files.ts`, which uses the stopped-container helper. No marker is written until the UE4SS archive and reporter Lua files have both succeeded.

Alternative considered: temporarily start the game container for installation. This violates the route contract, can start PalServer with partially installed files, and reintroduces DLL locking.

### Require the Wine UE4SS proxy override

Extend `WINEDLLOVERRIDES` in the Wine image to include `dwmapi=n,b` while retaining `d3d9=n,b`. This makes Wine prefer UE4SS's local proxy DLL before the builtin implementation. A container smoke test must verify UE4SS initialization and fresh reporter state output; the environment variable alone is not accepted as proof of runtime compatibility.

Alternative considered: rely on Wine's default local DLL resolution. Explicit configuration is deterministic and matches the existing PalDefender proxy treatment.

### Preserve the server-binary capability boundary

Keep the reporter's `serverPlatform(rec) === "windows"` eligibility rule. Docker and host operating systems are not the capability boundary: a Wine-backed Docker instance is eligible because it runs the Windows binary, while a native Linux Docker instance remains ineligible because it cannot load the Windows UE4SS DLL.

Alternative considered: remove the platform check and attempt installation everywhere. That would expose an install action that can never produce state on native Linux and would misreport support.

## Implementation Contract

**Behavior:** A Compose-deployed agent can manage PalserverBossReporter for a Wine Docker instance. Status and install/remove operations work while the game container is stopped. While it is running, state reads use checked exec and the event tracker continues polling the same JSON path. Native Linux Docker instances return the existing unsupported result.

**Interfaces and data:** The public boss respawn HTTP endpoints and `BossRespawnStatus` remain unchanged. The `runtimeExists`, `runtimeReadText`, `runtimeWriteBytes`, `runtimeWriteText`, `runtimeMkdir`, and `runtimeRemove` signatures remain unchanged. Docker relative paths map to `/palworld/<relative-path>`. The internal Docker filesystem executor returns untrimmed stdout and throws an error containing the exit code and stderr on command failure.

**Failure modes:** A missing path produces `false` from `runtimeExists`; read/write/remove command failures propagate to the caller. A missing game container produces the existing conflict-style container-not-found error. Helper creation, start, command failure, and output parsing all trigger best-effort helper removal. Installation failure before completion does not write the reporter version marker. A malformed or missing boss state file continues to produce `state: null`.

**Acceptance criteria:** Automated tests mock the Docker boundary and prove running and stopped routing, exact text reads, binary-safe writes, path rejection, non-zero command handling, helper cleanup, Wine eligibility, and native Linux rejection. `pnpm exec node --import tsx --test packages/agent/src/runtime-files.test.ts packages/agent/src/boss-reporter.test.ts` passes. `pnpm --filter @palserver/agent typecheck` passes. A manual smoke run starts a fresh Wine instance, installs the reporter while stopped, restarts it, confirms UE4SS initialization in container logs, and confirms `/palworld/Pal/Saved/palserver-boss-state.json` has a recent `generatedAt` value.

**Scope boundaries:** In scope are Docker instance filesystem routing, stopped-container volume access, Docker UE4SS archive delivery, Wine proxy configuration, and focused tests. Out of scope are native Linux reporter development, API schema changes, state interpretation, UI changes, and unrelated Docker volume redesign.

## Risks / Trade-offs

- [The helper image lacks a usable POSIX shell] -> Use the same shell requirement already imposed by built-in Docker images, return a concrete command failure for incompatible custom images, and document the built-in Wine image as the supported path.
- [A helper survives an agent or daemon crash] -> Apply an instance label and a dedicated helper label so startup or the next operation can remove stale helpers safely.
- [Archive upload partially writes UE4SS] -> Keep the server stopped, withhold the reporter marker until all writes complete, and allow an idempotent reinstall to overwrite the component.
- [Explicit `dwmapi` override changes Wine startup behavior] -> Preserve the builtin fallback with `n,b` and require the smoke test before release.
- [Per-operation helpers add latency while stopped] -> Use checked exec for the frequent running-state poll; helper overhead only affects operator-triggered stopped-state actions and status checks.

## Migration Plan

1. Build the updated agent and Wine images.
2. Recreate the Compose agent so it uses the new Docker filesystem behavior.
3. Recreate or update Wine game containers to receive the new DLL override; the persistent `/palworld` volume preserves game and mod files.
4. Stop a Wine instance and run reporter install/update once, then start it and perform the smoke checks.
5. Roll back by restoring the prior agent and Wine images. Existing reporter files remain inert if UE4SS does not load and can be removed with the updated agent before rollback.

## Open Questions

None. Runtime compatibility remains an acceptance test rather than an unresolved design choice.

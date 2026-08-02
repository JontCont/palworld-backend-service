## 1. Docker Filesystem Execution

- [x] 1.1 Implement **Route Docker runtime files through a state-aware volume executor** in `packages/agent/src/docker.ts`: running containers use checked exec with untrimmed stdout, stopped containers use a labeled same-image helper with inherited read-write volumes, and every helper exit path removes the helper; verify in `packages/agent/src/docker-files.test.ts` with running routing, stopped routing, non-zero exit propagation, and cleanup after success and failure.
- [x] 1.2 Deliver **Docker runtime file access targets the game installation** in `packages/agent/src/runtime-files.ts`: map validated relative paths beneath `/palworld`, preserve native and Kubernetes branches, provide binary-safe writes, and reject absolute or parent-traversal paths before Docker calls; verify in `packages/agent/src/runtime-files.test.ts` with exact-text reads, `test` true/false cases, byte round trips, `/etc/passwd`, and `../outside`.

## 2. Reporter Lifecycle

- [x] 2.1 Implement **Transfer UE4SS to stopped Docker containers with the archive API** in `packages/agent/src/mods.ts` so the extracted UE4SS tree is archived under `Pal/Binaries/Win64` and uploaded at `/palworld` without starting PalServer, while Kubernetes and native transfer paths remain unchanged; verify in `packages/agent/src/mods-runtime.test.ts` that the mocked Docker archive destination is correct and no container exec is required.
- [x] 2.2 Deliver **Reporter lifecycle works while a Wine Docker instance is stopped** across `packages/agent/src/boss-reporter.ts` and the runtime file adapter: fresh install writes the Lua, enablement, and marker only after UE4SS succeeds, update is idempotent, and removal deletes reporter artifacts while retaining UE4SS; verify focused tests for successful install, dependency failure with no marker, repeat install, and removal preservation.
- [x] 2.3 Implement **Preserve the server-binary capability boundary** and **Reporter support follows the server binary runtime** in reporter status handling: `runtime: "wine"` Docker records inspect `/palworld`, while native Linux Docker records return the Windows-binary requirement and never attempt installation; verify table-driven status tests covering Docker Wine, Docker native Linux, native Windows, and Kubernetes Wine records.

## 3. Wine Runtime and State

- [x] 3.1 Implement **Require the Wine UE4SS proxy override** so **Wine loads the UE4SS proxy** in `images/wine/Dockerfile` by retaining `d3d9=n,b` and adding `dwmapi=n,b` with builtin fallback; verify the built image reports both entries in `WINEDLLOVERRIDES` and starts the Windows PalServer command without an immediate Wine DLL-load failure.
- [x] 3.2 Deliver **Wine Docker instances expose reporter state** through the unchanged `BossRespawnStatus` contract: valid JSON read from the Docker `/palworld` volume is parsed with correct stale calculation, while missing or malformed JSON returns `state: null` and emits no transition; verify focused reporter and event-tracker tests using recent, stale, missing, and malformed state fixtures.

## 4. Integrated Verification

- [x] 4.1 Run `pnpm exec node --import tsx --test packages/agent/src/docker-files.test.ts packages/agent/src/runtime-files.test.ts packages/agent/src/mods-runtime.test.ts packages/agent/src/boss-reporter.test.ts packages/agent/src/boss-event-tracker.test.ts`, then run `pnpm --filter @palserver/agent typecheck`; completion requires zero failed tests and zero TypeScript errors.
- [x] 4.2 Perform the Compose Wine smoke test: rebuild and recreate the agent and Wine images, create or stop a Wine-backed instance, install PalserverBossReporter while stopped, restart it, confirm logs contain UE4SS initialization, and read `/palworld/Pal/Saved/palserver-boss-state.json` twice at least 15 seconds apart to verify `generatedAt` advances and the API reports `supported: true` with non-stale state.

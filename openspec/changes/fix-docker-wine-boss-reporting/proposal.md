## Problem

A Linux host deployed through Docker Compose can create a Wine-backed Palworld instance that runs the Windows server binary, but the boss reporter reports the instance as not installed and cannot read or write its files. This contradicts the existing runtime model, where Wine-backed Docker instances are classified as Windows-capable and Docker mod installation is supported.

## Root Cause

The boss reporter uses the shared runtime file API for installation, status, state reads, and removal. That API has explicit Kubernetes handling but falls through to the agent host filesystem for Docker records, so it looks under the agent instance directory instead of the sibling game container's `/palworld` install. In addition, the Wine image explicitly enables the `d3d9` native proxy but does not explicitly enable the `dwmapi` proxy used by UE4SS.

## Proposed Solution

- Add Docker-aware file operations to the existing runtime file abstraction so relative game paths resolve inside `/palworld` for Docker instances, using checked exec while running and a short-lived volume helper while stopped.
- Preserve native host filesystem and Kubernetes Pod behavior through the same API.
- Transfer UE4SS archives through the Docker archive API so dependency installation remains possible while the game container is stopped.
- Ensure the Wine container explicitly permits UE4SS's local `dwmapi.dll` proxy loader.
- Keep capability reporting based on the server binary runtime: Wine-backed Docker instances are supported, while native Linux PalServer binaries remain unsupported by the Windows UE4SS reporter.
- Add focused automated coverage for Docker path routing and Wine boss reporter eligibility, plus a container smoke procedure that verifies fresh state generation.

## Non-Goals

- Supporting the existing UE4SS reporter on the native Linux PalServer binary.
- Creating a Linux-native boss reporter implementation.
- Changing boss state semantics, event transition rules, or web presentation.
- General redesign of Docker volume ownership or mod management.

## Success Criteria

- A stopped Wine-backed Docker instance with an installed game can install, update, inspect, and remove PalserverBossReporter through the agent.
- After startup, the agent reads `/palworld/Pal/Saved/palserver-boss-state.json` from the game container and exposes a non-stale state when the reporter is active.
- Native Linux Docker instances continue to return an unsupported reason instead of attempting to install a Windows DLL.
- Native and Kubernetes runtime file operations retain their existing behavior.
- The Wine container loads the UE4SS proxy and emits evidence that the Lua reporter started during a smoke test.

## Capabilities

### New Capabilities

- `docker-wine-boss-reporting`: Boss reporter lifecycle and state access for Wine-backed Docker instances managed by a Compose-deployed agent.

### Modified Capabilities

(none)

## Impact

- Affected specs: docker-wine-boss-reporting
- Affected code:
  - Modified: packages/agent/src/docker.ts, packages/agent/src/runtime-files.ts, packages/agent/src/mods.ts, packages/agent/src/boss-reporter.ts, images/wine/Dockerfile
  - New: packages/agent/src/docker-files.test.ts, packages/agent/src/runtime-files.test.ts, packages/agent/src/mods-runtime.test.ts, packages/agent/src/boss-event-tracker.test.ts
  - Removed: none
- Affected systems: Docker socket access from the agent, sibling Wine game containers, and the persistent `/palworld` Docker volume.

## Why

The palserver-gui project currently manages workspace scripts manually via pnpm (e.g., build:shared, build:deps), lacking task-dependency caching, task graph optimization, and parallel execution features. Introducing Nx into the repository via a Package-based approach enables build caching, dependency-graph-driven task pipelines, and optimized development workflows without altering the existing repository structure.

## What Changes

- Add nx dependency and configure nx.json in the workspace root.
- Define Nx task pipelines (targetDefaults) for build, typecheck, dev, bundle:agent, and release:exe.
- Update root package.json scripts to leverage Nx task runner while maintaining backward compatibility.
- Configure output cache targets for agent, web, shared packages, and release build artifacts.

## Non-Goals (optional)

- Moving files into apps/ and libs/ directory structures (Integrated Monorepo structure is deferred to future iterations).
- Mutating application runtime logic or API contracts.

## Capabilities

### New Capabilities

- 
x-task-pipeline: Workspace task execution, task caching, and dependency graph pipeline management using Nx.

### Modified Capabilities

(none)

## Impact

- Affected specs: 
x-task-pipeline
- Affected code:
  - New: nx.json
  - Modified: package.json, pnpm-workspace.yaml

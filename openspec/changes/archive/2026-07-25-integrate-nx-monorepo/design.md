## Context

The `palserver-gui` repository is structured as a pnpm workspace containing four packages (`agent`, `web`, `shared`, `stats`). Currently, workspace scripts use sequential pnpm commands (`build:shared && pnpm ...`) in `package.json`, which lacks task graph scheduling and caching. Integrating Nx via a Package-based approach improves task execution speed and developer experience while maintaining existing package directory structures.

## Goals / Non-Goals

**Goals:**

- Add `nx` as a dev dependency and configure `nx.json` at the workspace root.
- Define Nx task pipelines for `build`, `typecheck`, `dev`, `bundle:agent`, and `release:exe`.
- Ensure output caching for build artifacts (`dist/`, `release/`).
- Provide unified script commands for running targets via Nx.

**Non-Goals:**

- Re-architecting package folders into `apps/` and `libs/`.
- Changing application source code logic in `@palserver/*`.

## Decisions

### Decision 1: Package-based Nx Configuration

Use a root `nx.json` configuration file while preserving `pnpm-workspace.yaml` and `packages/*`.

- **Rationale**: Minimizes risk and churn while providing full task graph caching benefits.
- **Alternatives Considered**: Integrated Nx Monorepo (rejected for now due to folder re-organization churn).

### Decision 2: Task Pipeline Dependency Mapping

Define `targetDefaults` in `nx.json` such that `build` depends on `^build`.

- **Rationale**: Automatically guarantees `@palserver/shared` build runs before `@palserver/agent` or `@palserver/web` build without manual script chaining.

## Implementation Contract

- **Behavior**: Developers can execute `npx nx run-many -t build` or `npx nx build @palserver/agent` with automatic dependency ordering and output caching.
- **Interface / Data Shape**: `nx.json` schema configuring `targetDefaults` (`build`, `typecheck`, `dev`, `bundle:agent`, `release:exe`) and `outputs`.
- **Failure Modes**: Missing dependencies or failed TypeScript checks fail the task graph immediately and bypass cache write.
- **Acceptance Criteria**: Running `npx nx run-many -t build` completes successfully. A subsequent run reports cache hits for unchanged packages.
- **Scope Boundaries**: In-scope: `nx.json` creation, root `package.json` script updates, cache output definitions. Out-of-scope: folder restructuring, source code feature changes.

## Risks / Trade-offs

- [Risk] Developer environment without Nx installed globally → Mitigation: Use `npx nx` or root package.json script wrappers (`pnpm nx ...`).

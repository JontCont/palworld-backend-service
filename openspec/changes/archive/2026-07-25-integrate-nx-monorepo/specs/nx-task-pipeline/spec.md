## ADDED Requirements

### Requirement: Nx workspace configuration
The workspace SHALL include a valid `nx.json` file in the repository root that configures target defaults for task execution and build output caching.

#### Scenario: Nx pipeline initialization
- **WHEN** developer runs `npx nx run-many -t build` in the repository root
- **THEN** Nx SHALL execute the build target for all packages in dependency graph order

### Requirement: Task caching and outputs
The workspace SHALL cache task outputs for build and typecheck targets based on source file changes and dependency graph state.

#### Scenario: Build cache hit
- **WHEN** developer runs `npx nx build @palserver/agent` without modifying any source files since the previous build
- **THEN** Nx SHALL retrieve build artifacts from the cache and complete immediately

<!--
Each task description MUST state:
- the behavior or contract being delivered (what is observably true when the
  task is complete), and
- the verification target that proves completion (test, CLI invocation,
  analyzer check, manual assertion, or content review).

File paths are supporting context for locating the work, never the task
itself. "Edit file X" is not a valid task — it is missing both behavior and
verification.
-->

## 1. Docker Port Binding Inspection and Auto-Recreation

- [x] 1.1 Implement docker port binding inspection on start in packages/agent/src/docker.ts to fulfill requirement "Docker container auto-recreation on port binding mismatch". Inspect Docker container PortBindings on startInstance; if RESTAPIEnabled is true and RESTAPIPort/tcp is missing, automatically stop and remove the outdated container so createContainer recreates it with port 8212 bound. Verified via unit test pnpm --filter @palserver/agent exec tsx --test "src/docker.ts".

## 2. Containerized Agent Network Mode

- [x] 2.1 Implement containerized agent network mode by adding network_mode: host to the agent service in docker-compose.yml so containerized agent daemon can reach host-mapped game container ports. Verified via file content review of docker-compose.yml.

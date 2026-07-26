## Context

When a Docker-backed Palworld instance is created with RESTAPIEnabled turned off or without RESTAPIPort bound, starting or restarting the instance in packages/agent/src/docker.ts reuses the existing container without inspecting whether host port 8212/tcp is exposed. When RESTAPIEnabled is later enabled, REST API requests fail and presence tracking fails.

Additionally, docker-compose.yml deploys palserver-agent without network_mode: host, preventing containerized agent from communicating with host-mapped game container ports.

## Goals / Non-Goals

**Goals:**

- Inspect existing Docker container PortBindings on instance startup in packages/agent/src/docker.ts.
- Automatically stop and remove outdated containers missing required port bindings (RESTAPIPort/tcp) so createContainer() can recreate them with port bindings.
- Add network_mode: host to the agent service in docker-compose.yml.

**Non-Goals:**

- Recreating containers on startup when port bindings already match.
- Modifying native or Kubernetes driver startup logic.

## Decisions

### 1. Docker Port Binding Inspection on Start

In startInstance(), before starting an existing container, inspect HostConfig.PortBindings. If rec.settings.RESTAPIEnabled is true and ${rec.settings.RESTAPIPort}/tcp is missing from PortBindings, stop and remove the container. Setting container = null causes startInstance() to invoke createContainer(), which re-creates the container with the required port bindings.

### 2. Containerized Agent Network Mode

Set network_mode: host for the agent service in docker-compose.yml. This allows containerized agent to share host networking and reach host-bound sibling game container ports.

## Implementation Contract

- Behavior: When an operator enables RESTAPIEnabled and starts the instance, the outdated container missing port 8212 is automatically recreated with port 8212 bound.
- Interface / Data Shape: Modifies startInstance(rec, instanceDir) in docker.ts and agent service in docker-compose.yml.
- Failure Modes: If container inspection fails, fall back gracefully to createContainer().
- Acceptance Criteria: Running agent unit tests passes.
- Scope Boundaries: In-scope: packages/agent/src/docker.ts and docker-compose.yml. Out-of-scope: Native and K8s drivers.

## Risks / Trade-offs

- [Risk] Recreating a container requires a brief delay to stop and remove the old container. ? Mitigation: Only triggered when port bindings are missing.

## Problem

When a Docker-backed Palworld instance is created with REST API disabled (or without port 8212 bound), and the user later enables RESTAPIEnabled in the GUI, starting or restarting the instance in packages/agent/src/docker.ts does not inspect existing container PortBindings. As a result, the container runs without host port 8212 exposed, causing REST API calls to fail and player join/leave presence tracking to break.

Additionally, when running the agent daemon inside Docker via docker-compose.yml, the agent service lacks network_mode: host, preventing containerized agent from reaching host-mapped game container ports.

## Root Cause

1. packages/agent/src/docker.ts startInstance() reuses existing container references without verifying if required port bindings (such as RESTAPIPort/tcp) are present in HostConfig.PortBindings.
2. docker-compose.yml does not configure network_mode: host for the agent service.

## Proposed Solution

1. Update packages/agent/src/docker.ts startInstance() to inspect existing container PortBindings. If RESTAPIEnabled is true and the container lacks RESTAPIPort/tcp, automatically stop and remove the outdated container so createContainer() can recreate it with correct port bindings.
2. Update docker-compose.yml to set network_mode: host for the agent service.

## Non-Goals

- Changing container creation logic for native or Kubernetes backends.
- Recreating containers on every start when port bindings already match.

## Success Criteria

- Starting a Docker instance after enabling REST API automatically recreates the container with port 8212 bound.
- Containerized agent in docker-compose.yml uses host network mode.
- Unit tests pass.

## Impact

- Affected code:
  - Modified: packages/agent/src/docker.ts
  - Modified: docker-compose.yml

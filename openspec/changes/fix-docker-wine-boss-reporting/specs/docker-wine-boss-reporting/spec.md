## ADDED Requirements

### Requirement: Docker runtime file access targets the game installation

For a Docker-backed instance, the agent SHALL resolve runtime file paths relative to `/palworld` in the game container's mounted filesystem. The agent MUST reject absolute paths and parent-directory traversal before invoking Docker operations.

#### Scenario: Read state while the game container is running

- **WHEN** the agent reads `Pal/Saved/palserver-boss-state.json` for a running Docker instance
- **THEN** it executes a checked read against `/palworld/Pal/Saved/palserver-boss-state.json` in that game container and returns the file text without trimming

#### Scenario: Access files while the game container is stopped

- **WHEN** the agent performs a runtime file operation for a stopped Docker instance
- **THEN** it runs the operation in a short-lived helper that mounts the game container's volumes and removes the helper after success or failure

#### Scenario: Reject a path outside the game installation

- **WHEN** a runtime file caller supplies `/etc/passwd` or `../outside`
- **THEN** the agent rejects the operation without creating a helper or executing a command in the game container

### Requirement: Reporter lifecycle works while a Wine Docker instance is stopped

The agent SHALL install, update, inspect, and remove PalserverBossReporter for an installed Wine-backed Docker instance while the game container is stopped. Reporter installation MUST install UE4SS first when it is absent, and MUST write the reporter version marker only after dependency and Lua file delivery succeed.

#### Scenario: Fresh reporter installation

- **WHEN** an operator installs the reporter on a stopped Wine Docker instance whose `/palworld/Pal/Binaries/Win64` exists and UE4SS is absent
- **THEN** the agent uploads UE4SS to `/palworld/Pal/Binaries/Win64`, writes `PalserverBossReporter/Scripts/main.lua`, enables the mod, and writes the reporter version marker

#### Scenario: Failed dependency delivery

- **WHEN** UE4SS archive delivery or reporter Lua delivery fails during installation
- **THEN** the install request fails and the agent does not write the reporter version marker

#### Scenario: Reporter removal

- **WHEN** an operator removes the reporter from a stopped Wine Docker instance
- **THEN** the agent removes the reporter directory, its mods entry, its marker, and its state file while preserving UE4SS

### Requirement: Wine Docker instances expose reporter state

A running Wine-backed Docker instance with an active reporter SHALL expose the reporter's JSON state through the existing boss respawn status contract. Missing or malformed state SHALL produce `state: null` without fabricating boss observations.

#### Scenario: Fresh state is available

- **WHEN** the reporter writes a valid `/palworld/Pal/Saved/palserver-boss-state.json` with `generatedAt` within 60 seconds of the current time
- **THEN** the boss respawn status contains the parsed state and reports it as not stale

##### Example: recent reporter output

- **GIVEN** current epoch time `2000000030` and state `{ "version": 1, "generatedAt": 2000000000, "tick": 1, "spawnerTotal": 0, "bossCount": 0, "aliveCount": 0, "bosses": [] }`
- **WHEN** the agent reads boss respawn status
- **THEN** `supported` is `true`, `state.generatedAt` is `2000000000`, and `stale` is `false`

#### Scenario: State file is malformed

- **WHEN** the reporter state path is missing or contains invalid JSON
- **THEN** the boss respawn status contains `state: null` and does not emit a boss transition from that read

### Requirement: Reporter support follows the server binary runtime

The agent SHALL report the existing Windows UE4SS reporter as supported for a Docker instance with `runtime: "wine"` and SHALL report it as unsupported for a Docker instance running the native Linux PalServer binary.

#### Scenario: Compose host with Wine game container

- **WHEN** the Compose-deployed agent inspects an installed Docker instance with `runtime: "wine"`
- **THEN** the agent evaluates reporter installation and state from the game container instead of rejecting the host because it runs Linux

#### Scenario: Native Linux game container

- **WHEN** the agent inspects a Docker instance that runs the native Linux PalServer binary
- **THEN** the boss respawn status has `supported: false` with a reason that the current UE4SS reporter requires a Windows server binary

### Requirement: Wine loads the UE4SS proxy

The built-in Wine image SHALL configure Wine to prefer the native local `dwmapi.dll` used by UE4SS while retaining the existing native local `d3d9.dll` override and builtin fallbacks.

#### Scenario: Start a reporter-enabled Wine instance

- **WHEN** a Wine game container starts with UE4SS and PalserverBossReporter installed
- **THEN** container runtime evidence shows UE4SS initialization and the reporter generates a state file with a changing `generatedAt` value

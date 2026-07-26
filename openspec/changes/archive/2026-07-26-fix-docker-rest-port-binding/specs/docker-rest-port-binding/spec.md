## ADDED Requirements

### Requirement: Docker container auto-recreation on port binding mismatch
The system SHALL inspect existing Docker container port bindings when starting an instance. If RESTAPIEnabled is set to true and the existing container's port bindings do not include the configured RESTAPIPort/tcp, the system SHALL stop and remove the outdated container and recreate it with the required port bindings.

#### Scenario: Start instance with missing REST API port binding
- **WHEN** an instance with RESTAPIEnabled set to true is started and the existing container is missing the REST API port binding
- **THEN** the system stops and removes the outdated container, creates a new container with the REST API port bound, and starts it

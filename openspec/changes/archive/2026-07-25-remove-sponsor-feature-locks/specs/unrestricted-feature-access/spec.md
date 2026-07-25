## ADDED Requirements

### Requirement: Former sponsor features are universally available

The system SHALL make custom-pal, guild-map, delete-base, pal-stats, bulk-items, teleport, log-tools, dashboard-stats, save-slim, leaderboard, map-unlocks, breeding-calc, daily-restart, public-map, boss-respawn, and webhooks available independently of sponsor-code state.

#### Scenario: No sponsor code is configured

- **WHEN** an authenticated user invokes a formerly sponsor-gated feature without a sponsor code
- **THEN** the system processes the feature without a sponsor-entitlement denial

#### Scenario: Stored sponsor code is unusable

- **WHEN** a stored sponsor code is invalid, expired, offline, or bound to another machine
- **THEN** the system processes formerly sponsor-gated features exactly as it does when a valid code exists

##### Example: entitlement states do not change access

| Sponsor state | Expected feature access |
| ----- | ----- |
| Missing | Available |
| Invalid | Available |
| Expired | Available |
| Verification offline | Available |
| Bound elsewhere | Available |
| Valid | Available |

### Requirement: Agent endpoints do not enforce sponsor authorization

Agent endpoints SHALL NOT return HTTP 403 solely because sponsor entitlement is missing or invalid, and SHALL preserve their existing request and success response shapes.

#### Scenario: Direct request to a formerly gated endpoint

- **WHEN** an authenticated caller sends a valid request to a formerly sponsor-gated endpoint without a valid sponsor code
- **THEN** the endpoint continues to its feature-specific validation and execution path
- **THEN** any failure response identifies a non-sponsor prerequisite or input error

### Requirement: Background integrations operate without sponsor state

Public-map publishing, webhook dispatch, Discord bot operation, and multi-time daily restart scheduling SHALL execute without consulting sponsor entitlement.

#### Scenario: Configured background integration has no sponsor code

- **WHEN** a background integration is enabled and its feature-specific configuration is valid
- **THEN** the agent starts or executes that integration without suppressing work because sponsor entitlement is absent

#### Scenario: Multiple daily restart times are saved

- **WHEN** a user saves a daily restart policy containing multiple valid times without a sponsor code
- **THEN** the agent accepts and applies the schedule

### Requirement: Web interface contains no feature locks

The web interface SHALL render formerly gated controls and detailed content as available without fetching license state for authorization. It SHALL NOT display sponsor lock notices, sponsor unlock prompts, lock badges, entitlement-only stars, or disabled states tied to sponsor status.

#### Scenario: User opens a formerly gated feature

- **WHEN** a user without a sponsor code opens a formerly gated tab, modal, action, or details toggle
- **THEN** the normal feature controls or detailed content are rendered
- **THEN** no sponsor unlock message or sponsor-based disabled state is rendered

#### Scenario: Feature data is unsupported for a non-sponsor reason

- **WHEN** a feature cannot run because a required platform, mod, service, or data source is unavailable
- **THEN** the web interface renders the existing feature-specific unsupported or error state
- **THEN** the interface does not describe that failure as a sponsor lock

### Requirement: Every bundled theme is selectable

The pal, silver, emerald, lilac, cherry, and cat theme families SHALL be selectable without sponsor entitlement in both light and dark modes.

#### Scenario: User selects a formerly sponsor-only theme

- **WHEN** a user without a sponsor code selects silver, emerald, lilac, cherry, or cat
- **THEN** the selected theme is applied and persisted through the existing theme preference mechanism
- **THEN** no sponsor badge or locked-theme hint is displayed

### Requirement: Operational prerequisites remain enforced

Removing sponsor authorization SHALL NOT bypass platform compatibility, PalDefender or UE4SS installation, RCON availability, authentication, server running or stopped requirements, input validation, privacy controls, or destructive-action confirmation.

#### Scenario: Feature lacks a required runtime prerequisite

- **WHEN** a formerly sponsor-gated feature is invoked without its required platform, mod, server state, or service
- **THEN** the system rejects or marks the operation unsupported using the existing non-sponsor error behavior

#### Scenario: Destructive action requires confirmation

- **WHEN** a user initiates a destructive formerly gated action such as deleting a guild base
- **THEN** the existing confirmation and validation flow remains required

### Requirement: Sponsorship is voluntary and separate from access

Current UI content and current documentation SHALL describe sponsorship only as voluntary project support and SHALL NOT state or imply that payment, a sponsor code, or license validity unlocks features or themes.

#### Scenario: User views sponsorship content

- **WHEN** a user opens a current sponsorship link, acknowledgement, settings surface, README, announcement, or operational document
- **THEN** sponsorship is presented independently from feature availability
- **THEN** donation links and supporter acknowledgements remain available

### Requirement: License interfaces remain compatibility metadata

The agent license endpoints SHALL retain their existing request and response shapes, and cloud-side sponsor records and administration endpoints SHALL remain intact. License state SHALL NOT affect runtime feature decisions.

#### Scenario: Existing client reads license status

- **WHEN** an existing client requests license status after this change
- **THEN** the agent returns the compatible LicenseStatus data shape
- **THEN** changing that status does not change access to any shipped feature or bundled theme

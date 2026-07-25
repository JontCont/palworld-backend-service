## 1. Shared Access Semantics

- [x] 1.1 Implement Retire sponsor authorization at each owning runtime layer by removing shared feature-gating decisions while retaining only compatibility types or identifiers required by LicenseStatus; Former sponsor features are universally available for every listed feature ID. Verify with focused shared-package tests and a repository search showing no shared helper can deny access from sponsor state.
- [x] 1.2 Implement Preserve license APIs as compatibility-only metadata so GET /api/license, PUT /api/license, and DELETE /api/license retain their request and response contracts while License interfaces remain compatibility metadata with no effect on runtime access. Verify with agent license tests covering missing, invalid, expired, and valid states.

## 2. Agent Runtime Paths

- [x] 2.1 Remove sponsor checks from formerly gated routes so Agent endpoints do not enforce sponsor authorization and valid requests proceed to existing feature-specific validation. Verify with route tests proving missing-license requests never receive a sponsor-specific HTTP 403 while existing platform, mod, server-state, and validation failures remain.
- [x] 2.2 Remove entitlement suppression from public-map publishing, webhook dispatch, Discord bot startup, and multi-time restart handling so Background integrations operate without sponsor state. Verify with focused public-map, webhook, Discord bot manager, and restart-policy tests executed without a valid license.
- [x] 2.3 Preserve every genuine safety and runtime check so Operational prerequisites remain enforced for platform compatibility, required mods, RCON, authentication, server state, privacy, validation, and destructive confirmation. Verify the existing prerequisite tests still pass after sponsor gates are removed.

## 3. Web Experience

- [x] 3.1 Implement Render previously gated UI as ordinary available UI by removing entitlement fetches, SponsorLockNotice, SponsorHint, sponsor-only disabled handlers, badges, and conditional content across feature tabs, modals, dashboard details, player details, and guild details; Web interface contains no feature locks. Verify with web tests or component assertions plus a search showing no runtime lock component or entitlement branch restricts access.
- [x] 3.2 Make pal, silver, emerald, lilac, cherry, and cat ordinary theme options so Every bundled theme is selectable in light and dark modes without sponsor state. Verify theme component tests or assertions confirm each family applies and persists without an entitlement prop.
- [x] 3.3 Remove sponsor-code activation, redemption, validity, machine-binding, and expiration controls from web settings while preserving unrelated settings and voluntary support links. Verify SettingsModal renders no license authorization controls and existing non-license settings tests pass.

## 4. Messaging and Documentation

- [x] 4.1 Implement Separate voluntary sponsorship from access messaging across current UI translations, README variants, current announcements, and operational API, webhook, and Discord bot docs so Sponsorship is voluntary and separate from access. Verify donation links and acknowledgements remain, while targeted searches find no current claim that sponsorship, payment, or a code unlocks features; exclude historical release notes and archived changes.

## 5. Cross-Layer Verification

- [x] 5.1 Implement Verify unrestricted behavior across layers by updating obsolete denial tests and running shared, agent, and web typechecks and test suites. Verify all checks pass and repository searches find no runtime use of hasFeature, featureEnabled, SponsorLockNotice, or SponsorHint as an authorization condition.

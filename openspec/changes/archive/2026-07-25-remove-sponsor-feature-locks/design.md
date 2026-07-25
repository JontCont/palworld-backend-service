## Context

Sponsor entitlement currently crosses four runtime layers. `packages/shared/src/features.ts` defines the gated feature catalog and shared decision helper; agent routes and long-running services call `featureEnabled`; web components call `client.license()` and render disabled or hidden states; `ThemePicker` has a separate `free` flag. Documentation and announcements describe sponsor payment as the way to unlock these paths.

The change must remove all sponsor-dependent behavior without weakening real operational prerequisites such as Windows-only integrations, PalDefender installation, RCON availability, server stopped/running state, input validation, or public-map privacy settings. Existing sponsor records and cloud administration endpoints contain historical data and remain outside the runtime access decision.

## Goals / Non-Goals

**Goals:**

- Make every shipped feature and bundled theme available when no sponsor code exists or when a stored code is invalid, expired, offline, or bound elsewhere.
- Remove sponsor-related lock affordances and activation controls from the web application.
- Ensure direct API calls and background services have the same unrestricted behavior as visible web controls.
- Preserve voluntary sponsorship links and acknowledgements without unlock claims.
- Preserve compatibility for existing local license API callers and cloud-side sponsor administration while decoupling both from feature availability.

**Non-Goals:**

- Removing platform, mod, RCON, server-state, privacy, validation, or safety prerequisites.
- Deleting historical sponsor records or the license administration implementation in `packages/stats`.
- Redesigning features that were previously gated.
- Changing the PolyForm Noncommercial project license.

## Decisions

### Retire sponsor authorization at each owning runtime layer

Remove feature authorization conditions where behavior is owned rather than forcing `hasFeature` to return true indefinitely. Agent routes SHALL stop producing sponsor-specific 403 responses. Public-map publication, webhook dispatch, Discord bot startup, and multi-time restart schedules SHALL stop consulting sponsor state. Web components SHALL stop fetching license state to decide whether controls or content render.

This is preferred over a global always-true shim because dead checks retain misleading contracts and can accidentally become restrictive again. Shared feature identifiers can remain only where required for backward-compatible response shapes; they SHALL NOT control behavior.

### Preserve license APIs as compatibility-only metadata

Keep the existing agent license endpoints and `LicenseStatus` response shape so external clients do not break immediately. Keep cloud-side issue, redeem, deactivate, and administration endpoints and their stored records. The web settings UI SHALL remove sponsor-code activation, redemption, validity, machine-binding, and expiration controls because these no longer affect application behavior.

This separates runtime access from historical supporter administration without requiring a destructive data migration. A later change can deprecate and delete the unused APIs after consumers are measured.

### Render previously gated UI as ordinary available UI

Remove entitlement state, sponsor lock notices, sponsor hints, disabled handlers, lock/star badges, and gated conditional rendering. Existing feature-specific loading and unsupported states remain. Player and guild detail toggles continue to control information density, but opening those toggles no longer requires entitlement. All theme definitions become ordinary selectable themes and `ThemePicker` no longer accepts entitlement.

This is preferred over merely hiding lock notices because hidden notices would not enable content, actions, or background refreshes.

### Separate voluntary sponsorship from access messaging

Keep donation links, supporter credits, and acknowledgements. Update README files, announcements, API documentation, webhook and bot documentation, and translation catalogs so sponsorship is described as voluntary support and never as an unlock prerequisite. Historical release notes remain historical and SHALL NOT be rewritten unless they appear in current UI content.

### Verify unrestricted behavior across layers

Update shared, agent, and web tests that currently assert unauthorized behavior. Add focused coverage proving that a missing or invalid license does not block representative route, background-service, detailed-view, multi-time restart, and theme paths. Retain tests for genuine prerequisites and safety failures.

## Implementation Contract

**Behavior:** A user with no sponsor code can use all feature IDs formerly listed in `EARLY_ACCESS_FEATURES`: `custom-pal`, `guild-map`, `delete-base`, `pal-stats`, `bulk-items`, `teleport`, `log-tools`, `dashboard-stats`, `save-slim`, `leaderboard`, `map-unlocks`, `breeding-calc`, `daily-restart`, `public-map`, `boss-respawn`, and `webhooks`. The silver, emerald, lilac, cherry, and cat theme families are selectable. Player and guild detailed data is visible when the existing details preference is enabled.

**Interfaces and compatibility:** Feature endpoints retain their current request and success response shapes. `GET /api/license`, `PUT /api/license`, and `DELETE /api/license` retain their current response shape for compatibility, but their state has no effect on feature access. Public-map, webhook, Discord bot, and restart settings retain their stored data formats. No database migration is introduced.

**Failure modes:** An endpoint SHALL NOT return 403 solely because sponsor entitlement is absent or invalid. Existing 400 validation errors, 404 lookups, 409 platform/mod/server-state conflicts, authentication failures unrelated to sponsorship, network failures, and tool availability errors remain surfaced through their existing paths. Background services SHALL not silently suppress work due to sponsor state.

**Acceptance criteria:**

- Shared and agent tests pass with no test expecting sponsor-specific denial.
- Representative agent tests prove missing-license access for a previously gated route and execution for webhook/public-map or Discord bot paths.
- Web tests or component assertions prove previously gated controls and all theme families are enabled without license state.
- Repository search finds no runtime use of `hasFeature`, `featureEnabled`, `SponsorLockNotice`, or `SponsorHint` to restrict a feature.
- Repository search finds no current UI or current documentation claim that sponsorship unlocks a feature.
- Package typechecks and the repository test suite pass.

**In scope:** shared gating helpers and catalog semantics; agent route and service authorization; web entitlement rendering; theme availability; current UI translations; current README, announcement, and operational documentation.

**Out of scope:** stats-worker sponsor data deletion; payment provider integration removal; historical release-note rewriting; operational prerequisite removal; feature redesign.

## Risks / Trade-offs

- [Risk] Removing route gates but missing a background-service gate leaves a feature silently inactive. → Mitigation: search every `featureEnabled` injection and add execution-focused tests for long-running services.
- [Risk] Removing web lock components without replacing conditional branches hides content or stops refresh effects. → Mitigation: convert each branch to its normal entitled path and verify representative components without license requests.
- [Risk] Documentation continues to advertise obsolete unlocking behavior in one locale. → Mitigation: search all current Markdown and i18n catalogs for sponsor, unlock, lock, entitlement, and feature IDs, excluding historical release notes and archived changes.
- [Risk] Existing integrations interpret license status as an authorization decision. → Mitigation: preserve the API shape, document that it is compatibility metadata, and remove only application-owned authorization consumers.
- [Trade-off] Compatibility leaves dormant license administration code. → Mitigation: record deletion as a separate future cleanup after downstream usage is known.

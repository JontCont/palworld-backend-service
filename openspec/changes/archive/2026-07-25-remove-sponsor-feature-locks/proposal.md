## Summary

Remove sponsor-license gating so every locally hosted management feature and visual theme is available without a sponsor code.

## Motivation

The application currently advertises controls that become disabled, hidden, or return HTTP 403 unless a valid sponsor code is active. The desired product behavior is that users can access every shipped feature directly, while voluntary sponsorship remains separate from feature availability.

## Proposed Solution

- Make all entries in the shared feature catalog available regardless of license state.
- Remove agent-side sponsor authorization gates that block routes, public-map publishing, webhook delivery, Discord bot operation, and multi-time restart schedules.
- Remove web UI entitlement checks, sponsor lock notices, disabled states, lock/star indicators, and sponsor-code activation controls.
- Make every bundled visual theme selectable without entitlement.
- Keep voluntary sponsorship links and acknowledgements, but revise user-facing documentation and announcements so they do not promise feature unlocking.
- Retain existing cloud-side sponsor records and license administration endpoints for compatibility; they no longer control application functionality.

## Alternatives Considered

- Force the shared `hasFeature` helper to always return true while leaving all entitlement code in place. Rejected because it preserves dead network requests, misleading names, and fragile future lock behavior.
- Hide locked controls without removing backend gates. Rejected because direct API calls and background services would still fail or silently stop.

## Capabilities

### New Capabilities

- `unrestricted-feature-access`: All shipped local-management features and bundled themes are available without a sponsor code, with sponsorship presented only as voluntary support.

### Modified Capabilities

(none)

## Impact

- Affected specs: unrestricted-feature-access
- Affected code:
  - Modified: packages/shared/src/features.ts
  - Modified: packages/agent/src/license.ts
  - Modified: packages/agent/src/routes.ts
  - Modified: packages/agent/src/public-map.ts
  - Modified: packages/agent/src/webhooks.ts
  - Modified: packages/agent/src/discord-bot-manager.ts
  - Modified: packages/web/src
  - Modified: packages/web/public/i18n
  - Modified: README.md
  - Modified: README.en.md
  - Modified: README.ja.md
  - Modified: README.zh-CN.md
  - Modified: announcement.md
  - Modified: packages/web/public/announcement.md
  - Modified: docs/agent-api.md
  - Modified: docs/discord-bot.md
  - Modified: docs/webhooks.md
  - Removed: none

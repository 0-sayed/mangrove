# Asset Inventory

## Verdict

Build custom animated pixel assets from scratch, but wire only the subset needed by the current roadmap task.

This file is the asset contract: names, purpose, animation needs, and roadmap scope.

Keep the current generated atlas and Aseprite pipeline as prototype compatibility evidence. Do not expand the old `packet-*`, `building-api-*`, or `building-queue-*` naming scheme for new gameplay. Each TD task should generate only the asset delta it needs; `TD005` is the main asset-heavy task.

## Asset Rules

- Every gameplay asset gets at least one animated state.
- Source recipes live in `tools/assets/aseprite/recipes/`.
- Generated outputs live in `src/assets/generated/`.
- Runtime exports should be PNG sprite sheets plus JSON metadata.
- Manifest metadata should prove required asset IDs exist.
- Do not commit review screenshots, GIFs, demo scenes, or temporary QA exports.
- Assets should not depend on downloaded starter/vendor packs.
- First TD assets prioritize readability over polish.

## Naming

Use these IDs unless implementation finds a better local convention:

- `map-*` for terrain, roads, build pads, portals, junctions, and core pieces.
- `tower-*` for player-built defenses.
- `enemy-*` for attackers/incidents.
- `projectile-*` for tower shots/beams.
- `effect-*` for one-shot or short-lived feedback.
- `ui-*` for HUD icons, buttons, meters, frames, tooltips, and panels.
- `badge-*` for small software-role/state overlays.

Avoid new first-playable IDs named `packet-*`, `building-api-*`, or `building-queue-*` unless the asset is intentionally preserving prototype compatibility.

## First TD Slice Assets

These assets are required for the corrected first playable.

### Map And Road Assets

| Asset id | Purpose | Size target | Animation |
| --- | --- | --- | --- |
| `map-ground-grass` | Base ground tile | 32x32 | 2-frame grass/sparkle shift |
| `map-road-straight` | Straight enemy road | 32x32 | 3-frame subtle directional flow |
| `map-road-corner` | Road bend | 32x32 | 3-frame directional flow |
| `map-road-fork` | Load-balancer fork/junction | 32x32 or 2x2 | 3-frame branch pulse |
| `map-incident-portal` | Enemy spawn point | 2x2 tiles | 4-frame opening pulse |
| `map-service-core` | Protected town core | 2x2 or 3x3 tiles | 4-frame heartbeat / damage state |
| `map-build-pad` | Empty build location | 2x2 tiles | 3-frame available pulse |
| `map-build-pad-locked` | Locked future build pad | 2x2 tiles | 2-frame dim pulse |
| `map-placement-valid` | Placement feedback | pad-sized overlay | 3-frame green ring |
| `map-placement-invalid` | Invalid placement feedback | pad-sized overlay | 3-frame red shake |

### Tower Assets

| Asset id | Purpose | Size target | Animation |
| --- | --- | --- | --- |
| `tower-worker` | Basic damage tower | 2x2 tiles | `idle`, `attacking`, `saturated`; 3-5 frames each |
| `tower-queue-snare` | Limited stall/buffer tower | 2x2 tiles | `empty`, `holding`, `overflowing`; 3-5 frames each |
| `tower-load-balancer` | Route splitter / fork controller | 2x2 tiles | `idle`, `routing`, `unhealthy-target`; 3-5 frames each |

### Enemy Assets

| Asset id | Purpose | Size target | Animation |
| --- | --- | --- | --- |
| `enemy-request-runner` | Basic fast attacker | 16x16 or 24x24 | 4-frame run/glow loop |
| `enemy-burst-swarm` | Small group attacker | 12-16 px each | 4-frame quick jitter loop |
| `enemy-heavy-payload` | Slow durable attacker | 24x24 or 32x32 | 4-frame heavy march loop |

### Projectile And Effect Assets

| Asset id | Purpose | Size target | Animation |
| --- | --- | --- | --- |
| `projectile-worker-shot` | Worker Tower attack | 16x16 or beam segment | 3-5 frame shot/beam |
| `effect-hit` | Enemy hit feedback | 24x24 | 4-frame impact |
| `effect-enemy-resolved` | Enemy defeated/resolved | 32x32 | 6-frame green/cyan burst |
| `effect-leak` | Enemy reaches Service Core | 32x32 or core overlay | 6-frame red impact |
| `effect-budget-gain` | Reward earned | HUD/map flash | 4-frame coin/data sparkle |
| `effect-health-loss` | Town Health falls | HUD/core flash | 4-frame red pulse |
| `effect-range-ring` | Tower range preview | scalable ring | 4-frame shimmer |
| `effect-coverage-link` | Shows connected tower/road influence | line or tile overlay | 3-frame pulse |
| `effect-support-aura` | Shows tower support radius | scalable aura | 4-frame soft pulse |
| `effect-route-arrow` | Shows Load Balancer route choice | directional overlay | 4-frame arrow pulse |
| `effect-weak-coverage` | Warns that a lane or routed branch is under-defended | road/pad overlay | 4-frame warning blink |
| `effect-stall-hold` | Queue Snare holding enemies | 32x32 | 4-frame amber lock/loop |
| `effect-route-split` | Load Balancer Gate routes enemy | 32x32 | 4-frame branch pulse |
| `effect-wave-start` | Wave starts | screen/map overlay | 6-frame warning sweep |
| `effect-wave-end` | Wave ends | screen/map overlay | 6-frame settle/checkmark |

### HUD And UI Assets

| Asset id | Purpose | Size target | Animation |
| --- | --- | --- | --- |
| `ui-frame-hud` | Compact pixel HUD frame | scalable 9-slice | 2-frame idle/alert border |
| `ui-icon-town-health` | Town Health meter icon | 16x16 or 24x24 | 3-frame healthy/damaged pulse |
| `ui-icon-build-budget` | Build Budget icon | 16x16 or 24x24 | 3-frame earn/spend sparkle |
| `ui-icon-pressure` | Pressure meter icon | 16x16 or 24x24 | 3-frame stack/warning pulse |
| `ui-button-build-worker` | Worker Tower build control | compact button | hover/pressed/affordable states |
| `ui-button-build-queue-snare` | Queue Snare build control | compact button | hover/pressed/affordable states |
| `ui-button-build-load-balancer` | Load Balancer build control | compact button | hover/pressed/affordable states |
| `ui-wave-preview` | Upcoming wave preview frame | compact panel | 2-frame open/attention state |
| `ui-tooltip-panel` | Concise hover tooltip frame | scalable 9-slice | 2-frame subtle scan/fill |

## Prototype Compatibility Assets

These existing generated ideas may remain temporarily while runtime code still renders the Message Festival prototype:

| Prototype asset | New meaning |
| --- | --- |
| `building-worker-yard` | Compatible stand-in for `tower-worker` |
| `building-queue-hub` | Compatible stand-in for `tower-queue-snare` |
| `building-api-gate` | Later Validation/API Gate or map checkpoint |
| `building-db-vault` | Stand-in for `map-service-core` or later DB Vault |
| `packet-useful` / `packet-flood` | Stand-ins for `enemy-request-runner` / `enemy-burst-swarm` |
| `ui-icon-trust` | Stand-in for `ui-icon-town-health` |
| `ui-icon-backlog` | Stand-in for `ui-icon-pressure` |

Do not expand the prototype naming scheme. New gameplay assets should use the TD names above.

## Soon-After Assets

Add these after the first TD loop works:

- `tower-validation-gate`
- `tower-cache-kiosk`
- `tower-observability`
- `tower-dlq-station`
- `enemy-malformed-glitch`
- `enemy-replay-phantom`
- `enemy-poison-payload`
- `effect-validation-reject`
- `effect-cache-hit`
- `effect-duplicate-neutralized`
- `effect-quarantine`
- `effect-hidden-trait-revealed`

## Experience Layer Assets

Keep these as style and future-polish targets so Production Town feels inhabited rather than abstract:

- Tiny operators for major tower families: worker artificer, queue keeper, load balancer marshal, validation scribe, cache runner, DB warden.
- Low-contrast civic ambience: market banners, lantern strings, data fireflies, signal smoke, notice boards, bridge/canal props.
- Crowd state sets: calm town, alarmed town, celebration, evacuation, queue line pressure.
- Interaction feedback: slot hover, tower selected, command ping, affordable/unaffordable flash, upgrade applied, invalid action.
- Recap/transition effects: wave countdown, incident arrival, recap open, perfect wave, near-miss leak, system recovered.

These assets should not block the first TD loop. They become wiring targets only when readability and play are already working.

## Deferred Assets

Delay until the gameplay needs them:

- Docker/AWS/deployment meta assets.
- CI/CD release gate assets.
- AI-assisted workflow helpers.
- Operator portrait sets.
- Campaign map.
- Multiplayer raid UI.

## Production Order

1. Roads, Incident Portal, Service Core, and build pads.
2. Worker Tower, Request Runner, hit/resolved/leak effects.
3. Queue Snare, Burst Swarm, stall/overflow effects, and coverage-link preview.
4. Load Balancer Gate, road fork, Heavy Payload, route-split effects, route arrows, and weak-coverage warning.
5. HUD icons, build buttons, wave preview, tooltip panel.
6. Browser smoke assets and manifest coverage check.

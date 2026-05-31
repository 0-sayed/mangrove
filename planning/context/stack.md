# Production Town Stack

## Verdict

Keep the browser-first architecture:

- React + Vite + TypeScript for the app shell.
- Phaser 3 for the 2D battlefield.
- A pure TypeScript simulator for deterministic game rules.
- Runtime schemas for authored content.
- Vitest and browser smoke tests for confidence.
- Repo-owned pixel assets generated through the Aseprite pipeline.

Do not add a real backend, Tiled map authoring, multiplayer, accounts, or a custom game engine in v0.

## Architecture Boundary

Default data flow:

```txt
React UI
  sends player commands
        |
        v
Pure TypeScript simulator
  updates deterministic game state
        |
        v
React HUD + Phaser battlefield
  render snapshots and events
```

The simulator decides what happened. React and Phaser show what happened.

Simulator rules:

- No React imports.
- No Phaser imports.
- No browser APIs.
- No timers.
- No `Math.random` or `Date.now` in gameplay logic.
- Deterministic command inputs.
- Stable state hashing for replay tests.

## Runtime Vocabulary

The active runtime should pivot from message lifecycle vocabulary to tower-defense vocabulary.

### Content Types

`LevelConfig` should include:

- `id`
- `mapId`
- `startingState`
- `availableTowers`
- `startingTowers`
- `waves`
- `winCondition`
- `lossCondition`
- `recaps`

`MapDef` should include:

- `paths`
- `spawnPoints`
- `serviceCore`
- `buildPads`
- `junctions`
- `terrain`

`PathDef` should include:

- `id`
- ordered waypoints
- `spawnId`
- `exitId`
- optional branch/junction metadata

`BuildPadDef` should include:

- `id`
- position
- allowed tower families
- lane influence or range anchor

`TowerDef` should include:

- `id`
- `family`
- `cost`
- `range`
- `targeting`
- `stats`
- `states`
- `softwareShadow`

`EnemyDef` should include:

- `id`
- `health`
- `speed`
- `reward`
- `leakDamage`
- `traits`
- `softwareShadow`

`WaveDef` should include:

- `id`
- `preview`
- `spawnSchedule`
- `enemyTypes`
- `buildCountdownTicks`
- `recapId`

### Commands

First TD slice commands:

- `BuildTower`
- `UpgradeTower`
- `StartWave`
- `SelectTower`
- `CancelBuildMode`

`StartWave` may remain for development and early player agency, but the target design supports build countdowns and auto-starting waves.

### View/Input Contracts

Define shared view-facing contracts before splitting Phaser and React work:

- `BuildIntent`: selected tower family, affordability state, hovered build pad, and placement validity.
- `SelectionState`: selected tower, selected enemy, or empty selection.
- `HoverState`: hovered build pad, tower, enemy, HUD control, or empty hover.
- `RangePreview`: tower family or placed tower ID plus center/radius data.
- `ConnectionPreview`: influenced roads, linked towers, support radius, route destinations, and weak-coverage warnings for the current hover/selection.
- `WavePreview`: next wave ID, enemy composition, countdown, and short game-facing warning.

React may create build intent from HUD controls. Phaser may update hover/selection intent from battlefield pointers. The simulator still owns whether commands are accepted.

### Snapshot

`SimSnapshot` should include:

- `tick`
- `phase`
- `meters`
- `map`
- `towers`
- `enemies`
- `projectiles`
- `effects`
- `wave`
- `connections`
- `alerts`

`meters` should include:

- `townHealth`
- `buildBudget`
- `pressure`

### Events

`SimEvent` should include enough information to animate:

- Enemy spawned.
- Enemy moved or path progress changed.
- Tower built.
- Tower targeted.
- Projectile fired.
- Enemy damaged.
- Enemy slowed/held/routed.
- Component influence changed.
- Weak coverage or overload warning changed.
- Enemy resolved.
- Enemy leaked.
- Town Health changed.
- Budget changed.
- Wave started.
- Wave ended.

## Systems

Suggested simulator systems:

- `WaveSystem`: schedules enemy spawns and wave end conditions.
- `PathSystem`: moves enemies along authored paths.
- `TowerSystem`: finds targets and applies tower effects.
- `ConnectionSystem`: derives coverage overlap, support links, route influence, and weak-coverage warnings from towers, pads, paths, and active enemies.
- `ProjectileSystem`: resolves visible attacks and hit timing where needed.
- `LeakSystem`: damages Town Health when enemies reach the Service Core.
- `EconomySystem`: awards and spends Build Budget.
- `PressureSystem`: derives pressure from enemy count, lane risk, and near-leaks.

Delay backend-pipeline systems such as `QueueSystem` and `WorkerSystem` as literal lifecycle stages. Their concepts reappear as tower families: Queue Snare and Worker Tower.

## Render Contract

Phaser owns:

- Map drawing.
- Road/path rendering.
- Enemy sprites moving along paths.
- Tower sprites and attack animations.
- Projectiles, hit effects, leak effects, and range previews.
- Pointer input over the battlefield.

React owns:

- HUD.
- Build buttons.
- Wave preview.
- Tower selection/upgrade panel.
- Recap.
- Settings/diagnostics when enabled.

Neither Phaser nor React owns game truth.

## Asset Pipeline

Use:

- Aseprite Lua recipes as source instructions.
- Generated `.aseprite` sources for editable assets.
- PNG sprite sheets and JSON atlas metadata for Phaser.
- Manifest metadata to verify coverage.

Generated outputs live under `src/assets/generated/`. Recipes live under `tools/assets/aseprite/recipes/`.

Do not commit review screenshots, GIFs, demo scenes, or temporary QA exports.

## Testing Stack

Use the smallest test that proves the change:

- Content/schema tests for level, map, tower, enemy, and wave definitions.
- Simulator tests for deterministic movement, targeting, damage, leaks, rewards, and wave end.
- React tests for HUD/build controls.
- Phaser/browser smoke tests for visible canvas, HUD, no blocking console errors, and nonblank battlefield.

Browser smoke should verify the play screen reads as tower defense: visible roads, build pads, towers, enemies, and Service Core.

## Migration Boundary

Current runtime still contains the Message Festival prototype. The safe course is:

1. Keep T013 asset/render work as prototype evidence.
2. Land the planning correction.
3. Start the TD runtime refactor from new roadmap tasks.
4. Do not rename every existing runtime type in this planning branch.

The first implementation task after this pivot should create the TD schemas and simulator contracts before touching Phaser animation polish.

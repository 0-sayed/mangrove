# Production Town Stack

## Verdict

Use a browser-first stack:

- React + Vite + TypeScript for the app shell.
- Phaser 3 for the 2D battlefield.
- A pure TypeScript simulator for game rules.
- Vitest for simulator and content tests.
- Runtime schemas for content validation.
- Pixel-art assets with a simple sprite/atlas pipeline.

Do not add a real backend, Tiled map authoring, multiplayer, accounts, or a custom game engine in v0.

## Why This Stack

The first playable must prove that the game is fun, readable, and useful for learning backend concepts.

The stack should optimize for:

- Fast iteration.
- Good visual feedback.
- Testable game rules.
- Simple asset creation.
- Easy expansion after the first playable works.

Coding agents can do heavy implementation work, but extra frameworks still create integration risk. The v0 stack should include tools that improve the first playable directly, not tools that only help later systems.

## Core Runtime

### React

Use React from v0 for:

- HUD.
- Buttons.
- Wave start and recap screens.
- Upgrade panels.
- Resource meters.
- Future handbook, menus, level selection, and editor screens.

React should not own game rules.

### Phaser 3

Use Phaser 3 for:

- Battlefield rendering.
- Sprites.
- Animation.
- Tweens.
- Particles.
- Camera.
- Pointer input on the battlefield.
- Audio.
- Scene orchestration.

Phaser should not own game truth.

### Pure TypeScript Simulator

Use a pure TypeScript simulator for:

- Waves.
- Message spawning.
- Message lifecycle.
- Queues.
- Workers.
- Trust, Budget, and Backlog.
- Win/loss state.
- Replay and deterministic tests.

This does not mean building a custom game engine. Phaser remains the game engine. The simulator is only the deterministic rules layer.

The simulator must not import Phaser, React, browser APIs, timers, or rendering code.

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

The simulator decides what happened.

React and Phaser show what happened.

## First Playable Package Choices

Use:

- `react`
- `react-dom`
- `phaser`
- `typescript`
- `vite`
- `vitest`
- `@vitejs/plugin-react`
- `pure-rand`
- `@sinclair/typebox` + `ajv`, or `zod`

Recommended schema choice:

- Use `@sinclair/typebox` + `ajv` if level/content JSON and future editor validation matter most.
- Use `zod` if developer speed and simpler TypeScript ergonomics matter most.

Default recommendation: `@sinclair/typebox` + `ajv`, because this project will likely have authored content and level files.

## Simulator Contract

Suggested simulator API:

- `createGame(config, seed)`
- `step(state, commandsForTick)`
- `hashState(state)`

Suggested systems:

- `WaveSystem`
- `PathSystem`
- `QueueSystem`
- `WorkerSystem`
- `ResourceSystem`

First playable commands:

- `PlaceBuilding`
- `StartWave`
- `SetWorkerCount`

Full MVP may add:

- `UpgradeBuilding`

Simulator requirements:

- Fixed ticks.
- Seeded randomness.
- Command inputs.
- Plain state objects.
- Integer or stable deterministic math for core state.
- Stable state hash serialization for tests.
- No `Math.random` in gameplay logic.
- No `Date.now` in gameplay logic.
- No unordered object iteration affecting gameplay outcomes.
- No Phaser imports.
- No React imports.

Replay means replaying player commands against the deterministic simulator and checking state hashes. It does not mean video replay or full timeline editing.

## First Playable Data Contracts

Define these v0 TypeScript types and runtime schemas before runtime content loading.

`LevelConfig` must include:

- `id`
- `mapId`
- `startingState`
- `startingBuildings`
- `availableBuildings`
- `waves`
- `winCondition`
- `lossCondition`
- `recaps`

`MapMetadata` must include:

- Stable path ids.
- Stable build slot ids.
- Spawn ids.
- Exit ids.
- Slot role constraints.

`BuildingDef` must include:

- `id`
- `role`
- `cost`
- `allowedSlots`
- `stats`
- `visibleStates`

`WaveDef` must include:

- `id`
- `durationTicks`
- `spawnSchedule`
- `messageTypes`
- `timeoutTicks`
- `recapId`

`Command` must be a discriminated union:

- `StartWave`
- `PlaceBuilding`
- `SetWorkerCount`

`UpgradeBuilding` is allowed in the full MVP contract, but not in the first playable command set.

`SimSnapshot` must include:

- `tick`
- `phase`
- `meters`
- `buildings`
- `messages`
- `lanePressure`
- `alerts`

`SimEvent` must include enough event types to drive animation and recap:

- Message spawned.
- Message accepted.
- Message queued.
- Message dropped.
- Worker started.
- Worker acked.
- Trust changed.
- Budget changed.
- Backlog changed.
- Wave ended.

`PostWaveResult` must include:

- `waveId`
- Delivered count.
- Dropped count.
- Expired count.
- Backlog peak.
- Trust delta.
- Budget delta.
- Player actions used.
- Revealed backend term.
- Revealed law.

## Render Contract

React may:

- Dispatch player commands.
- Render HUD, buttons, panels, meters, recaps, menus, and future handbook screens.
- Subscribe to simulator snapshots and derived view state.

React must not:

- Mutate gameplay state directly.
- Own timing or random gameplay outcomes.

Phaser may:

- Dispatch battlefield player commands.
- Render simulator snapshots.
- Map message progress to sprite positions.
- Map building visible states to animation states.
- Play visual/audio feedback from simulator events.

Phaser must not:

- Mutate gameplay state directly.
- Use Phaser physics as the source of gameplay truth.
- Depend on Phaser time for simulation outcomes.

Phaser tweens and particles are visual only.

## Content Authoring Contract

For v0, the first map may be authored as TypeScript or JSON constants.

Content owns:

- Map id.
- Scenario.
- Starting buildings.
- Starting resources/meters.
- Wave sequence.
- Incident behavior.
- Available buildings and upgrades.
- Build slots.
- Costs.
- Win and loss conditions.
- Concept unlocks.
- Post-wave recap copy.

The first playable can hard-code parts of Message Festival, but adding or changing waves should not require rewriting game code.

Level JSON and map metadata must have v0 schema validation before runtime loading.

## Deferred Stack

### Backend

Do not build a backend in v0.

The game's backend concepts are simulated locally. A real backend is only needed later for:

- Accounts.
- Cloud saves.
- Multiplayer.
- Async raids.
- Leaderboards.
- Shared user-created levels.
- Campaign progress across devices.

For v0, use local browser state only if saving is needed.

Allowed local storage:

- `localStorage` for tiny settings or completion flags.
- IndexedDB later if local save data becomes larger.

### Tiled

Do not use Tiled for the first playable.

The first map should be hardcoded through stable content IDs, not scattered Phaser coordinates.

Allowed first playable map data:

- `spawn_festival_gate`
- `slot_ingress_1`
- `slot_worker_1`
- `slot_queue_1`
- `exit_storage_1`
- authored path points
- authored build slot positions

Add Tiled only when:

- the first playable loop is fun,
- a second map is being authored,
- hand-editing path or slot coordinates becomes the bottleneck.

### ECS

Do not use an ECS library in v0.

Consider `bitECS` later only if entity count or system complexity becomes hard to manage with plain TypeScript state and systems.

### Godot, PixiJS, Kaboom, Excalibur, Plain Canvas

Do not use these for v0.

- Godot web export adds a separate engine/editor/export workflow.
- PixiJS and plain Canvas are too low-level for this game.
- Kaboom is better for tiny arcade prototypes than this RTS/tower-defense shape.
- Excalibur is viable, but Phaser has the stronger ecosystem for this browser strategy slice.

## Assets And Animation

Use a pixel-art-ish style.

Target style:

- Cozy cyber-medieval pixel town.
- 32x32 or 48x48 chunky sprites.
- Strong silhouettes.
- Clear state changes.
- Short 3-5 frame animation loops.
- Readable at zoomed-out battlefield scale.

Theme:

Production Town is a tiny digital festival town. API gates, queues, workers, validators, and storage vaults are buildings. Incidents arrive as animated message creatures or packets. The player keeps flow alive by defending Trust, Budget, and Backlog.

Asset priorities:

1. Readability.
2. Feedback.
3. Consistent silhouette.
4. Charm.
5. Polish.

First playable assets:

- API Gate building.
- Worker Yard building.
- Queue Hub building.
- Useful message packet.
- Dropped message effect.
- Ack/delivery effect.
- Backlog/saturation effect.
- Simple lane/path visuals.
- Trust, Budget, and Backlog UI icons.

## Asset Tools

Recommended tools:

- Pixelorama for free/open-source pixel art and frame animation.
- Aseprite if a stronger paid pixel-art workflow is wanted.
- Kenney assets for placeholder/prototype art.
- Free Texture Packer or Phaser Texture Atlas Creator for atlas generation.
- AI image generation for concept art and style exploration, followed by pixel cleanup.

Preferred v0 workflow:

1. Start with the downloaded starter assets plus simple readable overlays.
2. Build the playable loop.
3. Replace only the most important sprites with custom pixel art.
4. Pack repeated sprites into an atlas when asset count grows.

Do not block gameplay implementation on polished art.

## Testing Stack

Use Vitest for:

- simulator replay tests,
- deterministic state hash tests,
- content schema validation tests,
- sim-boundary tests that prevent Phaser or React imports inside `sim/`.

Use Playwright later for:

- browser smoke tests,
- visual sanity checks,
- ensuring the canvas is nonblank,
- checking HUD interactions.

Do not build a large browser test suite before the first playable loop exists.

## Source Layout

Suggested initial layout:

```txt
src/
  app/
    React shell, HUD, panels, recap
  game/
    Phaser scenes, sprites, render adapter
  sim/
    deterministic rules and systems
  content/
    first playable data, schemas, authored map constants
  assets/
    sprites, atlases, generated art
  tests/
    simulator and content tests
```

## Non-Negotiable Rules

- No gameplay truth in React.
- No gameplay truth in Phaser.
- No Phaser imports inside `sim/`.
- No React imports inside `sim/`.
- No `Math.random` in simulator logic.
- No `Date.now` in simulator logic.
- Use seeded randomness.
- Keep map IDs stable even before Tiled exists.
- Do not add backend until a real online feature needs it.
- Do not add Tiled until map authoring becomes a real bottleneck.
- Do not add art polish before the game loop is playable.

## First Implementation Order

1. Set up React + Vite + Phaser + TypeScript.
2. Create the pure simulator with Wave 1 and Wave 2.
3. Add Vitest replay/hash tests.
4. Render the sim in Phaser with placeholder pixel assets.
5. Build the HUD and recap in React.
6. Improve the minimum assets needed for readability.
7. Decide whether Tiled or backend is justified after the first playable is fun.

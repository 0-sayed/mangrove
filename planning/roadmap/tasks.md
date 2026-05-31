# Production Town Roadmap Tasks

This file is the agent-pickable roadmap after bootstrap. Bootstrap owns generic repo/app setup. This file owns game behavior.

## Roadmap Rules

- Pick the lowest unblocked active task.
- Tasks in the same execution wave have no dependencies on each other and may be planned or implemented in parallel.
- Do not implement deferred features early.
- Keep simulator truth separate from React and Phaser.
- Every mechanic must create visible gameplay feedback and have a real software concept shadow.
- Learning text appears after play, not before it.

## Course Correction

T001-T013 produced useful prototype infrastructure, but the active game direction is now real tower defense:

- Enemies move along roads toward a protected Service Core.
- The player builds towers on pads.
- Towers attack, stall, route, filter, reveal, or support.
- Leaks damage Town Health.
- Resolved enemies award Build Budget.
- Waves escalate through enemy composition and route pressure.
- Backend concepts appear as mechanic shadows and recaps, not as the literal board path.

Do not continue extending `API -> Queue -> Worker -> Storage` as the core loop.

## Historical / Transitional Prototype Tasks

These tasks remain historical context and should not be used as the future design center.

| Task                                                         | Status      | Note                                      |
| ------------------------------------------------------------ | ----------- | ----------------------------------------- |
| `T001` - Define first playable content schemas               | Done        | Prototype content schemas                 |
| `T002` - Author Message Festival v0 content                  | Done        | Prototype level content                   |
| `T003` - Create deterministic simulator core                 | Done        | Keep deterministic boundary               |
| `T004` - Implement message lifecycle                         | Done        | Prototype lifecycle, not future core      |
| `T005` - Implement first playable commands                   | Done        | Command pattern remains useful            |
| `T006` - Add Wave 1 Opening Flow                             | Done        | Prototype wave                            |
| `T007` - Add Wave 2 Flood Wave                               | Done        | Merged to `main`; prototype pressure test |
| `T008` - Add simulator replay and boundary tests             | Superseded  | Replace with TD replay tests              |
| `T009` - Create Phaser battlefield scene                     | Done        | Renderer foundation remains useful        |
| `T010` - Connect Phaser input to simulator commands          | Done        | Input bridge remains useful               |
| `T011` - Build React HUD and run controls                    | Done        | HUD foundation remains useful             |
| `T012` - Add first playable wave recap                       | Superseded  | Replace with TD post-wave recap           |
| `T013` - Wire custom Aseprite assets and readable overlays   | Here we changed the course of our game | Keep as prototype asset/render evidence   |

## Active TD Roadmap

Build one short local browser tower-defense level with three readable waves. The player should:

- Read the next wave preview.
- Build a Worker Tower on a fixed pad.
- Watch enemies move down the road toward the Service Core.
- Add Queue Snare when swarm pressure appears.
- Use Load Balancer Gate when route pressure splits.
- Survive the wave set and see a concise recap.

- One authored map with a road, build pads, fork, Incident Portal, and Service Core.
- Three waves: Normal Flow, Burst Surge, Hot Shard.
- Three towers: Worker Tower, Queue Snare, Load Balancer Gate.
- Three enemies: Request Runner, Burst Swarm, Heavy Payload.
- Three meters: Town Health, Build Budget, Pressure.
- Deterministic simulator with replay/hash tests.
- Phaser renders roads, towers, enemies, projectiles, hits, leaks, and range previews.
- Component connections are visible through coverage overlap, stall windows, route influence, support radius, and weak-coverage warnings.
- React renders HUD, build controls, wave preview, hover tooltips, and recap.
- Custom Aseprite-generated assets support tower-defense readability.

## Task Graph

| Task                                                            | Done | Depends On        | Contract                                |
| --------------------------------------------------------------- | ---- | ----------------- | --------------------------------------- |
| `TD001` - Define TD content and runtime contracts               | [x]  | course correction | `planning/context/td-task-contracts.md` |
| `TD002` - Implement enemy travel, waves, leaks, and economy     | [x]  | `TD001`           | `planning/context/td-task-contracts.md` |
| `TD003` - Implement tower combat, stall, and routing            | [x]  | `TD002`           | `planning/context/td-task-contracts.md` |
| `TD004` - Author first TD level content                         | [x]  | `TD001`           | `planning/context/td-task-contracts.md` |
| `TD005` - Render TD combat readability in Phaser                | [ ]  | `TD003`, `TD004`  | `planning/context/td-task-contracts.md` |
| `TD006` - Build TD HUD, build controls, and tooltips            | [ ]  | `TD005`           | `planning/context/td-task-contracts.md` |
| `TD007` - Add TD recap, balance, and browser smoke              | [ ]  | `TD006`           | `planning/context/td-task-contracts.md` |

## Execution Waves

Create each branch from updated `main` after the previous wave lands. Same-wave branches should be siblings, not branches of each other.

| Wave | Done | Parallel Tasks     | Branches                                                                  |
| ---- | ---- | ------------------ | ------------------------------------------------------------------------- |
| 1    | [x]  | `TD001`            | `feat/td001-contracts`                                                    |
| 2    | [x]  | `TD002`, `TD004`   | `feat/td002-travel-leaks-economy`, `feat/td004-first-level-content`       |
| 3    | [x]  | `TD003`            | `feat/td003-tower-combat-routing`                                         |
| 4    | [ ]  | `TD005`            | `feat/td005-phaser-combat-readability`                                    |
| 5    | [ ]  | `TD006`            | `feat/td006-hud-build-controls`                                           |
| 6    | [ ]  | `TD007`            | `feat/td007-recap-balance-smoke`                                          |

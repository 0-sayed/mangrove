# Production Town Roadmap Tasks

This file is the agent-pickable roadmap after bootstrap.

Start these tasks only after `bootstrap.md` has created the runnable React + Vite + Phaser + TypeScript project shape, test setup, and source folders. Bootstrap owns generic repo/app setup. This file owns game behavior.

## Roadmap Rules

- Pick the lowest unblocked task.
- Tasks in the same execution wave have no dependencies on each other and may be planned or implemented in parallel.
- Do not implement deferred features early.
- Keep simulator truth separate from React and Phaser.
- Every gameplay mechanic must produce visible feedback and have a real backend concept shadow.
- Learning text appears after play, not before it.

## First Playable Target

Build a 2-3 minute local browser game slice:

- One authored Message Festival map.
- Two waves: Opening Flow and Flood Wave.
- API Gate and Worker Yard preplaced.
- Queue Hub placeable after Wave 1.
- One tuning command: `SetWorkerCount` from 1 to 2.
- Three meters: Trust, Budget, Backlog.
- Deterministic simulator with replay/hash tests.
- Phaser renders the battlefield.
- React renders HUD, build/tuning controls, and wave recap.
- Starter assets plus small readable overlays prove the visual language.

## Task Graph

| Task                                                    | Depends On             | Context                                                          |
| ------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| [x] `T001` - Define first playable content schemas      | bootstrap complete     | `planning/context/game-design.md`, `planning/context/stack.md`   |
| [x] `T002` - Author Message Festival v0 content         | `T001`                 | `planning/context/game-design.md`                                |
| [x] `T003` - Create deterministic simulator core        | `T001`                 | `planning/context/stack.md`                                      |
| [x] `T004` - Implement message lifecycle                | `T002`, `T003`         | `planning/context/game-design.md`                                |
| [x] `T005` - Implement first playable commands          | `T004`                 | `planning/context/game-design.md`, `planning/context/stack.md`   |
| [ ] `T006` - Add Wave 1 Opening Flow                    | `T004`, `T005`         | `planning/context/game-design.md`                                |
| [ ] `T007` - Add Wave 2 Flood Wave                      | `T006`                 | `planning/context/game-design.md`                                |
| [ ] `T008` - Add simulator replay and boundary tests    | `T007`                 | `planning/context/stack.md`                                      |
| [ ] `T009` - Create Phaser battlefield scene            | `T002`, `T004`         | `planning/context/stack.md`                                      |
| [ ] `T010` - Connect Phaser input to simulator commands | `T005`, `T009`         | `planning/context/stack.md`                                      |
| [ ] `T011` - Build React HUD and run controls           | `T005`                 | `planning/context/game-design.md`, `planning/context/stack.md`   |
| [ ] `T012` - Add first playable wave recap              | `T007`, `T011`         | `planning/context/game-design.md`                                |
| [ ] `T013` - Wire starter assets and readable overlays  | `T009`, `T011`         | `planning/context/art-direction.md`, `planning/context/stack.md` |
| [ ] `T014` - Browser smoke test the first playable      | `T008`, `T012`, `T013` | `planning/context/game-design.md`, `planning/context/stack.md`   |
| [ ] `T015` - Tune first playable balance                | `T014`                 | `planning/context/game-design.md`                                |
| [ ] `T016` - First playable review gate                 | `T015`                 | `planning/context/game-design.md`                                |
| [ ] `T017` - Decide custom asset pipeline               | `T016`                 | `planning/context/art-direction.md`, `planning/context/stack.md` |
| [ ] `T018` - Add DB Vault as placeable storage          | `T016`                 | `planning/context/game-design.md`                                |
| [ ] `T019` - Add Validation Gate and Noise Swarm        | `T018`                 | `planning/context/game-design.md`                                |
| [ ] `T020` - Add Replay Phantom retry pressure          | `T019`                 | `planning/context/game-design.md`                                |
| [ ] `T021` - Add Poison Packet Boss                     | `T020`                 | `planning/context/game-design.md`                                |
| [ ] `T022` - Add Compute meter                          | `T021`                 | `planning/context/game-design.md`                                |
| [ ] `T023` - Add post-run learning memory               | `T021`                 | `planning/context/game-design.md`                                |
| [ ] `T024` - Add second-surface transfer scenario       | `T023`                 | `planning/context/game-design.md`                                |

## Execution Waves

Each wave is the earliest parallel stage for those tasks. Tasks in the same wave have no dependencies on each other. Create each task branch from updated `main` after the previous wave lands; same-wave branches should be siblings, not branches of each other.

| Wave | Parallel Tasks         | Branches                                                                  |
| ---- | ---------------------- | ------------------------------------------------------------------------- |
| 1    | `T001`                 | `feat/t001-content-schemas`                                               |
| 2    | `T002`, `T003`         | `feat/t002-message-festival-content`, `feat/t003-sim-core`                |
| 3    | `T004`                 | `feat/t004-message-lifecycle`                                             |
| 4    | `T005`, `T009`         | `feat/t005-playable-commands`, `feat/t009-phaser-battlefield`             |
| 5    | `T006`, `T010`, `T011` | `feat/t006-opening-flow`, `feat/t010-phaser-input`, `feat/t011-react-hud` |
| 6    | `T007`, `T013`         | `feat/t007-flood-wave`, `feat/t013-starter-assets-overlays`               |
| 7    | `T008`, `T012`         | `feat/t008-replay-boundary-tests`, `feat/t012-wave-recap`                 |
| 8    | `T014`                 | `feat/t014-browser-smoke-first-playable`                                  |
| 9    | `T015`                 | `feat/t015-balance-first-playable`                                        |
| 10   | `T016`                 | `feat/t016-first-playable-review`                                         |
| 11   | `T017`, `T018`         | `feat/t017-asset-pipeline`, `feat/t018-db-vault`                          |
| 12   | `T019`                 | `feat/t019-validation-gate-noise-swarm`                                   |
| 13   | `T020`                 | `feat/t020-replay-phantom`                                                |
| 14   | `T021`                 | `feat/t021-poison-packet-boss`                                            |
| 15   | `T022`, `T023`         | `feat/t022-compute-meter`, `feat/t023-learning-memory`                    |
| 16   | `T024`                 | `feat/t024-second-surface-transfer`                                       |

## Explicitly Deferred

- Multiplayer.
- Async raids.
- Accounts.
- Real backend.
- Tiled map authoring.
- Procedural maps.
- Freeform path editing.
- Campaign.
- User-generated levels.
- Full replay browser.
- Large browser test suite.
- High-polish art pass before the loop is proven.
- Aseprite or MCP asset automation before the first playable is proven.

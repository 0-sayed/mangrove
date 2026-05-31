# TD Task Contracts

This file holds the detailed acceptance contracts for tasks listed in `planning/roadmap/tasks.md`.

`tasks.md` should stay as the agent-pickable task index and execution-wave table. Put detailed task scope here or in the relevant context file.

## TD001 - Define TD Content And Runtime Contracts

Goal:

- Replace active content contracts with map/path/build-pad/tower/enemy/wave definitions and shared runtime contracts.

Must cover:

- `MapDef`
- `PathDef`
- `BuildPadDef`
- `TowerDef`
- `EnemyDef`
- `WaveDef`
- `LevelConfig`
- `Command`
- `SimSnapshot`
- `SimEvent`
- `BuildIntent`
- `SelectionState`
- `HoverState`
- `RangePreview`
- `ConnectionPreview`
- `WavePreview`
- Runtime schema validation tests.

Do not implement combat here.

## TD002 - Implement Enemy Travel, Waves, Leaks, And Economy

Goal:

- Add deterministic wave spawning, enemy path travel, leak damage, build budget rewards, and replay/hash tests.

Must cover:

- Enemy movement by path progress.
- Wave spawn schedule and wave phase transitions.
- Town Health loss on leaks.
- Build Budget rewards.
- Pressure derived from active enemies and near-leaks.
- Deterministic replay/hash tests.

Do not implement tower targeting, projectiles, stall, or routing here.

## TD003 - Implement Tower Combat, Stall, And Routing

Goal:

- Add the first tower mechanics on top of the deterministic travel core.

Must cover:

- Build Tower command validation.
- Tower range checks.
- Worker Tower damage.
- Queue Snare hold/release capacity.
- Load Balancer Gate route choice at a fork.
- Component synergy rules: Queue Snare creates a stall window for nearby Worker Towers; Load Balancer Gate prefers routes with healthier downstream coverage.
- Weak-coverage and overload warnings derived from tower/path state.
- Enemy resolved events.
- Projectile/effect event payloads for rendering.

Do not make Phaser own gameplay truth.

## TD004 - Author First TD Level Content

Goal:

- Create `Traffic Surge At The Gate` as the first real TD level.

Must include:

- One main road.
- One Service Core.
- One Incident Portal.
- Worker/Queue/Load Balancer build pads.
- Pad placement that creates at least one clear Worker + Queue synergy and one Load Balancer route decision.
- Normal Flow, Burst Surge, Hot Shard waves.
- Request Runner, Burst Swarm, Heavy Payload enemies.
- Worker Tower, Queue Snare, Load Balancer Gate towers.
- Post-wave software laws.

## TD005 - Render TD Combat Readability In Phaser

Goal:

- Make the game visibly read as tower defense.

Must show:

- Full-screen battlefield.
- Roads before wave start.
- Incident Portal and Service Core.
- Build pads.
- Enemy movement along roads.
- Tower attacks/projectiles.
- Hit, resolved, leak, stall, and route-split effects.
- Range preview on hover/selection.
- Coverage links, support auras, route arrows, and weak-coverage warnings.

## TD006 - Build TD HUD, Build Controls, And Tooltips

Goal:

- Replace prototype controls with real TD play controls.

Must show:

- Town Health.
- Build Budget.
- Pressure.
- Wave preview.
- Build buttons for Worker Tower, Queue Snare, Load Balancer Gate.
- Tower hover/selection tooltip with one-line combat job and one-line software shadow.
- Hover/selection surfaces that explain connected coverage in game terms.
- No large explanatory objective strip inside the playfield.

Must retire these prototype HUD terms from the primary in-wave UI:

- `Prepare`
- `No wave`
- `Trust`
- `Backlog`
- `Start Opening Flow`
- `Build Queue Hub`
- `Workers`

## TD007 - Add TD Recap, Balance, And Browser Smoke

Goal:

- Verify the first TD slice is playable and understandable.

Must cover:

- Post-wave recap with enemies resolved, leaks, health delta, budget delta, and one software law.
- Balance pass for a compact three-wave first playable: build Worker Tower, add Queue Snare under swarm pressure, use Load Balancer Gate when route pressure appears, then see recap.
- Browser smoke for visible roads, enemies, towers, HUD, and no blocking console errors.
- Typecheck and focused tests.

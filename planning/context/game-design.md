# Production Town Game Design

## Product Decision

Production Town is a 2D tower-defense strategy game where software engineering concepts become survival tools.

The game must feel like tower defense first. The player defends a visible town core from enemies moving along roads, builds towers on pads, earns budget from resolved threats, and loses health when enemies leak through. Software learning happens after the mechanic matters in play.

Hard rule:

- If a concept cannot become a tower, enemy trait, lane rule, resource, upgrade, or post-wave law, delay it.

## Player Promise

Defend a living production town from incident waves by building and upgrading a small software system.

The learning rhythm is:

1. See a visible battlefield problem.
2. Try a defensive fix.
3. Watch the wave improve, degrade, or fail differently.
4. Reveal the real software term after the player has felt the mechanic.
5. Reuse the same law later in a different level.

No lectures before play. No backend diagram as the main board.

## Core Tower-Defense Contract

Production Town uses classic tower-defense nouns in active gameplay:

- **Roads:** fixed routes from incident portals to the protected core.
- **Enemies:** incidents, requests, bursts, payloads, malformed traffic, duplicates, and outages as moving attackers.
- **Towers:** deployable defenses on fixed build pads.
- **Range and targeting:** towers automatically attack, slow, hold, route, reveal, or filter enemies inside their influence.
- **Leaks:** enemies that reach the core reduce Town Health.
- **Budget:** earned by resolving enemies and spent on towers/upgrades.
- **Waves:** authored enemy compositions with preview information.
- **Recap:** post-wave software law and performance result.

The software concept is the shadow of the mechanic, not the literal board path.

## First Refactored Slice

### Level 1: Traffic Surge At The Gate

Purpose:

- Prove the game reads as tower defense.
- Teach throughput, buffering, and distribution through combat.
- Preserve the backend theme without forcing the player to trace `API -> Queue -> Worker -> Storage`.

Target:

- One short first-playable level.
- One map.
- One protected Service Core.
- One main road with a later fork.
- Three waves that each introduce one decision.
- Three tower families.
- Three meters.
- Local single-player.

The goal is not "two minutes of content" as a product promise. The goal is a compact playable proof: preview a wave, build on pads, watch enemies travel, adjust defenses, survive three waves, and understand why the connected components helped.

### Map

The map contains:

- `incident-portal-1`: enemy spawn point.
- `road-main`: visible road from portal to Service Core.
- `service-core`: protected town heart.
- `pad-worker-a` and `pad-queue-a`: build pads near the first bend.
- `junction-lb-a`: fork unlocked after wave 2.
- `pad-load-balancer-a`: build pad near the fork.

The player must understand from the first screen where enemies enter, where they are going, where towers can be built, and what will be damaged if enemies leak.

### Resources

| Resource | Gameplay meaning | Software shadow |
| --- | --- | --- |
| Town Health | Base life; falls when enemies leak | User trust, uptime, service health |
| Build Budget | Spendable build/upgrade currency | Engineering budget and operational capacity |
| Pressure | Current enemies, leak risk, and lane saturation | Load, backlog, incident pressure |

Use `Town Health` in game-facing UI. `Trust` may remain a recap/story term, but it should not be the primary in-wave label.

Prototype HUD terms to retire from primary in-wave UI:

- `Prepare`
- `No wave`
- `Trust`
- `Backlog`
- `Start Opening Flow`
- `Build Queue Hub`
- `Workers`

These labels belonged to the Message Festival prototype. Future HUD work should use tower-defense terms first and keep software terminology in hover, inspect, recap, or upgrade text.

### Towers

| Tower | Combat job | Software shadow | First-slice rule |
| --- | --- | --- | --- |
| Worker Tower | Basic damage tower | Worker pool / consumer capacity | Attacks one enemy in range at a steady rate |
| Queue Snare | Limited stall tower | Queue / broker / buffer | Holds a few enemies, then releases; overflows if overloaded |
| Load Balancer Gate | Routing tower / fork controller | Load balancing and target health | Splits enemies across lanes only when downstream capacity exists |

The player builds towers; towers are not mandatory pipeline steps. A wave can pass a tower's range without needing to "enter" that building as a lifecycle stage.

### Component Connections

Software components should feel connected through battlefield behavior, not through a fixed backend diagram.

First-slice connection rules:

- **Coverage overlap:** Worker Towers become stronger decisions when their range overlaps a road segment held by Queue Snare.
- **Stall window:** Queue Snare is valuable because it buys nearby damage towers time to resolve enemies.
- **Route influence:** Load Balancer Gate changes enemy lane pressure at a fork, but only helps when the destination lane has healthy tower coverage.
- **Support readability:** Hovering or selecting a tower should show the road segments, build pads, or nearby towers it influences.
- **Failure feedback:** If a component is isolated, overloaded, or routing into weak coverage, the game should show that risk before the next wave punishes it.

The player should learn to build a defensive system, not a row of unrelated towers.

### Enemies

| Enemy | Battlefield behavior | Software shadow | Introduced |
| --- | --- | --- | --- |
| Request Runner | Basic fast attacker | Normal request load | Wave 1 |
| Burst Swarm | Many low-health attackers | Traffic burst / thundering pressure | Wave 2 |
| Heavy Payload | Slow high-health attacker | Expensive request / large job | Wave 3 |

Enemies must move continuously along roads. Their position is path progress, not lifecycle status.

### Waves

| Wave | Purpose | Player lesson | Expected counter |
| --- | --- | --- | --- |
| Normal Flow | Teach road, core, build pad, Worker Tower | Towers create throughput | Build/observe Worker Tower damage |
| Burst Surge | Teach group pressure and stall value | Queues buy time, not infinite capacity | Add Queue Snare near Worker Tower |
| Hot Shard | Teach uneven lane pressure | Distribution helps only with healthy capacity | Use Load Balancer Gate near fork |

Waves may auto-start after a short build countdown once the player has built at least one tower. The player can still use an explicit start button during early development, but the target experience should not require manually invoking every wave forever.

## Software Concept Spine

Prioritize concepts that map cleanly to visible tower-defense verbs.

| Software concept | Game expression | Priority |
| --- | --- | --- |
| Worker / consumer capacity | Basic damage tower and attack-rate upgrades | Early |
| Queue / broker | Limited stall/buffer tower | Early |
| Load balancing | Fork/routing tower with health-aware distribution | Early |
| Validation / API boundary | Filter checkpoint against malformed enemies | Soon |
| Redis cache | Support tower that accelerates repeated known enemies | Soon |
| PostgreSQL / durable state | Service Core or secondary vault objective | Mid |
| Idempotency | Duplicate enemy neutralizer | Mid |
| Dead-letter queue | Poison isolation trap | Mid |
| Observability | Reveal tower for hidden traits and route risk | Mid |
| Docker/AWS/deployment | Campaign or meta pressure | Later |
| CI/CD | Between-level release gate or regression challenge | Later |
| AI-assisted delivery | Meta helper/progression, not combat core | Later |

Default rule:

- Use framework names like NestJS, Fastify, RabbitMQ, Redis, PostgreSQL, and AWS in recaps, tower lore, upgrades, or unlock text.
- Use tower-defense nouns during the wave.

## Retained Prototype Context

The existing Message Festival/API pipeline work is not wasted. It proved:

- React + Phaser shell.
- Deterministic TypeScript simulator.
- Runtime schemas.
- Command-driven play.
- HUD and Phaser rendering connection.
- Custom generated atlas direction.

But it is now a prototype/backstory, not the active gameplay contract. Future work should not extend the fixed `API -> Queue -> Worker -> Storage` lifecycle as the core loop.

## Future Level Ideas

### Validation Checkpoint

Malformed Glitches mix with Request Runners. A Validation Gate rejects bad traffic before it wastes Worker Tower shots. If tuned too strictly later, it can reject useful traffic.

Software law:

- Validate at boundaries before expensive work.

### Cache Kiosk

Repeated enemies become recognizable. Cache support lets nearby towers resolve repeated patterns faster, but stale cache states can create later risk.

Software law:

- Caches protect hot reads, but invalidation and staleness are part of the design.

### Durable Vault

A Service Core or DB Vault becomes a secondary protected objective. Some enemies threaten corruption, duplicate writes, or slow storage pressure.

Software law:

- Durable state needs constraints, consistency, and careful write paths.

## Acceptance Criteria For The Pivot

A build is on the corrected path only if:

- The first screen shows roads, enemies, build pads, towers, and a protected core.
- Enemies move along paths toward the core.
- Towers act automatically by range or lane influence.
- Leaks visibly damage Town Health.
- The player earns/spends Build Budget.
- Wave previews describe enemy pressure in game terms.
- Software terms appear after play or in concise hover/inspect surfaces.
- The player can explain why a tower helped without reading a backend diagram.

## Explicitly Deferred

- Full campaign.
- Multiplayer.
- Accounts.
- Real backend.
- Tiled map authoring.
- Freeform path editing.
- Procedural maps.
- Full replay browser.
- Large browser test suite.
- Nest/Fastify branding as early combat.
- Docker/AWS/CI/CD as early combat.
- A complete runtime rewrite inside the T013 planning branch.
- Async raids.

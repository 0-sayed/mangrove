# Production Town Game Design

## Product Decision

Production Town is a 2D wave-defense strategy game where software engineering concepts become useful survival tools.

The game must be fun first. Learning happens because the player wants to survive, improve, and understand why their town failed. Concepts should arrive as the natural shadow of play, not as lectures, quizzes, or course tasks.

Core promise:

Player defends a living digital town from incident waves by building, upgrading, and tuning a small software system.

Hard rule:

Every mechanic must create a real gameplay consequence and have a real software concept shadow. If a mechanic is only decorative, only educational, or only a cute metaphor, remove it.

## Main Goal

Help the player understand and remember practical software engineering concepts without forcing memorization.

The target learning style is:

1. See a visible system failure.
2. Try a fix inside the game.
3. Watch the system improve, degrade, or fail differently.
4. Only then reveal the real backend term and practical law.
5. Reuse the same law later in a different surface situation.

The more the player plays, the more knowledge they acquire as a side effect of mastery.

## Default Game Shape

Genre:

- 2D browser game
- Wave-defense
- Light RTS/base-building
- Tower-defense readability
- Local single-player first

Inspiration:

- Red Alert style building placement and upgrades
- Stronghold style survival pressure and town health
- Tower-defense wave pressure and readable lanes
- Galaxy Life style long-term base fantasy later, not in MVP

MVP theme:

**Message Festival**

Player promise:

Keep the town's message festival alive while bursts, bad messages, retries, and failure pressure attack the system.

## Scope Split

Use two scopes so we do not overbuild.

### First Playable Slice

Purpose:

Prove the game loop is fun and readable before building the full learning system.

Target:

- 2-3 minutes
- One map
- One authored lane graph
- Two waves
- Three building types
- Three resources/meters
- No validation gate
- No duplicate effects
- No poison boss
- No campaign
- No multiplayer
- No freeform tuning screen
- No inspect UI beyond hover/selection states
- No pause, slow, or rush controls
- No scoring screen beyond the short wave recap

Included waves:

- Wave 1: Opening Flow
- Wave 2: Flood Wave

Included buildings:

- API Gate, preplaced
- Worker Yard, preplaced
- Queue Hub, placeable

Included resources/meters:

- Trust
- Budget
- Backlog

Successful storage in the first playable is a fixed map exit, not a placeable building. `DB Vault` becomes a placeable building in the full MVP.

First playable cognitive budget:

- Wave 1 only asks the player to observe normal flow.
- Wave 2 asks the player to place Queue Hub and optionally increase worker count.
- Only `Trust` and `Backlog` must stay prominent during waves.
- `Budget` is primarily a between-wave spending resource.
- The only exposed tuning knob is `SetWorkerCount`.
- No first playable wave may ask the player to learn more than one new decision axis.

First playable question:

Is it enjoyable to read pressure, place/tune a system piece, and watch the town survive better?

### First Playable Rules Sheet

These are v0 tuning values, not final balance. Change them only after the loop is playable and the result is observable.

#### Time And Simulation

- Simulator tick rate: 10 ticks per second.
- Wave time can end before all messages are resolved.
- The run ends after Wave 2 drains, Trust reaches zero, or the wave timeout is reached.
- First playable target duration: 120-180 seconds including recaps.

#### Starting State

- Trust: 100.
- Budget: 50.
- Backlog: 0.
- API Gate: preplaced on `slot_ingress_1`.
- Worker Yard: preplaced on `slot_worker_1`.
- Queue Hub: not built.
- Worker count: 1.
- Worker count maximum: 2.
- Successful storage: fixed exit `exit_storage_1`.
- Queue Hub placement and worker count tuning unlock after Wave 1.
- No spending is available before Wave 1.

#### First Playable Buildings

| Building    | First playable state | Cost | Core stat                | Upgrade/tuning                        | Failure state                                         |
| ----------- | -------------------- | ---: | ------------------------ | ------------------------------------- | ----------------------------------------------------- |
| API Gate    | Preplaced            |    0 | Accepts 3 messages/sec   | None                                  | Drops overflow when downstream cannot accept          |
| Queue Hub   | Placeable            |   40 | Holds 24 messages        | None                                  | Overflows when full                                   |
| Worker Yard | Preplaced            |    0 | 1 message/sec per worker | `SetWorkerCount` from 1 to 2 costs 20 | Saturates when queue grows faster than workers finish |

First playable rule:

Do not expose API intake upgrades, timeout upgrades, recovery upgrades, retry limits, validation strictness, or storage upgrades.

#### Message Lifecycle

A useful message follows this lifecycle:

1. Spawn at `spawn_festival_gate`.
2. Enter API Gate.
3. If Queue Hub exists, wait in Queue Hub.
4. If no Queue Hub exists, wait in the API direct handoff buffer.
5. Start Worker Yard processing.
6. Ack and exit through `exit_storage_1`.
7. Earn Budget after successful ack.

Message limits:

- API direct handoff buffer: 4 messages.
- Queue Hub capacity: 24 messages.
- Message patience before Trust loss: 12 seconds after API acceptance.
- Worker processing time: 1 second per message.
- A message is complete only after the worker ack.

#### Resources And Formulas

- Delivered useful message: Budget +1.
- Dropped useful message: Trust -3.
- Expired useful message: Trust -2.
- Backlog meter: queued messages + direct handoff messages + running worker messages.
- Queue overflow drops the newest accepted message.
- Direct handoff overflow drops the newest accepted message.
- Win condition: Wave 2 resolved with Trust at least 70.
- Clean win target: Trust at least 85 and Backlog returns to 0 before timeout.
- Loss condition: Trust below 70 after Wave 2, or Trust reaches 0 at any time.

#### First Playable Waves

| Wave                 | Purpose                                   | Spawn pattern                      | Expected pressure                                                 | Required player learning                                                 |
| -------------------- | ----------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Wave 1: Opening Flow | Show normal API -> worker -> storage flow | 12 useful messages over 20 seconds | Default system clears it                                          | Requests enter through an API boundary and finish only after useful work |
| Wave 2: Flood Wave   | Show burst pressure                       | 48 useful messages over 16 seconds | Direct handoff fails; queue buffers; workers determine drain rate | Queues absorb bursts, but workers still decide how fast backlog drains   |

Wave 2 intended outcomes:

- No Queue Hub: fail or barely survive with visible drops.
- Queue Hub only: backlog improves, but drain is slow and Trust is at risk.
- Queue Hub plus worker count 2: clear survival with visible backlog recovery.

#### First Playable Interaction Matrix

| Player action                            | Flood result                          | Backend shadow                        |
| ---------------------------------------- | ------------------------------------- | ------------------------------------- |
| Leave direct handoff only                | Drops happen quickly                  | Producers can overwhelm consumers     |
| Add Queue Hub                            | Drops reduce, backlog becomes visible | Queues buffer bursts                  |
| Add Queue Hub and worker count 2         | Backlog drains faster                 | Consumers still need enough capacity  |
| Only add workers if Queue Hub is missing | Helps a little but still drops bursts | More workers do not replace buffering |

#### Wave Recap Format

After Wave 2, show at most three short lines:

1. Player action and metric: `Queue Hub reduced drops from X to Y`.
2. Remaining pressure: `Backlog peaked at X because workers could process only Y/sec`.
3. Backend term and law: `Queue: absorbs bursts, but does not create worker capacity`.

### Full MVP Slice

Purpose:

Prove that a fun wave-defense loop can teach backend concepts durably.

Target:

- 5-8 minutes
- One map
- One authored path/lane graph
- Five fixed waves
- Five core buildings
- Four primary resources/meters
- Local single-player only

Included waves:

- Opening Flow
- Flood Wave
- Noise Swarm
- Replay Phantom
- Poison Packet Boss

Included buildings:

- API Gate
- Queue Hub
- Worker Yard
- Validation Gate
- DB Vault

Full MVP question:

Can a wave-defense game feel fun while making backend concepts easier to understand and remember?

## Non-Goals

Do not include in the first playable or full MVP:

- Multiplayer
- Async raids
- Full campaign
- Account system
- Procedural maps
- Freeform road/path editing
- Dynamic pathfinding
- User-generated levels
- Full interview deck
- Required explain-back mode
- Full replay browser
- High-end cinematic art
- Large backend curriculum
- Real coding puzzles inside the game

Also avoid:

- A fancy Excalidraw clone
- A static architecture map
- A quiz app
- A generic coding playground
- A course wearing game clothes
- A normal base-builder where learning is optional decoration
- XP, badges, or unlock trees for reading content

## Fun Loop Contract

Every 5-10 seconds, the player should experience a small gameplay loop:

1. A threat or opportunity becomes visible.
2. The player reads the symptom.
3. The player acts or chooses not to act.
4. The town gives immediate feedback.
5. The player earns a reason to continue.

Examples of immediate feedback:

- Backlog drops.
- Trust stops falling.
- Message flow becomes smoother.
- Budget increases from successful delivery.
- A bad fix makes the failure worse in an understandable way.
- A building visually saturates, recovers, blocks, or leaks.

If a mechanic does not create a visible decision or visible feedback, cut it from the current slice.

## Session Loop

Each run follows this loop:

1. Prepare before the wave.
2. Spend Budget or capacity on buildings and upgrades.
3. Start the wave.
4. Watch messages, jobs, and incidents move through lanes.
5. Inspect failures during or after the wave.
6. Tune or rebuild between waves.
7. Survive or fail based on town health.
8. See a short causal recap.
9. Unlock the real backend term only after using or suffering the mechanic.

Moment-to-moment actions:

- Place a building on a predefined slot.
- Upgrade a building.
- Inspect a stuck message, queue, worker, or failed delivery.
- Pause, slow, or rush the wave.
- Tune one exposed control at a time.
- Choose between quick relief and durable improvement.
- Compare current wave result with the previous wave result.

First playable action limits:

- The only build action is placing Queue Hub between Wave 1 and Wave 2.
- The only tuning action is setting Worker Yard worker count from 1 to 2.
- API Gate and Worker Yard are preplaced.
- Building upgrades, inspection panels, pause, slow, rush, and previous-wave comparison are not in the first playable.
- The first playable may show hover/selection feedback, but not a full diagnostic UI.

## Battlefield Rules

The battlefield must be simple and legible.

Use authored lanes and predefined build slots. Do not use freeform pathfinding in MVP.

Initial lanes:

- `Traffic Lane`: citizens generate requests and messages.
- `Job Lane`: queued work moves to workers.
- `Data Lane`: successful work reaches durable storage.

Building roles:

- `Ingress`: handles incoming traffic near the start of a lane.
- `Buffer`: absorbs bursts and queues work.
- `Processor`: consumes queued work.
- `Storage`: records durable state.
- `Visibility`: reveals hidden system symptoms later.

Placement rules:

- `API Gate` starts the traffic path.
- `Queue Hub` connects Traffic Lane to Job Lane.
- `Worker Yard` must be near a Queue Hub or Job Lane.
- In the first playable, successful work exits through a fixed storage endpoint.
- In the full MVP, `DB Vault` becomes the placeable storage building near the end of successful processing.

The player wins by preserving legitimate throughput under failure pressure, not by matching a named countermeasure to a named incident.

## Readability Contract

The player should be able to answer these questions without reading documentation:

- Where are messages entering?
- Where are they trying to go?
- Which lane or building is saturated?
- What type of incident is happening?
- Which action might help?
- Why did Trust drop?

Acceptance:

- Before a wave starts, the player can visually trace spawn, lane, build slots, and exit.
- During a wave, a leak or failure should be diagnosable within about 3 seconds.
- Enemy visuals, lane pressure, building state, and resource changes must agree with each other.
- Text labels can clarify, but they must not carry the whole design.

## Resources And Meters

First playable:

- `Trust`: town health. Falls when useful messages fail or citizens are harmed by system failure.
- `Budget`: build currency. Earned from successful delivery. Spent on buildings, first-playable worker tuning, and later upgrades.
- `Backlog`: pressure meter. Grows when work waits too long. It is not spendable.

Full MVP adds:

- `Compute`: capacity limit. Buildings and upgrades consume it.

Post-wave score metrics:

- `Throughput`
- `Uptime`
- `Complexity`

Do not show `Complexity` in the first playable. First playable post-wave feedback should use only delivered messages, dropped messages, Trust delta, and backlog peak.

Resource rule:

Resources should create engineering tradeoffs, not generic grinding. The player should ask, "Can my system handle this?" not "How do I farm more coins?"

## Buildings And Upgrade Paths

Each full MVP building needs:

- A gameplay role
- A visible state
- At least one upgrade path
- A real backend shadow
- A failure it does not solve

First playable buildings only need the concrete stats defined in the First Playable Rules Sheet. Do not add extra upgrade paths early just to satisfy the full MVP building contract.

### API Gate

Role:

Receives citizen messages and sends them into the system.

Visible states:

- Flowing
- Saturated
- Dropping

Upgrade paths:

- Intake capacity
- Basic throttling later

Backend shadow:

API boundary, controller/route, ingress layer.

Does not solve:

Worker overload, duplicate effects, poison messages, or invalid downstream state.

### Queue Hub

Role:

Buffers incoming work so traffic spikes do not overwhelm workers immediately.

Visible states:

- Empty
- Filling
- Backing up
- Overflowing

Upgrade paths:

- Capacity
- Backpressure mode
- Retry limit in full MVP

Backend shadow:

RabbitMQ, BullMQ, message queues, producer/consumer decoupling.

Does not solve:

Insufficient workers, permanent failures, duplicate effects, or bad retry policies.

### Worker Yard

Role:

Processes queued messages.

Visible states:

- Idle
- Working
- Saturated
- Timed out
- Crashed

Upgrade paths:

- Worker count
- Timeout
- Recovery speed

Backend shadow:

Node.js workers, consumers, background jobs, bounded concurrency.

Does not solve:

Bad input, non-idempotent side effects, or storage bottlenecks.

### Validation Gate

Role:

Rejects or quarantines malformed messages before they damage the system.

Visible states:

- Passing
- Rejecting
- Quarantining
- Too strict

Upgrade paths:

- Strictness
- Reject vs quarantine
- Validation cost

Backend shadow:

Schema validation, request validation, NestJS pipes, API boundary validation.

Does not solve:

Valid-but-dangerous business behavior, duplicate effects, or downstream outages.

### DB Vault

Role:

Stores successful durable state.

Visible states:

- Writing
- Slow
- Locked
- Inconsistent

Upgrade paths:

- Write capacity
- Constraint safety later
- Transaction safety later

Backend shadow:

PostgreSQL, durable writes, constraints, state consistency.

Does not solve:

Ingress overload, bad retries, or worker saturation.

### Deferred Buildings

Good later, not first playable:

- Observability Tower
- Idempotency Ledger
- DLQ Station
- Cache Kiosk
- Auth Tower
- Rate Limit Wall
- Transaction Bridge

Do not add a deferred building unless the current wave needs its decision.

## Enemy And Incident Rules

Incidents are the game's enemies.

Each incident needs:

- Visual cue
- Behavior
- Pressure it creates
- Tempting wrong fix
- Useful counterplay
- Backend law revealed after play

### Flood Wave

Visual cue:

Many small fast packets.

Behavior:

Traffic arrives faster than workers can process directly.

Pressure:

Backlog rises and Trust drops if waiting gets too long.

Tempting wrong fix:

Only adding API intake.

Useful counterplay:

Queue Hub, Worker Yard, worker count tuning.

Backend law:

Queues decouple producers from consumers, but capacity still has limits.

### Noise Swarm

Visual cue:

Jagged or glitching packets.

Behavior:

Malformed messages waste worker time or damage stored state.

Pressure:

Workers process useless work and Trust falls.

Tempting wrong fix:

Add more workers.

Useful counterplay:

Validation Gate and strictness tuning.

Backend law:

Validate untrusted input at system boundaries before business logic.

### Replay Phantom

Visual cue:

Ghost packet trails or duplicated shadows.

Behavior:

Retries repeat the same side effect.

Pressure:

Throughput may look healthy while Trust drops from duplicate effects.

Tempting wrong fix:

Increase retry count.

Useful counterplay:

Idempotency-lite behavior in the full MVP, then Idempotency Ledger later.

Backend law:

Retries are only safe when repeated work is safe or deduplicated.

### Poison Packet Boss

Visual cue:

Large pulsing packet that pins workers.

Behavior:

One bad message repeatedly fails and blocks useful work.

Pressure:

Backlog grows despite enough normal capacity.

Tempting wrong fix:

Add more workers forever.

Useful counterplay:

Retry limit, quarantine behavior, and later DLQ Station.

Backend law:

Permanent failures need isolation, retry limits, and dead-letter handling.

## Software Accuracy Rules

The simulation must preserve these backend truths:

- A message is not complete until the worker acknowledges it.
- Retries multiply load; they are not free healing.
- Retrying non-idempotent work can duplicate side effects.
- Slow workers cause backlog; more producers make it worse.
- More workers can help throughput but can also increase compute cost or pressure downstream.
- Validation rejects bad input early; it does not fix business logic.
- Quarantine and DLQ are not success; they are visible failure isolation.
- Observability does not prevent failure; it reduces time to diagnosis.
- Queues improve burst handling but do not remove capacity planning.
- Exactly-once delivery should not be taught as the default answer.

## Wave Design

Each wave introduces:

- One new pressure
- One main new decision axis
- One satisfying upgrade moment
- One tempting wrong fix
- One short post-wave law

### Wave 1: Opening Flow

Purpose:

Teach normal traffic movement.

Incident:

No major incident.

Player sees:

Messages move from API Gate to workers to successful storage.

Main decision:

Place or inspect the basic system.

Concept shadow:

Requests enter through an API boundary and must complete useful work.

### Wave 2: Flood Wave

Purpose:

Introduce buffering and worker capacity.

Incident:

More messages arrive than workers can process directly.

Symptoms:

- Backlog rises.
- Trust drops if messages wait too long.
- Workers show saturation.

Useful choices:

- Build Queue Hub.
- Add Worker Yard.
- Tune worker count.

Concept shadow:

Queues decouple producers from consumers.

### Wave 3: Noise Swarm

Purpose:

Introduce validation at boundaries.

Incident:

Malformed messages enter the system.

Symptoms:

- Workers waste time.
- Trust drops from bad processing.
- DB Vault may receive invalid state.

Useful choices:

- Add Validation Gate.
- Tune strictness.
- Reject invalid messages cheaply.

Concept shadow:

Validate input at system boundaries before business logic.

### Wave 4: Replay Phantom

Purpose:

Show duplicate effects and retry danger.

Incident:

Some messages retry and repeat the same effect.

Symptoms:

- Throughput looks healthy.
- Trust drops because duplicate effects happen.

Useful choices:

- Reduce unsafe retries.
- Use idempotency-lite behavior if available.
- Avoid treating throughput alone as success.

Concept shadow:

Retries can create duplicate effects unless handlers are idempotent.

### Wave 5: Poison Packet Boss

Purpose:

Show why retry policy and failure isolation matter.

Incident:

One malformed or toxic message repeatedly fails and blocks useful work.

Symptoms:

- Backlog grows around one bad message.
- Worker time is wasted.
- Trust drops despite enough capacity.

Useful choices:

- Reduce retry limit.
- Quarantine the message.
- Add worker capacity only if diagnosis supports it.

Concept shadow:

Poison messages need failure isolation, retry limits, and eventually dead-letter queues.

## Learning Layer

Learning should never interrupt the wave.

During play:

- The player sees symptoms.
- The player experiments.
- The player learns from system consequence.

After a wave:

- Show what changed.
- Show which metric moved.
- Show what failure remained.
- Reveal one backend term.
- Reveal one practical law.
- Reveal one misconception if the player hit it.

Example law:

A queue absorbs bursts and lets producers continue while workers process at their own speed, but workers must still handle retries, duplicate delivery, and failure paths.

Recap format contract:

- Maximum three short lines after a wave.
- Must reference the player's actual action or non-action.
- Must include one visible metric change.
- Must reveal at most one backend term.
- Must avoid generic definitions unless tied to what changed on the battlefield.

Do not add unrelated quizzes.

## Durable Learning Contract

A concept counts as learned only if the player has:

- Experienced the failure symptom before seeing the real term.
- Changed a system behavior that improves or worsens the outcome.
- Seen a short causal recap tying their action to a metric change.
- Re-encountered the same concept later with a slightly different surface form.
- Faced at least one tempting wrong fix that fails for a visible reason.

## Cognitive Load Budget

Each wave may introduce only one new primary decision axis.

Defaults should be safe enough for first-time play. Advanced tuning should be visible but not required until the wave where it matters.

No recap may introduce more than:

- One backend term
- One practical law
- One misconception

Ban from core loop:

- Pre-wave lectures
- Generic quizzes
- Vocabulary drills
- Required flashcards
- Required explain-back gates
- Long postmortems
- Course-style review screens

## Hidden Retrieval Mechanics

Retrieval should feel like operational memory, not studying.

Allowed later:

- A returning incident with changed numbers.
- A repair ticket that describes symptoms without naming the concept.
- A town engineer note asking the player to choose between two fixes based on prior consequences.
- A post-run optional incident card generated from the player's actual mistakes.

The player should remember because the same survival law keeps mattering.

## Transfer Scenarios

Each core law should eventually appear in at least two contexts.

Transfer table:

| Core law                                               | First encounter     | Later encounter         | Same rule                                | Changed surface                       |
| ------------------------------------------------------ | ------------------- | ----------------------- | ---------------------------------------- | ------------------------------------- |
| Queues buffer bursts but do not create worker capacity | Festival Flood Wave | Webhook retry storm     | Producers outpace consumers              | External system sends repeated events |
| Validate untrusted input at boundaries                 | Noise Swarm         | Bad admin import        | Bad input wastes work or corrupts state  | Internal tool, not public traffic     |
| Retries require idempotent effects                     | Replay Phantom      | Payment/email duplicate | Repeated work can duplicate side effects | Business action is different          |
| Permanent failures need isolation                      | Poison Packet Boss  | Stuck background job    | Retrying forever blocks useful work      | Single job pins a worker pool         |

The visual skin may change, but the underlying simulation rule must stay recognizable.

## Learning Telemetry

Track enough local data to evaluate learning without accounts:

- Which symptoms the player inspected.
- Which fix they tried first.
- Whether they overused capacity instead of diagnosing.
- Whether they solved a repeated concept faster later.
- Which misconception the run exposed.

Telemetry is for local tuning and post-run feedback, not social scoring.

Do not build learning telemetry in the first playable unless it is a trivial byproduct of the simulator event log.

## Stack Priority

Early mechanics should transfer directly to practical backend work:

- Node.js
- TypeScript
- NestJS and Fastify
- PostgreSQL
- Redis
- RabbitMQ or BullMQ
- Drizzle and Prisma concepts where relevant
- Docker and CI/CD basics later
- WebSockets and SSE later
- Observability and reliability later

The game can generalize to any software engineering technology later, but the first slices should support backend interviews and real project work.

## Technical Constraints

Implementation stack and file layout live in `stack.md`. Keep this file focused on product, gameplay, and learning requirements.

Non-negotiable technical constraints for the game design:

- The game must run locally in the browser.
- Do not build a custom game engine.
- The simulator owns gameplay truth.
- Rendering and UI must not mutate gameplay state directly.
- First playable outcomes must be deterministic and testable.
- A fixed seed plus command log must reproduce Wave 2 outcomes.
- First playable map data may be hardcoded, but gameplay IDs must stay stable.
- Backend, multiplayer, accounts, and map-authoring tools are deferred until they solve a real gameplay or production need.

## Acceptance Criteria

### First Playable Acceptance

- A player can complete or fail the first playable in 2-3 minutes.
- The first 60 seconds are understandable without recap text.
- One obvious threat appears.
- One useful action exists.
- One visible improvement happens.
- Building Queue Hub and Worker Yard visibly improves flood handling.
- API Gate and Worker Yard are preplaced.
- Queue Hub is the only placeable first-playable building.
- `SetWorkerCount` is the only exposed first-playable tuning command.
- No Queue Hub should produce visible drops or a near-fail result in Wave 2.
- Queue Hub only should visibly reduce drops but leave backlog pressure.
- Queue Hub plus worker count 2 should produce a clean survival result.
- Wave 2 recap uses at most three short lines and references real run metrics.
- Leaving worker count at 1 can still fail or produce a risky survival result in an understandable way.
- The simulator can run headlessly without Phaser.
- A fixed seed plus command log produces repeatable terminal state.

### Full MVP Gameplay Acceptance

- A player can complete or fail Message Festival in 5-8 minutes.
- Waves create visible pressure without reading documentation.
- The player has at least one meaningful tradeoff per wave after Wave 1.
- Each incident has a clear visual cue, pressure, tempting wrong fix, and useful counterplay.
- The player can diagnose a failure from the battlefield, not from a lecture.

### Learning Acceptance

- After the run, the player can explain why queues help with bursts.
- The player sees that queues alone do not solve retries, duplicates, poison messages, or worker capacity.
- Backend terminology appears after the player experiences the mechanic.
- Learning recap stays short and post-wave/post-run.
- A repeated concept appears later in a different surface form.

### Technical Acceptance

- The game runs locally in the browser.
- The simulator owns gameplay truth.
- Rendering and UI reflect simulator state rather than inventing outcomes.
- The map uses authored lanes and predefined build slots.
- Movement along lanes is driven by simulator tick/path progress.
- First playable content contracts exist for level config, map metadata, building definitions, wave definitions, commands, snapshots, events, and post-wave results.
- A deterministic replay/hash test exists for at least one Wave 2 command log.
- A content validation test rejects invalid first playable content.
- A sim-boundary test prevents rendering/UI imports inside simulator modules.

### Content Acceptance

- No concept appears unless it affects gameplay.
- No building exists only as decoration.
- No resource exists unless it changes player decisions.
- No wave introduces more than one new primary decision axis.

## Deferred

Later ideas:

- Async raid seeds
- Multiplayer co-op
- Attack designer / incident deck builder
- Full campaign
- More maps
- More buildings
- More enemy incidents
- Replay browser
- Optional explain-back mode
- Interview deck expansion
- Handbook
- User-generated levels
- Real backend
- Tiled map authoring

Async multiplayer path, if pursued later:

1. A player creates or exports an incident recipe.
2. Another player runs that recipe against their town.
3. Results compare trust lost, uptime, backlog peak, budget spent, and complexity added.

Do not let deferred features distort the first playable architecture.

## Research Inputs

These sources informed the requirements:

- MDA framework: mechanics should create dynamics that produce the desired player experience.
- Self-determination theory: motivation needs competence, autonomy, and meaningful feedback.
- Educational game intrinsic integration: learning content should be inseparable from gameplay success.
- Retrieval and spaced practice research: durable memory improves when knowledge is recalled and reused over time.
- Google SRE monitoring guidance: observability should help diagnose symptoms and causes without noisy complexity.
- OWASP input validation and API resource-limit guidance: validation and limits must happen at system boundaries.
- RabbitMQ/BullMQ/AWS messaging guidance: retries, acknowledgements, idempotency, and dead-letter handling must be modeled accurately.
- Phaser docs: Phaser should render the battlefield while gameplay truth stays in a deterministic simulator.
- Tiled docs: Tiled remains a later option for map and object authoring after the first playable proves the loop.
- TypeScript/Vite/React docs: TypeScript and Vite support the browser-first implementation stack; React supports the app shell and HUD.

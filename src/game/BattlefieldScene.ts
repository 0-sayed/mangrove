import Phaser from "phaser";

import type { BuildingDef, Command, LevelConfig, MapMetadata, SimSnapshot } from "@content/schemas";
import {
  activePacketMessages,
  BATTLEFIELD_VIEW,
  battlefieldBuildings,
  buildSlotWorldPosition,
  buildingVisualState,
  messageWorldPosition,
  pathWorldPoints,
  queueFillCount
} from "@game/battlefield-view";
import {
  buildSlotCommandForWorldPoint,
  increaseWorkerCountCommand,
  startNextWaveCommand
} from "@game/battlefield-input";
import {
  FIRST_PLAYABLE_ANIMATION_IDS,
  GAMEPLAY_ATLAS,
  animationFrameConfigs
} from "@game/gameplay-assets";

export interface BattlefieldSceneOptions {
  readonly level: LevelConfig;
  readonly map: MapMetadata;
  readonly buildingDefs: readonly BuildingDef[];
  readonly snapshot: SimSnapshot;
  readonly onCommand?: (command: Command) => void;
}

interface BuildingRender {
  readonly body: Phaser.GameObjects.Sprite;
  readonly badge: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
  readonly saturation: Phaser.GameObjects.Sprite;
}

const BATTLEFIELD_DEPTH = {
  terrain: 0,
  terrainDetail: 2,
  path: 10,
  buildSlot: 20,
  building: 30,
  packet: 40,
  badge: 50,
  overlay: 60,
  label: 70
} as const;

export class BattlefieldScene extends Phaser.Scene {
  readonly #level: LevelConfig;
  readonly #map: MapMetadata;
  readonly #buildingDefs: readonly BuildingDef[];
  readonly #buildingDefsById: ReadonlyMap<string, BuildingDef>;
  readonly #onCommand: ((command: Command) => void) | undefined;
  #snapshot: SimSnapshot;
  readonly #buildingRenders = new Map<string, BuildingRender>();
  readonly #packetsById = new Map<string, Phaser.GameObjects.Sprite>();

  public constructor(options: BattlefieldSceneOptions) {
    super("battlefield-scene");

    this.#level = options.level;
    this.#map = options.map;
    this.#buildingDefs = options.buildingDefs;
    this.#snapshot = options.snapshot;
    this.#onCommand = options.onCommand;
    this.#buildingDefsById = new Map(
      options.buildingDefs.map((buildingDef) => [buildingDef.id, buildingDef])
    );
  }

  public preload(): void {
    this.load.atlas(GAMEPLAY_ATLAS.key, GAMEPLAY_ATLAS.imageUrl, GAMEPLAY_ATLAS.dataUrl);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#163832");
    this.cameras.main.setBounds(0, 0, BATTLEFIELD_VIEW.width, BATTLEFIELD_VIEW.height);
    this.createAssetAnimations();
    this.drawTerrain();
    this.drawLanePaths();
    this.drawBuildSlots();
    this.registerInputHandlers();
    this.renderSnapshot();
  }

  private createAssetAnimations(): void {
    for (const animationId of FIRST_PLAYABLE_ANIMATION_IDS) {
      if (this.anims.exists(animationId)) {
        continue;
      }

      this.anims.create({
        key: animationId,
        frames: animationFrameConfigs(animationId),
        frameRate: animationId.startsWith("effect-") ? 6 : 4,
        repeat:
          animationId === "effect-backlog-saturation" || !animationId.startsWith("effect-") ? -1 : 0
      });
    }
  }

  private addAssetSprite(
    x: number,
    y: number,
    animationId: string,
    scale = 1,
    depth: number = BATTLEFIELD_DEPTH.terrain
  ): Phaser.GameObjects.Sprite {
    return this.add
      .sprite(x, y, GAMEPLAY_ATLAS.key)
      .setScale(scale)
      .setDepth(depth)
      .play(animationId);
  }

  private addTileGrid(
    startX: number,
    startY: number,
    columns: number,
    rows: number,
    animationId: string,
    depth: number = BATTLEFIELD_DEPTH.terrain
  ): void {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        this.addAssetSprite(startX + column * 64, startY + row * 64, animationId, 1, depth);
      }
    }
  }

  public setSnapshot(snapshot: SimSnapshot): void {
    this.#snapshot = snapshot;

    if (this.sys.isActive()) {
      this.renderSnapshot();
    }
  }

  private drawTerrain(): void {
    this.add
      .rectangle(0, 0, BATTLEFIELD_VIEW.width, BATTLEFIELD_VIEW.height, 0x143d34, 1)
      .setOrigin(0)
      .setDepth(BATTLEFIELD_DEPTH.terrain);
    this.addTileGrid(32, 32, 20, 12, "map-ground-grass", BATTLEFIELD_DEPTH.terrainDetail);
    this.addTileGrid(366, 404, 8, 1, "map-ground-plaza", BATTLEFIELD_DEPTH.terrainDetail);
    this.addTileGrid(942, 404, 2, 1, "map-ground-plaza", BATTLEFIELD_DEPTH.terrainDetail);
  }

  private drawLanePaths(): void {
    const graphics = this.add.graphics().setDepth(BATTLEFIELD_DEPTH.path);

    for (const path of this.#map.paths) {
      const points = pathWorldPoints(this.#map, path.id);
      const laneAnimation =
        path.id === "path-main"
          ? "map-lane-traffic"
          : path.id.includes("job")
            ? "map-lane-job"
            : "map-lane-data";

      graphics.lineStyle(54, 0x335c4d, 0.84);
      this.strokePolyline(graphics, points);

      for (const point of points) {
        this.addAssetSprite(point.x, point.y, laneAnimation, 1, BATTLEFIELD_DEPTH.path);
      }
    }

    for (const spawn of this.#map.spawns) {
      const position = {
        x: BATTLEFIELD_VIEW.originX + spawn.x * BATTLEFIELD_VIEW.tileSize,
        y: BATTLEFIELD_VIEW.originY + spawn.y * BATTLEFIELD_VIEW.tileSize
      };
      this.addAssetSprite(
        position.x,
        position.y,
        "map-spawn-festival-gate",
        1,
        BATTLEFIELD_DEPTH.path
      );
    }

    for (const exit of this.#map.exits) {
      const position = {
        x: BATTLEFIELD_VIEW.originX + exit.x * BATTLEFIELD_VIEW.tileSize,
        y: BATTLEFIELD_VIEW.originY + exit.y * BATTLEFIELD_VIEW.tileSize
      };
      this.addAssetSprite(
        position.x,
        position.y,
        "map-exit-storage-fixed",
        1,
        BATTLEFIELD_DEPTH.path
      );
    }
  }

  private drawBuildSlots(): void {
    const outlinePositions: { readonly x: number; readonly y: number }[] = [];

    for (const slot of this.#map.buildSlots) {
      const position = buildSlotWorldPosition(this.#map, slot.id);
      const animationId =
        slot.role === "api-gate"
          ? "map-build-slot-ingress"
          : slot.role === "worker-yard"
            ? "map-build-slot-worker"
            : "map-build-slot-queue";

      this.addAssetSprite(
        position.x,
        position.y,
        animationId,
        1.1,
        BATTLEFIELD_DEPTH.buildSlot
      ).setAlpha(0.72);
      outlinePositions.push(position);
    }

    const graphics = this.add.graphics().setDepth(BATTLEFIELD_DEPTH.buildSlot);

    graphics.lineStyle(2, 0xf8f5ec, 0.55);

    for (const position of outlinePositions) {
      graphics.strokeRoundedRect(position.x - 43, position.y - 43, 86, 86, 8);
    }
  }

  private registerInputHandlers(): void {
    const emitBuildCommand = (pointer: Phaser.Input.Pointer) => {
      this.emitCommand(
        buildSlotCommandForWorldPoint(this.#level, this.#map, this.#buildingDefs, this.#snapshot, {
          x: pointer.worldX,
          y: pointer.worldY
        })
      );
    };
    const emitStartWaveCommand = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      this.emitCommand(startNextWaveCommand(this.#level, this.#snapshot));
    };
    const emitIncreaseWorkerCountCommand = () => {
      this.emitCommand(increaseWorkerCountCommand(this.#buildingDefs, this.#snapshot));
    };
    const keyboard = this.input.keyboard;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, emitBuildCommand);
    keyboard?.on("keydown-SPACE", emitStartWaveCommand);
    keyboard?.on("keydown-ENTER", emitStartWaveCommand);
    keyboard?.on("keydown-W", emitIncreaseWorkerCountCommand);
    keyboard?.on("keydown-PLUS", emitIncreaseWorkerCountCommand);
    keyboard?.on("keydown-NUMPAD_ADD", emitIncreaseWorkerCountCommand);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_DOWN, emitBuildCommand);
      keyboard?.off("keydown-SPACE", emitStartWaveCommand);
      keyboard?.off("keydown-ENTER", emitStartWaveCommand);
      keyboard?.off("keydown-W", emitIncreaseWorkerCountCommand);
      keyboard?.off("keydown-PLUS", emitIncreaseWorkerCountCommand);
      keyboard?.off("keydown-NUMPAD_ADD", emitIncreaseWorkerCountCommand);
    });
  }

  private emitCommand(command: Command | undefined): void {
    if (command) {
      this.#onCommand?.(command);
    }
  }

  private renderSnapshot(): void {
    const visibleBuildingIds = new Set<string>();

    for (const building of battlefieldBuildings(this.#snapshot)) {
      visibleBuildingIds.add(building.id);

      const render = this.ensureBuildingRender(building);
      const state = buildingVisualState(this.#snapshot, building);
      const animationId = this.buildingAnimationId(building, state);
      const isSaturated = state === "saturated";

      render.body.play(animationId, true);
      render.body.setAlpha(state === "idle" ? 0.92 : 1);

      if (isSaturated && !render.saturation.visible) {
        render.saturation.play("effect-backlog-saturation");
      }

      render.saturation.setVisible(isSaturated);
    }

    for (const [buildingId, render] of this.#buildingRenders) {
      if (!visibleBuildingIds.has(buildingId)) {
        render.body.destroy();
        render.badge.destroy();
        render.label.destroy();
        render.saturation.destroy();
        this.#buildingRenders.delete(buildingId);
      }
    }

    const activeMessageIds = new Set<string>();

    for (const message of activePacketMessages(this.#snapshot)) {
      activeMessageIds.add(message.id);

      const position = messageWorldPosition(this.#map, message, this.#snapshot.buildings);
      const packet = this.#packetsById.get(message.id) ?? this.createPacket(message.id);

      packet.setPosition(position.x, position.y);
      packet.play(this.packetAnimationId(message), true);
      packet.setAlpha(message.status === "delivered" ? 0.45 : 1);
    }

    for (const [messageId, packet] of this.#packetsById) {
      if (!activeMessageIds.has(messageId)) {
        packet.destroy();
        this.#packetsById.delete(messageId);
      }
    }
  }

  private ensureBuildingRender(building: SimSnapshot["buildings"][number]): BuildingRender {
    const existingRender = this.#buildingRenders.get(building.id);

    if (existingRender) {
      return existingRender;
    }

    const position = buildSlotWorldPosition(this.#map, building.slotId);
    const def = this.#buildingDefsById.get(building.defId);
    const body = this.add
      .sprite(position.x, position.y, GAMEPLAY_ATLAS.key)
      .setScale(1.32)
      .setDepth(BATTLEFIELD_DEPTH.building);
    const badge = this.add
      .sprite(position.x + 34, position.y - 32, GAMEPLAY_ATLAS.key)
      .setScale(0.52)
      .setDepth(BATTLEFIELD_DEPTH.badge);
    const saturation = this.add
      .sprite(position.x, position.y - 44, GAMEPLAY_ATLAS.key)
      .setScale(0.72)
      .setDepth(BATTLEFIELD_DEPTH.overlay)
      .setVisible(false);
    const label = this.add
      .text(position.x, position.y + 50, this.buildingBadge(def, building.defId), {
        backgroundColor: "rgba(17, 23, 33, 0.72)",
        color: "#f8f5ec",
        fontFamily: "monospace",
        fontSize: "14px",
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(BATTLEFIELD_DEPTH.label);

    badge.play(this.badgeAnimationId(def));

    const render = { body, badge, label, saturation };
    this.#buildingRenders.set(building.id, render);

    return render;
  }

  private buildingAnimationId(
    building: SimSnapshot["buildings"][number],
    state: ReturnType<typeof buildingVisualState>
  ): string {
    const role = this.#buildingDefsById.get(building.defId)?.role;

    if (role === "api-gate") {
      return state === "saturated"
        ? "building-api-gate-saturated"
        : state === "processing"
          ? "building-api-gate-dropping"
          : "building-api-gate-flowing";
    }

    if (role === "worker-yard") {
      return state === "saturated"
        ? "building-worker-yard-saturated"
        : state === "processing"
          ? "building-worker-yard-working"
          : "building-worker-yard-idle";
    }

    if (state === "saturated") {
      return "building-queue-hub-overflowing";
    }

    if (state === "filling") {
      return queueFillCount(this.#snapshot) > 2
        ? "building-queue-hub-backing-up"
        : "building-queue-hub-filling";
    }

    return "building-queue-hub-empty";
  }

  private badgeAnimationId(def: BuildingDef | undefined): string {
    if (def?.role === "api-gate") {
      return "badge-api";
    }

    if (def?.role === "worker-yard") {
      return "badge-worker";
    }

    if (def?.role === "queue-hub") {
      return "badge-queue";
    }

    return "badge-storage-exit";
  }

  private packetAnimationId(message: SimSnapshot["messages"][number]): string {
    if (message.status === "queued") {
      return "packet-useful-queued";
    }

    if (message.status === "processing") {
      return "packet-useful-processing";
    }

    if (message.status === "dropped") {
      return "effect-drop";
    }

    if (message.status === "expired") {
      return "effect-timeout-expired";
    }

    if (message.ageTicks >= 90) {
      return "packet-expiring";
    }

    return "packet-useful";
  }

  private strokePolyline(
    graphics: Phaser.GameObjects.Graphics,
    points: readonly { readonly x: number; readonly y: number }[]
  ): void {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];

      if (previous && current) {
        graphics.lineBetween(previous.x, previous.y, current.x, current.y);
      }
    }
  }

  private createPacket(messageId: string): Phaser.GameObjects.Sprite {
    const packet = this.add
      .sprite(0, 0, GAMEPLAY_ATLAS.key)
      .setScale(0.78)
      .setDepth(BATTLEFIELD_DEPTH.packet);

    this.#packetsById.set(messageId, packet);

    return packet;
  }

  private buildingBadge(def: BuildingDef | undefined, fallback: string): string {
    if (def?.role === "api-gate") {
      return "API";
    }

    if (def?.role === "queue-hub") {
      return "QUEUE";
    }

    if (def?.role === "worker-yard") {
      return "WORK";
    }

    return fallback.toUpperCase();
  }
}

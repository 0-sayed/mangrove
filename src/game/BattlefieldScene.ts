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

export interface BattlefieldSceneOptions {
  readonly level: LevelConfig;
  readonly map: MapMetadata;
  readonly buildingDefs: readonly BuildingDef[];
  readonly snapshot: SimSnapshot;
  readonly onCommand?: (command: Command) => void;
}

interface BuildingRender {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
}

export class BattlefieldScene extends Phaser.Scene {
  readonly #level: LevelConfig;
  readonly #map: MapMetadata;
  readonly #buildingDefs: readonly BuildingDef[];
  readonly #buildingDefsById: ReadonlyMap<string, BuildingDef>;
  readonly #onCommand: ((command: Command) => void) | undefined;
  #snapshot: SimSnapshot;
  #queueText?: Phaser.GameObjects.Text;
  readonly #buildingRenders = new Map<string, BuildingRender>();
  readonly #packetsById = new Map<string, Phaser.GameObjects.Ellipse>();

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

  public create(): void {
    this.cameras.main.setBackgroundColor("#163832");
    this.cameras.main.setBounds(0, 0, BATTLEFIELD_VIEW.width, BATTLEFIELD_VIEW.height);
    this.drawTerrain();
    this.drawLanePaths();
    this.drawBuildSlots();
    this.#queueText = this.add.text(32, BATTLEFIELD_VIEW.height - 34, "", {
      color: "#f8f5ec",
      fontFamily: "monospace",
      fontSize: "16px"
    });
    this.registerInputHandlers();
    this.renderSnapshot();
  }

  public setSnapshot(snapshot: SimSnapshot): void {
    this.#snapshot = snapshot;

    if (this.sys.isActive()) {
      this.renderSnapshot();
    }
  }

  private drawTerrain(): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0x2f6f5e, 1);
    graphics.fillRoundedRect(32, 48, 736, 352, 12);
    graphics.fillStyle(0x21483f, 1);
    graphics.fillRect(64, 80, 672, 288);
  }

  private drawLanePaths(): void {
    const graphics = this.add.graphics();

    for (const path of this.#map.paths) {
      const points = pathWorldPoints(this.#map, path.id);

      graphics.lineStyle(32, 0x6aa36f, 1);
      this.strokePolyline(graphics, points);
      graphics.lineStyle(14, 0xf2cc8f, 1);
      this.strokePolyline(graphics, points);
      graphics.fillStyle(0xf8f5ec, 1);

      for (const point of points) {
        graphics.fillCircle(point.x, point.y, 5);
      }
    }
  }

  private drawBuildSlots(): void {
    const graphics = this.add.graphics();

    graphics.lineStyle(2, 0xf8f5ec, 0.55);

    for (const slot of this.#map.buildSlots) {
      const position = buildSlotWorldPosition(this.#map, slot.id);
      graphics.strokeRoundedRect(position.x - 34, position.y - 34, 68, 68, 8);
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
    const emitStartWaveCommand = () => {
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
      render.body.setStrokeStyle(3, this.strokeColorForState(state), state === "idle" ? 0.6 : 1);
      render.body.setAlpha(state === "idle" ? 0.82 : 1);
    }

    for (const [buildingId, render] of this.#buildingRenders) {
      if (!visibleBuildingIds.has(buildingId)) {
        render.body.destroy();
        render.label.destroy();
        this.#buildingRenders.delete(buildingId);
      }
    }

    const activeMessageIds = new Set<string>();

    for (const message of activePacketMessages(this.#snapshot)) {
      activeMessageIds.add(message.id);

      const position = messageWorldPosition(this.#map, message, this.#snapshot.buildings);
      const packet = this.#packetsById.get(message.id) ?? this.createPacket(message.id);
      const isFailed = message.status === "dropped" || message.status === "expired";

      packet.setPosition(position.x, position.y);
      packet.setFillStyle(
        isFailed ? 0xd44f4f : 0xf8f5ec,
        message.status === "delivered" ? 0.45 : 0.95
      );
    }

    for (const [messageId, packet] of this.#packetsById) {
      if (!activeMessageIds.has(messageId)) {
        packet.destroy();
        this.#packetsById.delete(messageId);
      }
    }

    this.#queueText?.setText(
      `Wave ${this.#snapshot.activeWaveId ?? "setup"} | Queue ${String(queueFillCount(this.#snapshot))} | Backlog ${String(
        this.#snapshot.meters.backlog
      )}`
    );
  }

  private ensureBuildingRender(building: SimSnapshot["buildings"][number]): BuildingRender {
    const existingRender = this.#buildingRenders.get(building.id);

    if (existingRender) {
      return existingRender;
    }

    const position = buildSlotWorldPosition(this.#map, building.slotId);
    const def = this.#buildingDefsById.get(building.defId);
    const body = this.add.rectangle(
      position.x,
      position.y,
      72,
      56,
      this.buildingFillColor(def?.role),
      1
    );
    const label = this.add
      .text(position.x, position.y, this.buildingBadge(def, building.defId), {
        color: "#f8f5ec",
        fontFamily: "monospace",
        fontSize: "12px"
      })
      .setOrigin(0.5);

    body.setStrokeStyle(3, 0xf8f5ec, 0.65);

    const render = { body, label };
    this.#buildingRenders.set(building.id, render);

    return render;
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

  private createPacket(messageId: string): Phaser.GameObjects.Ellipse {
    const packet = this.add.ellipse(0, 0, 18, 12, 0xf8f5ec, 0.95);

    packet.setStrokeStyle(2, 0x163832, 0.75);
    this.#packetsById.set(messageId, packet);

    return packet;
  }

  private buildingFillColor(role: BuildingDef["role"] | undefined): number {
    if (role === "api-gate") {
      return 0x4f86c6;
    }

    if (role === "worker-yard") {
      return 0xd9822b;
    }

    return 0x5f7f5f;
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

  private strokeColorForState(state: ReturnType<typeof buildingVisualState>): number {
    if (state === "saturated") {
      return 0xd44f4f;
    }

    if (state === "processing") {
      return 0xffc857;
    }

    if (state === "accepting" || state === "filling") {
      return 0x9be58f;
    }

    return 0xf8f5ec;
  }
}

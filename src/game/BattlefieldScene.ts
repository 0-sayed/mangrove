import Phaser from "phaser";

import type { Command, MapDef, SimSnapshot, TowerDef } from "@content/schemas";
import {
  BATTLEFIELD_VIEW,
  battlefieldTowers,
  buildPadWorldPosition,
  pathWorldPoints,
  towerBodyAnimationId
} from "@game/battlefield-view";
import { startNextWaveCommand } from "@game/battlefield-input";
import {
  FIRST_PLAYABLE_ANIMATION_IDS,
  GAMEPLAY_ATLAS,
  animationFrameConfigs
} from "@game/gameplay-assets";

export interface BattlefieldSceneOptions {
  readonly map: MapDef;
  readonly towerDefs: readonly TowerDef[];
  readonly snapshot: SimSnapshot;
  readonly onCommand: (command: Command) => void;
}

interface TowerRender {
  readonly body: Phaser.GameObjects.Sprite;
  readonly badge: Phaser.GameObjects.Sprite;
  readonly label: Phaser.GameObjects.Text;
}

const BATTLEFIELD_DEPTH = {
  terrain: 0,
  terrainDetail: 2,
  path: 10,
  buildPad: 20,
  tower: 30,
  badge: 50,
  label: 70
} as const;

export class BattlefieldScene extends Phaser.Scene {
  readonly #map: MapDef;
  readonly #towerDefsById: ReadonlyMap<string, TowerDef>;
  readonly #onCommand: (command: Command) => void;
  #snapshot: SimSnapshot;
  readonly #towerRenders = new Map<string, TowerRender>();

  public constructor(options: BattlefieldSceneOptions) {
    super("battlefield-scene");

    this.#map = options.map;
    this.#snapshot = options.snapshot;
    this.#onCommand = options.onCommand;
    this.#towerDefsById = new Map(options.towerDefs.map((towerDef) => [towerDef.id, towerDef]));
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
    this.drawBuildPads();
    this.registerInputHandlers();
    this.renderSnapshot();
  }

  public setSnapshot(snapshot: SimSnapshot): void {
    this.#snapshot = snapshot;

    if (this.sys.isActive()) {
      this.renderSnapshot();
    }
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
        repeat: animationId.startsWith("effect-") ? 0 : -1
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

  private drawTerrain(): void {
    this.add
      .rectangle(0, 0, BATTLEFIELD_VIEW.width, BATTLEFIELD_VIEW.height, 0x143d34, 1)
      .setOrigin(0)
      .setDepth(BATTLEFIELD_DEPTH.terrain);
    this.addTileGrid(32, 32, 20, 12, "map-ground-grass", BATTLEFIELD_DEPTH.terrainDetail);
  }

  private drawLanePaths(): void {
    const graphics = this.add.graphics().setDepth(BATTLEFIELD_DEPTH.path);

    for (const path of this.#map.paths) {
      const points = pathWorldPoints(this.#map, path.id);

      graphics.lineStyle(54, 0x335c4d, 0.84);
      this.strokePolyline(graphics, points);

      for (const point of points) {
        this.addAssetSprite(point.x, point.y, "map-lane-traffic", 1, BATTLEFIELD_DEPTH.path);
      }
    }

    for (const portal of this.#map.portals) {
      const position = this.gridToWorld(portal);
      this.addAssetSprite(
        position.x,
        position.y,
        "map-spawn-festival-gate",
        1,
        BATTLEFIELD_DEPTH.path
      );
    }

    for (const core of this.#map.cores) {
      const position = this.gridToWorld(core);
      this.addAssetSprite(
        position.x,
        position.y,
        "map-exit-storage-fixed",
        1,
        BATTLEFIELD_DEPTH.path
      );
    }
  }

  private drawBuildPads(): void {
    const outlinePositions: { readonly x: number; readonly y: number }[] = [];

    for (const pad of this.#map.buildPads) {
      const position = buildPadWorldPosition(this.#map, pad.id);
      const animationId = pad.allowedTowerKinds.includes("worker")
        ? "map-build-slot-worker"
        : pad.allowedTowerKinds.includes("queue")
          ? "map-build-slot-queue"
          : "map-build-slot-ingress";

      this.addAssetSprite(position.x, position.y, animationId, 1.1, BATTLEFIELD_DEPTH.buildPad)
        .setAlpha(0.72);
      outlinePositions.push(position);
    }

    const graphics = this.add.graphics().setDepth(BATTLEFIELD_DEPTH.buildPad);

    graphics.lineStyle(2, 0xf8f5ec, 0.55);

    for (const position of outlinePositions) {
      graphics.strokeRoundedRect(position.x - 43, position.y - 43, 86, 86, 8);
    }
  }

  private registerInputHandlers(): void {
    const emitStartWaveCommand = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      this.emitCommand(startNextWaveCommand(this.#snapshot));
    };
    const keyboard = this.input.keyboard;

    keyboard?.on("keydown-SPACE", emitStartWaveCommand);
    keyboard?.on("keydown-ENTER", emitStartWaveCommand);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off("keydown-SPACE", emitStartWaveCommand);
      keyboard?.off("keydown-ENTER", emitStartWaveCommand);
    });
  }

  private emitCommand(command: Command | undefined): void {
    if (command) {
      this.#onCommand(command);
    }
  }

  private renderSnapshot(): void {
    const visibleTowerIds = new Set<string>();

    for (const tower of battlefieldTowers(this.#snapshot)) {
      visibleTowerIds.add(tower.id);
      this.ensureTowerRender(tower);
    }

    for (const [towerId, render] of this.#towerRenders) {
      if (!visibleTowerIds.has(towerId)) {
        render.body.destroy();
        render.badge.destroy();
        render.label.destroy();
        this.#towerRenders.delete(towerId);
      }
    }
  }

  private ensureTowerRender(tower: SimSnapshot["towers"][number]): TowerRender {
    const existingRender = this.#towerRenders.get(tower.id);

    if (existingRender) {
      return existingRender;
    }

    const position = buildPadWorldPosition(this.#map, tower.padId);
    const def = this.#towerDefsById.get(tower.towerId);
    const body = this.add
      .sprite(position.x, position.y, GAMEPLAY_ATLAS.key)
      .setScale(1.1)
      .setDepth(BATTLEFIELD_DEPTH.tower)
      .play(towerBodyAnimationId(def));
    const badge = this.add
      .sprite(position.x + 34, position.y - 32, GAMEPLAY_ATLAS.key)
      .setScale(0.52)
      .setDepth(BATTLEFIELD_DEPTH.badge)
      .play(this.badgeAnimationId(def));
    const label = this.add
      .text(position.x, position.y + 50, this.towerBadge(def, tower.towerId), {
        backgroundColor: "rgba(17, 23, 33, 0.72)",
        color: "#f8f5ec",
        fontFamily: "monospace",
        fontSize: "14px",
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(BATTLEFIELD_DEPTH.label);

    const render = { body, badge, label };
    this.#towerRenders.set(tower.id, render);

    return render;
  }

  private badgeAnimationId(def: TowerDef | undefined): string {
    if (def?.kind === "worker") {
      return "badge-worker";
    }

    if (def?.kind === "queue") {
      return "badge-queue";
    }

    return "badge-storage-exit";
  }

  private towerBadge(def: TowerDef | undefined, fallback: string): string {
    return (def?.kind ?? fallback).toUpperCase();
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

  private gridToWorld(point: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
    return {
      x: BATTLEFIELD_VIEW.originX + point.x * BATTLEFIELD_VIEW.tileSize,
      y: BATTLEFIELD_VIEW.originY + point.y * BATTLEFIELD_VIEW.tileSize
    };
  }
}

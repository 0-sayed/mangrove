import Phaser from "phaser";
import { useEffect, useRef } from "react";

import type { BuildingDef, Command, LevelConfig, MapMetadata, SimSnapshot } from "@content/schemas";
import { BATTLEFIELD_VIEW } from "@game/battlefield-view";
import { BattlefieldScene } from "@game/BattlefieldScene";

export interface GameCanvasProps {
  readonly level: LevelConfig;
  readonly map: MapMetadata;
  readonly buildingDefs: readonly BuildingDef[];
  readonly snapshot: SimSnapshot;
  readonly onCommand?: (command: Command) => void;
}

export function GameCanvas({ level, map, buildingDefs, snapshot, onCommand }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BattlefieldScene | null>(null);
  const latestSnapshotRef = useRef(snapshot);
  const latestOnCommandRef = useRef(onCommand);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
    sceneRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    latestOnCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const scene = new BattlefieldScene({
      level,
      map,
      buildingDefs,
      snapshot: latestSnapshotRef.current,
      onCommand: (command) => latestOnCommandRef.current?.(command)
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: BATTLEFIELD_VIEW.width,
      height: BATTLEFIELD_VIEW.height,
      backgroundColor: "#163832",
      scene: [scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [buildingDefs, level, map]);

  return <section ref={containerRef} className="game-canvas" data-testid="game-canvas" />;
}

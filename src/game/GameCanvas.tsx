import Phaser from "phaser";
import { useEffect, useRef, type PointerEvent } from "react";

import type { Command, LevelConfig, MapDef, SimSnapshot, TowerDef } from "@content/schemas";
import { buildPadCommandForWorldPoint } from "@game/battlefield-input";
import { BATTLEFIELD_VIEW } from "@game/battlefield-view";
import { BattlefieldScene } from "@game/BattlefieldScene";
import { clientPointToWorldPoint } from "@game/pointer-transform";

export interface GameCanvasProps {
  readonly level: LevelConfig;
  readonly map: MapDef;
  readonly towerDefs: readonly TowerDef[];
  readonly snapshot: SimSnapshot;
  readonly onCommand: (command: Command) => void;
}

export function GameCanvas({ level, map, towerDefs, snapshot, onCommand }: GameCanvasProps) {
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

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    const canvas = event.currentTarget.querySelector("canvas");

    if (!canvas) {
      return;
    }

    const command = buildPadCommandForWorldPoint(
      level,
      map,
      towerDefs,
      latestSnapshotRef.current,
      clientPointToWorldPoint(canvas.getBoundingClientRect(), event)
    );

    if (command) {
      latestOnCommandRef.current(command);
    }
  };

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const scene = new BattlefieldScene({
      map,
      towerDefs,
      snapshot: latestSnapshotRef.current,
      onCommand: (command) => {
        latestOnCommandRef.current(command);
      }
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
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [level, map, towerDefs]);

  return (
    <section
      ref={containerRef}
      className="game-canvas"
      data-testid="game-canvas"
      onPointerDown={handlePointerDown}
    />
  );
}

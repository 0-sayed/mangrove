import Phaser from "phaser";
import { useEffect, useRef } from "react";

import { BootstrapScene } from "@game/BootstrapScene";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 450,
      backgroundColor: "#163832",
      scene: [BootstrapScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return <section ref={containerRef} className="game-canvas" data-testid="game-canvas" />;
}

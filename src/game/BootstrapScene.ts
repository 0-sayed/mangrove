import Phaser from "phaser";

export class BootstrapScene extends Phaser.Scene {
  public constructor() {
    super("bootstrap-scene");
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#163832");

    const graphics = this.add.graphics();
    graphics.fillStyle(0x2f6f5e, 1);
    graphics.fillRoundedRect(32, 48, 736, 352, 12);
    graphics.fillStyle(0x93c47d, 1);
    graphics.fillRect(72, 206, 656, 28);
    graphics.fillStyle(0xf2cc8f, 1);
    graphics.fillCircle(132, 220, 16);
    graphics.fillCircle(668, 220, 16);
    graphics.fillStyle(0x4f86c6, 1);
    graphics.fillRoundedRect(184, 156, 96, 96, 8);
    graphics.fillStyle(0xd9822b, 1);
    graphics.fillRoundedRect(512, 156, 96, 96, 8);

    this.add
      .text(400, 312, "bootstrap battlefield", {
        color: "#f8f5ec",
        fontFamily: "monospace",
        fontSize: "18px"
      })
      .setOrigin(0.5);
  }
}

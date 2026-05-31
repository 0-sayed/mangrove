import { describe, expect, it } from "vitest";

import { BATTLEFIELD_VIEW } from "@game/battlefield-view";
import { clientPointToWorldPoint } from "@game/pointer-transform";

describe("pointer transform", () => {
  it("maps through the scaled Phaser canvas bounds when ENVELOP crops the view", () => {
    expect(
      clientPointToWorldPoint(
        { left: -160, top: -90, width: 1600, height: 900 },
        {
          clientX: 240,
          clientY: 135
        }
      )
    ).toEqual({
      x: BATTLEFIELD_VIEW.width * 0.25,
      y: BATTLEFIELD_VIEW.height * 0.25
    });
  });
});

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Hud } from "@app/Hud";
import { createInitialRun, getRunControls, toRunSnapshot } from "@app/run-controller";

describe("Hud", () => {
  it("renders the level ID passed by the app shell", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        levelId="custom-level"
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    expect(html).toContain("custom-level");
    expect(html).not.toContain("message-festival-v0");
  });
});

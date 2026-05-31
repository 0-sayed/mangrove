import { expect, type Locator, test } from "@playwright/test";

const BATTLEFIELD_WIDTH = 1280;
const BATTLEFIELD_HEIGHT = 720;
const BACKGROUND_RGB = { red: 20, green: 61, blue: 52 };
const LANE_STROKE_RGBS = [
  { red: 51, green: 92, blue: 77 },
  { red: 45, green: 84, blue: 71 },
  { red: 47, green: 82, blue: 70 },
  { red: 50, green: 96, blue: 83 }
] as const;
const QUEUE_SLOT_WORLD_POSITION = { x: 582, y: 442 };
const QUEUE_HUB_COST = 40;
const LANE_OVERLAY_REGION = {
  x: 170,
  y: 386,
  width: 880,
  height: 128
} as const;
const SPAWN_ASSET_REGION = {
  x: 198,
  y: 418,
  width: 48,
  height: 48
} as const;
const MIN_CANVAS_VIEWPORT_COVERAGE = 0.72;
const OPENING_FLOW_ADVANCE_MS = 21_000;

interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

async function countNonBackgroundPixels(
  canvasLocator: Locator,
  region?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }
) {
  return canvasLocator.evaluate(
    (element, { background, sampleRegion }) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error("Expected a canvas element.");
      }

      const canvas = element;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = sampleRegion?.width ?? canvas.width;
      tempCanvas.height = sampleRegion?.height ?? canvas.height;
      const context = tempCanvas.getContext("2d");
      if (!context) {
        return 0;
      }

      context.drawImage(
        canvas,
        sampleRegion?.x ?? 0,
        sampleRegion?.y ?? 0,
        sampleRegion?.width ?? canvas.width,
        sampleRegion?.height ?? canvas.height,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
      const { data } = context.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      let nonBackground = 0;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index] ?? 0;
        const green = data[index + 1] ?? 0;
        const blue = data[index + 2] ?? 0;
        const alpha = data[index + 3] ?? 0;

        if (
          alpha > 0 &&
          Math.abs(red - background.red) +
            Math.abs(green - background.green) +
            Math.abs(blue - background.blue) >
            8
        ) {
          nonBackground += 1;
        }
      }
      return nonBackground;
    },
    { background: BACKGROUND_RGB, sampleRegion: region }
  );
}

async function countPixelsAwayFromColors(
  canvasLocator: Locator,
  region: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  excludedColors: readonly Rgb[]
) {
  return canvasLocator.evaluate(
    (element, { colors, sampleRegion }) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error("Expected a canvas element.");
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = sampleRegion.width;
      tempCanvas.height = sampleRegion.height;
      const context = tempCanvas.getContext("2d");
      if (!context) {
        return 0;
      }

      context.drawImage(
        element,
        sampleRegion.x,
        sampleRegion.y,
        sampleRegion.width,
        sampleRegion.height,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      const { data } = context.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      let signalPixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index] ?? 0;
        const green = data[index + 1] ?? 0;
        const blue = data[index + 2] ?? 0;
        const alpha = data[index + 3] ?? 0;
        const isExcluded = colors.some(
          (color) =>
            Math.abs(red - color.red) +
              Math.abs(green - color.green) +
              Math.abs(blue - color.blue) <=
            52
        );

        if (alpha > 0 && !isExcluded) {
          signalPixels += 1;
        }
      }

      return signalPixels;
    },
    { colors: excludedColors, sampleRegion: region }
  );
}

async function readBudget(budgetMeter: Locator) {
  const text = await budgetMeter.textContent();
  const match = text?.match(/(?<budget>\d+)/);

  if (!match?.groups) {
    throw new Error(`Expected a Budget meter, received ${text ?? "empty text"}.`);
  }

  return Number(match.groups.budget);
}

test("renders the playable shell and accepts browser battlefield input", async ({ page }) => {
  test.setTimeout(60_000);

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.clock.install();
  await page.goto("/");
  await expect(page.getByLabel("Battlefield HUD")).toBeVisible();
  await expect(page.getByText("Mangrove")).toHaveCount(0);
  await expect(page.getByText("message-festival-v0")).toHaveCount(0);
  const gameCanvas = page.getByTestId("game-canvas");
  await expect(gameCanvas).toBeVisible();
  await expect(
    page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)
  ).resolves.toBe(true);

  const battlefieldCanvas = page.locator("[data-testid='game-canvas'] canvas");
  await expect(battlefieldCanvas).toBeVisible();
  await battlefieldCanvas.scrollIntoViewIfNeeded();
  const initialCanvasBox = await battlefieldCanvas.boundingBox();
  const viewportSize = page.viewportSize();

  expect(initialCanvasBox).not.toBeNull();
  expect(viewportSize).not.toBeNull();

  if (!initialCanvasBox || !viewportSize) {
    throw new Error("Expected battlefield canvas and viewport dimensions.");
  }

  expect(
    (initialCanvasBox.width * initialCanvasBox.height) / (viewportSize.width * viewportSize.height)
  ).toBeGreaterThan(MIN_CANVAS_VIEWPORT_COVERAGE);
  await expect(page.getByLabel("Development diagnostics")).toHaveCount(0);
  await expect(page.getByLabel("Current objective")).toHaveCount(0);
  await expect(page.getByText("Trace the route")).toHaveCount(0);
  await expect(page.getByLabel("Budget")).toHaveAttribute(
    "data-tooltip",
    /spent on defenses and upgrades/i
  );
  await page.getByLabel("Budget").hover();
  await expect(page.getByLabel("Budget")).not.toHaveAttribute("title");
  await expect
    .poll(() => page.getByLabel("Budget").evaluate((element) => getComputedStyle(element).zIndex))
    .toBe("30");
  await expect
    .poll(() =>
      page.getByLabel("Budget").evaluate((element) => getComputedStyle(element, "::after").opacity)
    )
    .toBe("1");

  await expect
    .poll(() => countNonBackgroundPixels(battlefieldCanvas), { timeout: 5_000 })
    .toBeGreaterThan(3000);
  await expect
    .poll(() => countNonBackgroundPixels(battlefieldCanvas, LANE_OVERLAY_REGION), {
      timeout: 5_000
    })
    .toBeGreaterThan(1200);
  await expect
    .poll(
      () =>
        countPixelsAwayFromColors(battlefieldCanvas, SPAWN_ASSET_REGION, [
          BACKGROUND_RGB,
          ...LANE_STROKE_RGBS
        ]),
      { timeout: 5_000 }
    )
    .toBeGreaterThan(80);
  await expect(page.getByRole("button", { name: "Start Opening Flow" })).toBeEnabled();

  await page.keyboard.press("Space");
  await expect(page.getByLabel("Run phase")).toContainText("Wave");
  await expect(page.getByLabel("Active wave")).toContainText("Opening Flow");
  await expect(page.getByText("Watch pressure")).toHaveCount(0);
  await expect(page.getByText("wave-opening-flow")).toHaveCount(0);

  await page.clock.fastForward(OPENING_FLOW_ADVANCE_MS);
  await expect
    .poll(async () => Number(await page.getByTestId("sim-tick").textContent()))
    .toBeGreaterThan(200);

  await expect(page.getByLabel("Run phase")).toContainText("Build Phase", {
    timeout: 5_000
  });
  await expect(page.getByText("Build defenses before Flood Wave")).toHaveCount(0);

  const budgetMeter = page.getByLabel("Budget");
  const budgetBeforePlacement = await readBudget(budgetMeter);
  const boundingBox = await battlefieldCanvas.boundingBox();
  expect(boundingBox).not.toBeNull();

  if (!boundingBox) {
    throw new Error("Expected battlefield canvas to have a bounding box.");
  }

  await page.mouse.click(
    boundingBox.x + (QUEUE_SLOT_WORLD_POSITION.x / BATTLEFIELD_WIDTH) * boundingBox.width,
    boundingBox.y + (QUEUE_SLOT_WORLD_POSITION.y / BATTLEFIELD_HEIGHT) * boundingBox.height
  );
  await expect
    .poll(() => readBudget(budgetMeter), { timeout: 5_000 })
    .toBe(budgetBeforePlacement - QUEUE_HUB_COST);
  expect(consoleErrors).toEqual([]);
});

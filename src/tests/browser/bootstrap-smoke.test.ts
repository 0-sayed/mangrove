import { expect, type Locator, type Page, test } from "@playwright/test";

const BATTLEFIELD_WIDTH = 800;
const BATTLEFIELD_HEIGHT = 450;
const BACKGROUND_RGB = { red: 22, green: 56, blue: 50 };
const QUEUE_SLOT_WORLD_POSITION = { x: 304, y: 256 };
const QUEUE_HUB_COST = 40;
const OVERLAY_REGION = {
  x: 24,
  y: 404,
  width: 360,
  height: 40
} as const;

async function countNonBackgroundPixels(
  canvasLocator: Locator,
  region?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
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

async function readBudget(budgetMeter: Locator) {
  const text = await budgetMeter.textContent();
  const match = text?.match(/^Budget (?<budget>\d+)$/);

  if (!match?.groups) {
    throw new Error(`Expected a Budget meter, received ${text ?? "empty text"}.`);
  }

  return Number(match.groups.budget);
}

async function canvasRegionSignature(
  page: Page,
  canvasLocator: Locator,
  region: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
) {
  await canvasLocator.scrollIntoViewIfNeeded();
  const boundingBox = await canvasLocator.boundingBox();
  if (!boundingBox) {
    throw new Error("Expected battlefield canvas to have a bounding box.");
  }

  const screenshot = await page.screenshot({
    clip: {
      x: boundingBox.x + (region.x / BATTLEFIELD_WIDTH) * boundingBox.width,
      y: boundingBox.y + (region.y / BATTLEFIELD_HEIGHT) * boundingBox.height,
      width: (region.width / BATTLEFIELD_WIDTH) * boundingBox.width,
      height: (region.height / BATTLEFIELD_HEIGHT) * boundingBox.height
    }
  });

  let hash = 2_166_136_261;
  for (const byte of screenshot) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619);
  }

  return hash.toString(16);
}

test("renders the playable shell and accepts browser battlefield input", async ({ page }) => {
  test.setTimeout(45_000);

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mangrove" })).toBeVisible();
  await expect(page.getByText("message-festival-v0")).toBeVisible();
  const gameCanvas = page.getByTestId("game-canvas");
  await expect(gameCanvas).toBeVisible();
  await expect(
    page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)
  ).resolves.toBe(true);

  const battlefieldCanvas = page.locator("[data-testid='game-canvas'] canvas");
  await expect(battlefieldCanvas).toBeVisible();
  await battlefieldCanvas.scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Development diagnostics").getByText("phase setup")).toBeVisible();

  await expect
    .poll(() => countNonBackgroundPixels(battlefieldCanvas), { timeout: 5_000 })
    .toBeGreaterThan(1000);

  const setupOverlaySignature = await canvasRegionSignature(page, battlefieldCanvas, OVERLAY_REGION);
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Development diagnostics").getByText("phase wave")).toBeVisible();
  await expect
    .poll(() => canvasRegionSignature(page, battlefieldCanvas, OVERLAY_REGION), { timeout: 5_000 })
    .not.toBe(setupOverlaySignature);

  await expect(page.getByLabel("Development diagnostics").getByText("phase recap")).toBeVisible({
    timeout: 20_000
  });

  const budgetMeter = page.getByText(/^Budget \d+$/);
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

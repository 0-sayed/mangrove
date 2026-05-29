import { expect, test } from "@playwright/test";

test("renders the React shell and a nonblank Phaser battlefield", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mangrove" })).toBeVisible();
  await expect(page.getByText("message-festival-v0")).toBeVisible();
  await expect(page.getByTestId("game-canvas")).toBeVisible();

  const battlefieldCanvas = page.locator("[data-testid='game-canvas'] canvas");
  await expect(battlefieldCanvas).toBeVisible();

  const battlefieldPixels = await battlefieldCanvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error("Expected a canvas element.");
    }

    const canvas = element;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const context = tempCanvas.getContext("2d");
    if (!context) {
      return 0;
    }

    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    let nonBackground = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 0;

      if (alpha > 0 && Math.abs(red - 22) + Math.abs(green - 56) + Math.abs(blue - 50) > 8) {
        nonBackground += 1;
      }
    }
    return nonBackground;
  });

  expect(battlefieldPixels).toBeGreaterThan(1000);
  expect(consoleErrors).toEqual([]);
});

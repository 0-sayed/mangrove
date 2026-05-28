import { expect, test } from "@playwright/test";

test("renders the React shell and a nonblank Phaser canvas", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mangrove" })).toBeVisible();
  await expect(page.getByTestId("game-canvas")).toBeVisible();

  const nonblankPixels = await page
    .locator("[data-testid='game-canvas'] canvas")
    .evaluate((element) => {
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
      let painted = 0;
      for (let index = 3; index < data.length; index += 4) {
        if ((data[index] ?? 0) > 0) {
          painted += 1;
        }
      }
      return painted;
    });

  expect(nonblankPixels).toBeGreaterThan(0);
  expect(consoleErrors).toEqual([]);
});

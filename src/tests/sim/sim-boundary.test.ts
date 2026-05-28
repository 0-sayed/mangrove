import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbiddenImports = [
  /from\s+["']react["']/,
  /from\s+["']react-dom/,
  /from\s+["']phaser["']/,
  /from\s+["']@app\//,
  /from\s+["']@game\//
];

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return path.endsWith(".ts") ? [path] : [];
  });
}

describe("sim boundary", () => {
  it("does not import React, Phaser, app, or rendering code", () => {
    const files = collectTypeScriptFiles("src/sim");
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbiddenImports
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern.source}`);
    });

    expect(offenders).toEqual([]);
  });
});

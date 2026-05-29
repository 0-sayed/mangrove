import { describe, expect, it } from "vitest";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const forbiddenPatterns = [
  /from\s+["']react["']/,
  /from\s+["']react-dom/,
  /from\s+["']phaser["']/,
  /from\s+["']@app\//,
  /from\s+["']@game\//,
  /from\s+["'](?:\.\.\/)+app\//,
  /from\s+["'](?:\.\.\/)+game\//,
  /import\s+["']react["']/,
  /import\s+["']react-dom/,
  /import\s+["']phaser["']/,
  /import\s+["']@app\//,
  /import\s+["']@game\//,
  /import\s+["'](?:\.\.\/)+app\//,
  /import\s+["'](?:\.\.\/)+game\//,
  /import\s*\(\s*["']react["']/,
  /import\s*\(\s*["']react-dom/,
  /import\s*\(\s*["']phaser["']/,
  /import\s*\(\s*["']@app\//,
  /import\s*\(\s*["']@game\//,
  /import\s*\(\s*["'](?:\.\.\/)+app\//,
  /import\s*\(\s*["'](?:\.\.\/)+game\//,
  /Math\.random\s*\(/,
  /Date\.now\s*\(/,
  /new\s+Date\s*\(/,
  /performance\.now\s*\(/
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
  it("flags alternate import forms into rendering boundaries", () => {
    const forbiddenSources = [
      'import "phaser";',
      'const scene = await import("phaser");',
      'import "../app/hud";',
      'const game = await import("../game/scene");',
      "new Date();",
      "performance.now();"
    ];

    const missedSources = forbiddenSources.filter(
      (source) => !forbiddenPatterns.some((pattern) => pattern.test(source))
    );

    expect(missedSources).toEqual([]);
  });

  it("does not import React, Phaser, app, or rendering code", () => {
    const files = collectTypeScriptFiles("src/sim");
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return forbiddenPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern.source}`);
    });

    expect(offenders).toEqual([]);
  });
});

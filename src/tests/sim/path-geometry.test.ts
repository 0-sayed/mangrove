import { describe, expect, it } from "vitest";

import type { MapDef } from "@content/schemas";
import {
  distanceFromPointToPath,
  pathIdsCoveredByPad,
  pointAtPathProgress,
  sharedPortalCorePathIds
} from "@sim/path-geometry";

const forkMap: MapDef = {
  id: "fork-map",
  size: { width: 10, height: 10 },
  paths: [
    {
      id: "road-main",
      portalId: "portal",
      coreId: "core",
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 5 },
        { x: 9, y: 5 }
      ],
      length: 9
    },
    {
      id: "road-relief",
      portalId: "portal",
      coreId: "core",
      points: [
        { x: 0, y: 5 },
        { x: 5, y: 7 },
        { x: 9, y: 7 }
      ],
      length: 9.385
    }
  ],
  buildPads: [
    { id: "pad-worker", x: 5, y: 4, allowedTowerKinds: ["worker"] },
    { id: "pad-far", x: 9, y: 0, allowedTowerKinds: ["worker"] }
  ],
  portals: [{ id: "portal", x: 0, y: 5 }],
  cores: [{ id: "core", x: 9, y: 5 }]
};

const mainPath = forkMap.paths[0];

if (!mainPath) {
  throw new Error("Expected fork map to include main path.");
}

describe("path geometry helpers", () => {
  it("interpolates points along path progress", () => {
    expect(pointAtPathProgress(mainPath, 0)).toEqual({ x: 0, y: 5 });
    expect(pointAtPathProgress(mainPath, 0.5)).toEqual({ x: 4.5, y: 5 });
    expect(pointAtPathProgress(mainPath, 1)).toEqual({ x: 9, y: 5 });
  });

  it("measures shortest distance from points to a path", () => {
    expect(distanceFromPointToPath({ x: 5, y: 4 }, mainPath)).toBeCloseTo(1);
    expect(distanceFromPointToPath({ x: 9, y: 0 }, mainPath)).toBeCloseTo(5);
  });

  it("returns path ids covered by a pad radius in map order", () => {
    expect(pathIdsCoveredByPad(forkMap, { x: 5, y: 4 }, 1.25)).toEqual(["road-main"]);
    expect(pathIdsCoveredByPad(forkMap, { x: 5, y: 6 }, 1.25)).toEqual(["road-main", "road-relief"]);
  });

  it("returns paths sharing portal and core ids in map order", () => {
    expect(sharedPortalCorePathIds(forkMap, "road-main")).toEqual(["road-main", "road-relief"]);
    expect(sharedPortalCorePathIds(forkMap, "missing")).toEqual([]);
  });
});

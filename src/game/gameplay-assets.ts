import gameplayAtlasDataUrl from "../assets/generated/gameplay-atlas.json?url";
import gameplayAtlasImageUrl from "../assets/generated/gameplay-atlas.png";
import atlasData from "../assets/generated/gameplay-atlas.json";
import manifest from "../assets/generated/gameplay-atlas.manifest.json";

export const GAMEPLAY_ATLAS = {
  key: "gameplay-atlas",
  imageUrl: gameplayAtlasImageUrl,
  dataUrl: gameplayAtlasDataUrl
} as const;

export const FIRST_PLAYABLE_ANIMATION_IDS = [
  "map-ground-grass",
  "map-ground-plaza",
  "map-lane-traffic",
  "map-lane-job",
  "map-lane-data",
  "map-spawn-festival-gate",
  "map-exit-storage-fixed",
  "map-build-slot-ingress",
  "map-build-slot-worker",
  "map-build-slot-queue",
  "map-placement-preview-valid",
  "map-placement-preview-invalid",
  "building-api-gate-flowing",
  "building-api-gate-saturated",
  "building-api-gate-dropping",
  "building-worker-yard-idle",
  "building-worker-yard-working",
  "building-worker-yard-saturated",
  "building-queue-hub-empty",
  "building-queue-hub-filling",
  "building-queue-hub-backing-up",
  "building-queue-hub-overflowing",
  "packet-useful",
  "packet-useful-queued",
  "packet-useful-processing",
  "packet-flood",
  "packet-expiring",
  "effect-message-spawn",
  "effect-message-accepted",
  "effect-message-queued",
  "effect-worker-start",
  "effect-ack-delivered",
  "effect-drop",
  "effect-timeout-expired",
  "effect-overflow",
  "effect-backlog-saturation",
  "effect-trust-loss",
  "effect-budget-gain",
  "effect-wave-start",
  "effect-wave-end",
  "badge-api",
  "badge-queue",
  "badge-worker",
  "badge-storage-exit",
  "ui-frame-hud",
  "ui-icon-trust",
  "ui-icon-budget",
  "ui-icon-backlog",
  "ui-meter-trust",
  "ui-meter-budget",
  "ui-meter-backlog",
  "ui-button-start-wave",
  "ui-button-build-queue",
  "ui-control-worker-count",
  "ui-recap-delivered",
  "ui-recap-dropped",
  "ui-recap-backlog-peak"
] as const;

interface ManifestAnimation {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly frames: number;
}

interface AtlasFrame {
  readonly filename: string;
  readonly frame: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

interface AtlasData {
  readonly frames: readonly AtlasFrame[];
  readonly meta: {
    readonly size: {
      readonly w: number;
      readonly h: number;
    };
  };
}

export interface AtlasCssFrame {
  readonly imageUrl: string;
  readonly backgroundPosition: string;
  readonly backgroundSize: string;
  readonly width: number;
  readonly height: number;
  readonly sheetWidth: number;
  readonly sheetHeight: number;
}

const animationById = new Map<string, ManifestAnimation>(
  manifest.animations.map((animation) => [animation.id, animation])
);
const typedAtlasData = atlasData as AtlasData;
const frameByName = new Map<string, AtlasFrame>(
  typedAtlasData.frames.map((frame) => [frame.filename, frame])
);
const cssScale = 0.375;

export function animationFrameNames(animationId: string): string[] {
  const animation = animationById.get(animationId);

  if (!animation) {
    throw new Error(`Missing gameplay animation ${animationId}`);
  }

  const frames: string[] = [];

  for (let frame = animation.from; frame <= animation.to; frame += 1) {
    const atlasFrameName = frameName(frame);

    if (!frameByName.has(atlasFrameName)) {
      throw new Error(`Missing atlas frame ${atlasFrameName}`);
    }

    frames.push(atlasFrameName);
  }

  if (frames.length !== animation.frames) {
    throw new Error(`Animation ${animationId} expected ${String(animation.frames)} frames`);
  }

  return frames;
}

export function animationFrameConfigs(animationId: string): { key: string; frame: string }[] {
  return animationFrameNames(animationId).map((frame) => ({ key: GAMEPLAY_ATLAS.key, frame }));
}

export function firstFrameName(animationId: string): string {
  const frameName = animationFrameNames(animationId)[0];

  if (!frameName) {
    throw new Error(`Animation ${animationId} has no frames`);
  }

  return frameName;
}

export function atlasCssFrame(animationId: string): AtlasCssFrame {
  const frameName = firstFrameName(animationId);
  const frame = frameByName.get(frameName);

  if (!frame) {
    throw new Error(`Missing atlas frame ${frameName}`);
  }

  return {
    imageUrl: GAMEPLAY_ATLAS.imageUrl,
    backgroundPosition: `-${String(frame.frame.x * cssScale)}px -${String(frame.frame.y * cssScale)}px`,
    backgroundSize: `${String(typedAtlasData.meta.size.w * cssScale)}px ${String(
      typedAtlasData.meta.size.h * cssScale
    )}px`,
    width: frame.frame.w * cssScale,
    height: frame.frame.h * cssScale,
    sheetWidth: typedAtlasData.meta.size.w,
    sheetHeight: typedAtlasData.meta.size.h
  };
}

function frameName(manifestFrameNumber: number): string {
  return `gameplay-atlas ${String(manifestFrameNumber - 1)}.aseprite`;
}

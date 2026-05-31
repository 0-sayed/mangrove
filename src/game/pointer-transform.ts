import { BATTLEFIELD_VIEW, type WorldPoint } from "@game/battlefield-view";

type ClientPoint = Pick<PointerEvent, "clientX" | "clientY">;
type Bounds = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

export function clientPointToWorldPoint(bounds: Bounds, point: ClientPoint): WorldPoint {
  return {
    x: ((point.clientX - bounds.left) / bounds.width) * BATTLEFIELD_VIEW.width,
    y: ((point.clientY - bounds.top) / bounds.height) * BATTLEFIELD_VIEW.height
  };
}

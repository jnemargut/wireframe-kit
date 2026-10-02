import { memo } from "react";
import { layoutScreen } from "../layout";
import { ScreenArt } from "../render/screen";
import type { WireframeFile, WNode } from "../types";

/** Room each component gets to look like itself; smaller rooms make thin things fill their tile. */
const WIDE: Record<string, number> = {
  topnav: 420, table: 250, sidebar: 220, keyboard: 390, dialog: 300, sheet: 300, tabbar: 200, navbar: 190,
  chart: 240, map: 240, video: 240, list: 170, card: 220, section: 220, grid: 220, row: 220, stack: 200,
  text: 150, alert: 210, progress: 150, slider: 150, divider: 120, search: 190, input: 190, select: 190, textarea: 190,
  segmented: 210, tabs: 170, chips: 210, steps: 190, checkbox: 170, toggle: 170, radio: 170, breadcrumbs: 150, sketch: 150, image: 160,
};
/** Things that are mostly words: shrink to the words so they read big. */
const HUG = new Set(["title", "heading", "label", "link", "badge", "button", "toast", "spinner", "rating", "pagination", "dots", "stepper", "avatar", "icon", "icon-button"]);

/** A component rendered for real, cropped tight to it: the palette's thumbnails, big enough to glance at. */
export const NodePreview = memo(function NodePreview({ node, type }: { node: WNode; type: string }) {
  if (type === "spacer") {
    return (
      <svg viewBox="0 0 120 50" className="preview">
        <path d="M20 8 H100 M20 42 H100 M60 13 V37 M54 19 L60 13 L66 19 M54 31 L60 37 L66 31" fill="none" stroke="#959ba2" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const W = WIDE[type] ?? 240;
  const shown: WNode = { ...node, goes: undefined, ...(HUG.has(type) && node.width === undefined ? { width: "hug" as const } : {}) };
  // wrapped in a stack so bars and overlays draw inline instead of pinning to a screen edge
  const file: WireframeFile = { title: "", screens: { p: { statusbar: false, pad: 8, device: { w: W, h: 1400 }, children: [{ type: "stack", children: [shown] }] } } };
  const l = layoutScreen(file, "p");
  // the component itself and what's inside it (not the invisible full-width wrapper)
  const boxes = l.boxes.filter((b) => b.depth >= 2);
  const x0 = Math.min(...boxes.map((b) => b.x)) - 4, y0 = Math.min(...boxes.map((b) => b.y)) - 4;
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + 4, y1 = Math.min(Math.max(...boxes.map((b) => b.y + b.h)) + 4, y0 + W * 1.5);
  return (
    <svg viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} preserveAspectRatio="xMidYMid meet" className="preview">
      <ScreenArt layout={l} opts={{ uid: `pv-${type}`, wobble: false }} />
    </svg>
  );
});

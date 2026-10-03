/**
 * Drawing primitives shared by every component: marker text, rectangles, lines, squiggles and crossed boxes.
 */
import { plainText, richLines } from "../../vendor/sketch/rich";
import type { ReactNode } from "react";
import { C } from "../../vendor/sketch/tokens";
import { lineH } from "../layout";
import { fit, textWidth, wrap, type Face } from "../text";
import { itemText, type Item } from "../types";
import { guessIcon } from "../vocab";
import { hasIcon } from "./icons";

/** A component's art: `shape` gets the marker wobble, `words` stays crisp; `pop` is drawn over the whole screen (open dropdowns, menus). */
export interface Drawn { shape?: ReactNode; words?: ReactNode; popShape?: ReactNode; popWords?: ReactNode }
export interface DrawCtx {
  /** Resolve an image `src` to an href (already sketchified). */
  asset?: (src: string, raw?: boolean, crop?: number[]) => string | undefined;
  /** Unique prefix for clip-path ids. */
  uid: string;
}

export const ink: string = C.ink, paper: string = C.paper, white: string = "#ffffff", soft: string = C.g1, mid: string = C.g2, line: string = C.g4, muted: string = C.g7, hint: string = C.g5, dark: string = C.g8;
export const SW = 2.4, THIN = 1.7;
export const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export const fontOf = (face: Face) => (face === "title" ? "Permanent Marker" : "Patrick Hand");

export function T({ x, y, text, size, face = "hand", fill = ink, anchor = "start", underline }: { x: number; y: number; text: string; size: number; face?: Face; fill?: string; anchor?: "start" | "middle" | "end"; underline?: boolean }) {
  return <text x={x} y={y} fontFamily={fontOf(face)} fontSize={size} fill={fill} textAnchor={anchor} textDecoration={underline ? "underline" : undefined}>{richLines(text, [plainText(text)], fill, size)[0]}</text>;
}
/** Single line, vertically centered in (y, h). */
export const mid1 = (y: number, h: number, size: number) => y + h / 2 + size * 0.34;

export function Para({ x, y, w, text, size, face = "hand", fill = ink, align = "start", maxLines }: { x: number; y: number; w: number; text: string; size: number; face?: Face; fill?: string; align?: string; maxLines?: number }) {
  let ls = wrap(text, face, size, Math.max(10, w));
  if (maxLines && ls.length > maxLines) { ls = ls.slice(0, maxLines); ls[maxLines - 1] = fit(ls[maxLines - 1] + "…", face, size, w); }
  const lh = lineH(size, face);
  const ax = align === "center" ? x + w / 2 : align === "end" ? x + w : x;
  const anchor = align === "center" ? "middle" : align === "end" ? "end" : "start";
  const base = y + (lh - size) / 2 + size * 0.84;
  return <text fontFamily={fontOf(face)} fontSize={size} fill={fill} textAnchor={anchor}>{richLines(text, ls, fill, size).map((l, i) => <tspan key={i} x={ax} y={base + i * lh}>{l}</tspan>)}</text>;
}

export const R = (x: number, y: number, w: number, h: number, o: { rx?: number; fill?: string; stroke?: string; sw?: number; dash?: string } = {}) =>
  <rect key={`r${x},${y},${w},${h}`} x={x} y={y} width={Math.max(0, w)} height={Math.max(0, h)} rx={o.rx ?? 0} fill={o.fill ?? "none"} stroke={o.stroke === undefined ? ink : o.stroke} strokeWidth={o.sw ?? SW} strokeDasharray={o.dash} />;
export const Ln = (x1: number, y1: number, x2: number, y2: number, stroke = ink, sw = SW) => <line key={`l${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;

/** A gentle hand-drawn squiggle standing in for a line of text. */
export function squiggle(x: number, y: number, w: number) {
  let d = `M${x} ${y}`;
  for (let i = 0, px = x; px < x + w - 1; i++) { const step = Math.min(14, x + w - px); d += ` q${step / 2} ${i % 2 ? 2.2 : -2.2} ${step} 0`; px += step; }
  return <path d={d} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />;
}

export function crossBox(b: { x: number; y: number; w: number; h: number }, rx: number, uid: string, label?: string) {
  const id = `${uid}-x`;
  return {
    shape: <g>
      <clipPath id={id}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} /></clipPath>
      {R(b.x, b.y, b.w, b.h, { rx, fill: soft, stroke: "none" })}
      <g clipPath={`url(#${id})`}>{Ln(b.x, b.y, b.x + b.w, b.y + b.h, line, THIN)}{Ln(b.x + b.w, b.y, b.x, b.y + b.h, line, THIN)}</g>
      {R(b.x, b.y, b.w, b.h, { rx })}
    </g>,
    words: label && b.h > 26 && b.w > 50 ? (() => {
      const t = fit(label, "hand", 15, b.w - 24), tw = textWidth(t, "hand", 15);
      return <g>{R(b.x + b.w / 2 - tw / 2 - 8, b.y + b.h / 2 - 12, tw + 16, 24, { rx: 12, fill: paper, stroke: "none" })}<T x={b.x + b.w / 2} y={b.y + b.h / 2 + 5} text={t} size={15} fill={muted} anchor="middle" /></g>;
    })() : undefined,
  };
}

export function iconFor(it: Item): string {
  const o = typeof it === "string" ? {} : it;
  return hasIcon(o.icon) ? (o.icon as string) : guessIcon(itemText(it));
}

export function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`); }
  return pts.join(" ");
}


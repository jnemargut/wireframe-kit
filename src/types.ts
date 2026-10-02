import { DEVICES, type DeviceName, type Pin } from "./vocab";

/** One element in a screen. Loose on purpose: the validator checks props against the catalogue. */
export interface WNode {
  type?: string;
  use?: string;
  id?: string;
  goes?: string;
  pin?: Pin;
  width?: "fill" | "hug" | number;
  height?: number;
  grow?: number;
  note?: string;
  children?: WNode[];
  [prop: string]: unknown;
}

/** A list/tab/menu item: plain text or an object. */
export type Item = string | { text?: string; title?: string; subtitle?: string; meta?: string; icon?: string; image?: boolean | string; goes?: string; [k: string]: unknown };

export interface Screen {
  /** Human name shown on the canvas (defaults to the id). */
  title?: string;
  /** "down" (default) or "right" (e.g. a sidebar beside the main column). */
  dir?: "down" | "right";
  gap?: number;
  pad?: number;
  align?: "start" | "center" | "end" | "stretch";
  /** Long pages: the screen grows to fit instead of clipping at the device height. */
  scroll?: boolean;
  /** Phone status bar and home indicator (default true on phones). */
  statusbar?: boolean;
  /** Per-screen device override. */
  device?: DeviceName | { w: number; h: number };
  note?: string;
  children: WNode[];
}

/** Editor nudges: sparse, keyed by screen then element id. */
export interface Nudge { dx?: number; dy?: number; scale?: number; hidden?: boolean }

export interface WireframeFile {
  $schema?: string;
  title: string;
  device?: DeviceName | { w: number; h: number };
  /** The first screen (defaults to the first in `screens`). */
  start?: string;
  /** Pieces used on several screens, e.g. "tabs": { "type": "tabbar", ... }. Use with { "use": "tabs" }. */
  shared?: Record<string, WNode>;
  screens: Record<string, Screen>;
  layout?: Record<string, Record<string, Nudge>>;
  /** Where each screen sits on the editor canvas (editor-owned). */
  canvas?: Record<string, [number, number]>;
}

export function deviceSize(file: WireframeFile, screen?: Screen): { w: number; h: number; name: DeviceName | "custom" } {
  const d = screen?.device ?? file.device ?? "phone";
  if (typeof d === "object") return { w: d.w, h: d.h, name: "custom" };
  return { ...(DEVICES[d] ?? DEVICES.phone), name: DEVICES[d] ? d : "phone" };
}

export const startScreen = (file: WireframeFile) => (file.start && file.screens[file.start] ? file.start : Object.keys(file.screens)[0]);

/** Resolve `use` against the shared pieces. */
export function resolveNode(file: WireframeFile, node: WNode): WNode {
  if (!node.use) return node;
  const base = file.shared?.[node.use];
  if (!base) return { ...node, type: "sketch", label: `missing shared "${node.use}"` };
  const { use: _u, ...rest } = node;
  return { ...base, ...rest };
}

export const itemText = (it: Item): string => (typeof it === "string" ? it : String(it.text ?? it.title ?? ""));
export const itemGoes = (it: Item): string | undefined => (typeof it === "string" ? undefined : it.goes);

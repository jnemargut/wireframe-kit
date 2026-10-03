import { chromeFor, type ChromeKind } from "../vendor/sketch/device-chrome";
import type { MarkupStroke, SketchShape } from "../vendor/sketch/shapes";
import { DEVICES, type Chrome, type DeviceName, type Pin } from "./vocab";

export type { MarkupStroke, SketchShape };

/** One element in a screen. Loose on purpose: the validator checks props against the catalog. */
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
  /** Placed freely at [x, y] on the screen (top-level only), outside the stacks. */
  at?: [number, number];
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
  /** Stays put on the canvas until it's unlocked. */
  locked?: boolean;
  /** Show the screen inside a web browser with this address in the address bar. */
  url?: string;
  /** The body drawn around this screen (default: picked from the device). */
  chrome?: Chrome;
  /** This screen is another device's version of that screen (e.g. the desktop "menu"). */
  versionOf?: string;
  note?: string;
  children: WNode[];
  /** Designer drawings on top of the screen, in screen px. */
  shapes?: SketchShape[];
  /** Sharpie crit markup from play mode (only shown in play mode). */
  markup?: MarkupStroke[];
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

export function deviceSize(file: WireframeFile, screen?: Screen): { w: number; h: number; name: DeviceName | "custom"; chrome: ChromeKind | "none" } {
  const d = screen?.device ?? file.device ?? "phone";
  const size = typeof d === "object" && d && typeof d.w === "number" && typeof d.h === "number" ? { w: Math.max(80, d.w), h: Math.max(80, d.h), name: "custom" as const }
    : { ...(DEVICES[d as DeviceName] ?? DEVICES.phone), name: (DEVICES[d as DeviceName] ? d : "phone") as DeviceName };
  const auto: ChromeKind = size.name === "custom" ? chromeFor(size.w, size.h)
    : size.name.startsWith("phone") ? "phone" : size.name.startsWith("tablet") ? "tablet" : (size.name as ChromeKind);
  const chrome = screen?.chrome ?? auto;
  return { w: size.w, h: size.h, name: size.name, chrome };
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

/** An item's heading: its title first (accordion sections, timeline events keep `text` for the body). */
export const itemTitle = (it: Item): string => (typeof it === "string" ? it : String(it.title ?? it.text ?? ""));
export const itemText = (it: Item): string => (typeof it === "string" ? it : String(it.text ?? it.title ?? ""));
export const itemGoes = (it: Item): string | undefined => (typeof it === "string" ? undefined : it.goes);

/** Pure edits on a wireframe file. Each returns a new document; the app saves it. */
import type { Path } from "../layout";
import type { WireframeFile, WNode } from "../types";
import { COMPONENTS } from "../vocab";

export type Sel = { screen: string; key: string } | null;

export const clone = <T,>(v: T): T => structuredClone(v);

export function getAt(doc: unknown, path: Path): unknown {
  let cur = doc as Record<string | number, unknown> | undefined;
  for (const k of path) { if (cur == null) return undefined; cur = cur[k] as Record<string | number, unknown>; }
  return cur;
}

/** Path in the file for a selection key ("children/2/children/0", maybe "#3" for an item). */
export function pathOf(screen: string, key: string): Path {
  const [node, item] = key.split("#");
  const p: Path = ["screens", screen, ...(node ? node.split("/").map((s) => (/^\d+$/.test(s) ? Number(s) : s)) : [])];
  return item !== undefined ? [...p, "items", Number(item)] : p;
}
export const keyOf = (path: Path) => path.slice(2).join("/");

export function setAt(doc: WireframeFile, path: Path, value: unknown): WireframeFile {
  const next = clone(doc) as unknown as Record<string | number, unknown>;
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = typeof path[i + 1] === "number" ? [] : {};
    cur = cur[k] as Record<string | number, unknown>;
  }
  const last = path[path.length - 1];
  if (value === undefined) { if (Array.isArray(cur) && typeof last === "number") cur.splice(last, 1); else delete cur[last]; }
  else cur[last] = value;
  return next as unknown as WireframeFile;
}

/** Set a prop on a node; undefined/"" removes it. */
export function setProp(doc: WireframeFile, path: Path, prop: string, value: unknown): WireframeFile {
  const v = value === "" || (Array.isArray(value) && !value.length) ? undefined : value;
  return setAt(doc, [...path, prop], v);
}

function allIds(doc: WireframeFile, screen: string): Set<string> {
  const ids = new Set<string>();
  const walk = (ns?: WNode[]) => ns?.forEach((n) => { if (typeof n?.id === "string") ids.add(n.id); walk(n?.children); });
  walk(doc.screens[screen]?.children);
  return ids;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

/** Give a node an id (for nudges and pointers) if it doesn't have one. */
export function ensureId(doc: WireframeFile, screen: string, path: Path): { doc: WireframeFile; id: string } {
  const n = getAt(doc, path) as WNode;
  if (typeof n?.id === "string" && n.id) return { doc, id: n.id };
  const base = slug(String(n?.text ?? n?.label ?? n?.title ?? "")) || String(n?.type ?? n?.use ?? "item");
  const used = allIds(doc, screen);
  let id = base, i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  return { doc: setAt(doc, [...path, "id"], id), id };
}

export function parentOf(path: Path): { list: Path; index: number } | undefined {
  const i = path[path.length - 1];
  return typeof i === "number" ? { list: path.slice(0, -1), index: i } : undefined;
}

/** Remove the layout nudge for an id. */
function dropNudge(doc: WireframeFile, screen: string, id?: unknown): WireframeFile {
  if (typeof id !== "string" || !doc.layout?.[screen]?.[id]) return doc;
  let d = setAt(doc, ["layout", screen, id], undefined);
  if (!Object.keys(d.layout?.[screen] ?? {}).length) d = setAt(d, ["layout", screen], undefined);
  if (!Object.keys(d.layout ?? {}).length) d = setAt(d, ["layout"], undefined);
  return d;
}

export function remove(doc: WireframeFile, screen: string, path: Path): WireframeFile {
  const n = getAt(doc, path) as WNode | undefined;
  return setAt(dropNudge(doc, screen, n?.id), path, undefined);
}

export function move(doc: WireframeFile, path: Path, delta: number): { doc: WireframeFile; path: Path } {
  const p = parentOf(path);
  if (!p) return { doc, path };
  const list = getAt(doc, p.list) as unknown[];
  const to = p.index + delta;
  if (!Array.isArray(list) || to < 0 || to >= list.length) return { doc, path };
  const next = clone(list);
  const [it] = next.splice(p.index, 1);
  next.splice(to, 0, it);
  return { doc: setAt(doc, p.list, next), path: [...p.list, to] };
}

export function insertAt(doc: WireframeFile, list: Path, index: number, node: unknown): { doc: WireframeFile; path: Path } {
  const cur = (getAt(doc, list) as unknown[] | undefined) ?? [];
  const next = clone(cur);
  const i = Math.max(0, Math.min(index, next.length));
  next.splice(i, 0, node);
  return { doc: setAt(doc, list, next), path: [...list, i] };
}

/** Strip ids (so a copy doesn't clash) and links to screens this file doesn't have. */
export function freshCopy(doc: WireframeFile, node: unknown): unknown {
  const n = clone(node) as WNode;
  const walk = (x: WNode) => {
    if (!x || typeof x !== "object") return;
    delete x.id;
    if (typeof x.goes === "string" && x.goes !== "back" && !doc.screens[x.goes]) delete x.goes;
    for (const list of [x.items, x.actions]) if (Array.isArray(list)) list.forEach((it) => { if (it && typeof it === "object" && typeof (it as WNode).goes === "string" && (it as WNode).goes !== "back" && !doc.screens[(it as WNode).goes!]) delete (it as WNode).goes; });
    x.children?.forEach(walk);
  };
  walk(n);
  return n;
}

/** Where a new component goes: into a selected container, after a selected element, else at the end of the screen. */
export function insertTarget(doc: WireframeFile, sel: Sel, fallbackScreen: string): { screen: string; list: Path; index: number } {
  if (sel && sel.key && !sel.key.includes("#")) {
    const path = pathOf(sel.screen, sel.key);
    const n = getAt(doc, path) as WNode;
    if (n?.type && COMPONENTS[n.type]?.container) return { screen: sel.screen, list: [...path, "children"], index: (n.children ?? []).length };
    const p = parentOf(path);
    if (p) return { screen: sel.screen, list: p.list, index: p.index + 1 };
  }
  const screen = sel?.screen ?? fallbackScreen;
  const kids = doc.screens[screen]?.children ?? [];
  // before pinned bars at the end (a tab bar is usually last)
  let index = kids.length;
  while (index > 0 && (kids[index - 1]?.pin || kids[index - 1]?.use || (kids[index - 1]?.type && COMPONENTS[kids[index - 1].type!]?.defaultPin))) index--;
  return { screen, list: ["screens", screen, "children"], index };
}

/** Rename a screen and every link to it. */
export function renameScreen(doc: WireframeFile, from: string, to: string): WireframeFile {
  if (!to || from === to || doc.screens[to]) return doc;
  const d = clone(doc);
  const screens: WireframeFile["screens"] = {};
  for (const [k, v] of Object.entries(d.screens)) screens[k === from ? to : k] = v;
  d.screens = screens;
  if (d.start === from) d.start = to;
  for (const m of [d.layout, d.canvas] as (Record<string, unknown> | undefined)[]) if (m && from in m) { m[to] = m[from]; delete m[from]; }
  const fix = (x: unknown) => {
    if (Array.isArray(x)) { x.forEach(fix); return; }
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    if (o.goes === from) o.goes = to;
    for (const v of Object.values(o)) if (v && typeof v === "object") fix(v);
  };
  fix(d.screens); fix(d.shared);
  return d;
}

export function addScreen(doc: WireframeFile, after?: string): { doc: WireframeFile; id: string } {
  let id = "screen", i = 2;
  while (doc.screens[id]) id = `screen-${i++}`;
  const d = clone(doc);
  const entries = Object.entries(d.screens);
  const at = after ? entries.findIndex(([k]) => k === after) + 1 : entries.length;
  entries.splice(at || entries.length, 0, [id, { title: "New screen", children: [{ type: "navbar", title: "New screen", back: true }, { type: "text", lines: 3 }] }]);
  d.screens = Object.fromEntries(entries);
  return { doc: d, id };
}

export function duplicateScreen(doc: WireframeFile, id: string): { doc: WireframeFile; id: string } {
  let nid = `${id}-copy`, i = 2;
  while (doc.screens[nid]) nid = `${id}-copy-${i++}`;
  const d = clone(doc);
  const entries = Object.entries(d.screens);
  const at = entries.findIndex(([k]) => k === id) + 1;
  entries.splice(at, 0, [nid, { ...clone(d.screens[id]), title: `${d.screens[id].title ?? id} (copy)` }]);
  d.screens = Object.fromEntries(entries);
  if (d.layout?.[id]) d.layout[nid] = clone(d.layout[id]);
  return { doc: d, id: nid };
}

export function deleteScreen(doc: WireframeFile, id: string): WireframeFile {
  if (Object.keys(doc.screens).length <= 1) return doc;
  const d = clone(doc);
  delete d.screens[id];
  if (d.layout) delete d.layout[id];
  if (d.canvas) delete d.canvas[id];
  if (d.start === id) delete d.start;
  return d;
}

/** "In order.wireframe.json, screen "cart", button "Pay" (screens.cart.children[7])": paste this to an agent. */
export function pointer(file: string, doc: WireframeFile, screen: string, key: string): string {
  const path = pathOf(screen, key);
  const n = getAt(doc, path) as WNode | string | undefined;
  const dotted = path.map((p) => (typeof p === "number" ? `[${p}]` : `.${p}`)).join("").slice(1);
  const what = typeof n === "string" ? `item "${n}"` : n ? `${n.type ?? n.use ?? "element"}${n.text || n.label || n.title ? ` "${n.text ?? n.label ?? n.title}"` : ""}${n.id ? ` (id "${n.id}")` : ""}` : "screen";
  return key ? `In ${file}, screen "${screen}", ${what} (${dotted}): ` : `In ${file}, screen "${screen}": `;
}

/** When a screen gets wider on a canvas with saved positions, slide the screens to its right along so nothing overlaps. */
export function keepClear(prev: WireframeFile, next: WireframeFile, width: (d: WireframeFile, id: string) => number): WireframeFile {
  if (!next.canvas) return next;
  let out = next;
  for (const id of Object.keys(next.screens)) {
    if (!prev.screens[id] || !next.canvas[id]) continue;
    const dw = width(next, id) - width(prev, id);
    if (!dw) continue;
    const x0 = next.canvas[id][0];
    const canvas = { ...out.canvas! };
    for (const [k, [x, y]] of Object.entries(canvas)) if (k !== id && x > x0) canvas[k] = [x + dw, y];
    out = { ...out, canvas };
  }
  return out;
}

/** The same screen as another device, placed under the original: "how does this look on desktop?" */
export function versionAs(doc: WireframeFile, id: string, device: string, below: (d: WireframeFile, id: string) => { x: number; y: number; h: number } | undefined): { doc: WireframeFile; id: string } {
  let nid = `${id}-${device}`, i = 2;
  while (doc.screens[nid]) nid = `${id}-${device}-${i++}`;
  const d = clone(doc);
  const entries = Object.entries(d.screens);
  const at = entries.findIndex(([k]) => k === id) + 1;
  const src = d.screens[id];
  const label = device.replace(/-/g, " ");
  entries.splice(at, 0, [nid, { ...clone(src), device: device as never, title: `${src.title ?? id} (${label})`, versionOf: src.versionOf ?? id, markup: undefined }]);
  d.screens = Object.fromEntries(entries);
  if (d.layout?.[id]) d.layout[nid] = clone(d.layout[id]);
  const spot = below(doc, id);
  if (spot) {
    // freeze where everything is now, then put the new version under its original
    d.canvas = { ...(d.canvas ?? {}) };
    d.canvas[nid] = [spot.x, spot.y + spot.h + 180];
  }
  return { doc: d, id: nid };
}

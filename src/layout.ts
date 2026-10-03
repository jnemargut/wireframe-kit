/**
 * The stack solver (decision 3): stacks down or across with gap, pad and align, plus `pin` to float things
 * over the screen. Plain arithmetic, no layout engine, so it runs the same in Node and the browser.
 * Produces a flat list of boxes (one per element, parents before children) that the renderer, the editor's
 * hit-testing and the link arrows all share.
 */
import { COMPONENTS, guessIcon, ICONS, type Pin } from "./vocab";

const ICON_SET = new Set<string>(ICONS);
/** Is this toolbar/menu item just an icon name? */
export const isIconItem = (it: Item) => (typeof it === "string" ? ICON_SET.has(it) : !(it.text ?? it.title) && !!it.icon);
import { deviceSize, itemGoes, itemText, itemTitle, resolveNode, type Item, type Nudge, type Screen, type WireframeFile, type WNode } from "./types";
import { textWidth, wrap, type Face } from "./text";

export const FS = { title: 28, heading: 20, text: { sm: 15, md: 17, lg: 20 } as Record<string, number>, label: 15, link: 17, button: { sm: 15, md: 18, lg: 19 } as Record<string, number>, small: 13, tab: 12, item: 17 };
export const lineH = (size: number, face: Face = "hand") => Math.round(size * (face === "title" ? 1.25 : 1.3));

export type Path = (string | number)[];
export interface Box {
  /** Path inside the screen, joined with "/" ("" = the screen itself). */
  key: string;
  /** Full path in the file, for edits. */
  path: Path;
  node: WNode;
  type: string;
  x: number; y: number; w: number; h: number;
  /** 0 = the screen's flow; pinned things get their own plane, drawn on top in order. */
  plane: number;
  depth: number;
  id?: string;
  goes?: string;
  pinned?: boolean;
  scrim?: boolean;
  hidden?: boolean;
  scale?: number;
  /** Comes from the file's `shared` pieces (global navigation): no arrows on the canvas. */
  shared?: boolean;
  /** Placed freely by the designer (`at`). */
  free?: boolean;
}
export interface ItemBox { key: string; parent: string; path: Path; index: number; x: number; y: number; w: number; h: number; goes?: string; text: string; shared?: boolean }
export interface Layout {
  screen: string;
  w: number; h: number;
  boxes: Box[];
  items: ItemBox[];
  /** How far content runs past the bottom (0 = fits). */
  overflow: number;
  insets: { top: number; bottom: number };
  phone: boolean;
  statusbar: boolean;
  /** Browser tabs and address bar across the top (the screen's `url`). */
  browser?: { y: number; url: string; title: string };
  notes: { n: number; key: string; text: string }[];
}

export const typeOf = (n: WNode) => (n.type && COMPONENTS[n.type] ? n.type : "sketch");
const def = (n: WNode) => COMPONENTS[typeOf(n)];
const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const isContainer = (n: WNode) => !!def(n).container;
export const itemsOf = (n: WNode): Item[] => (Array.isArray(n.items) ? (n.items as Item[]) : []);

const PAD: Record<string, number> = { card: 14, sheet: 20, dialog: 20, browser: 20, window: 16, drawer: 20, popover: 14 };
const GAP: Record<string, number> = { row: 8, card: 8, section: 10, grid: 12, sheet: 12, dialog: 12, stack: 12, browser: 14, window: 12, drawer: 14, popover: 8 };

/** Browser chrome: a tab strip and the address bar. */
export const BROWSER_BAR = 84;
export const WINDOW_BAR = 40;
export const padOf = (n: WNode) => num(n.pad, PAD[typeOf(n)] ?? 0);
export const gapOf = (n: WNode) => num(n.gap, GAP[typeOf(n)] ?? 12);
export const dirOf = (n: WNode): "down" | "right" => (typeOf(n) === "row" ? "right" : typeOf(n) === "stack" && n.dir === "right" ? "right" : "down");

/** Space a container's own chrome takes above its children. */
export function headerOf(n: WNode): number {
  const t = typeOf(n);
  if (t === "section") return n.title || n.action ? 28 + gapOf(n) : 0;
  if (t === "sheet") return 18 + (n.title ? 34 : 0);
  if (t === "dialog") return n.title ? 36 : 0;
  if (t === "browser") return BROWSER_BAR;
  if (t === "window") return WINDOW_BAR;
  if (t === "drawer") return n.title ? 44 : 8;
  if (t === "popover") return (n.title ? 30 : 0) + 10;
  return 0;
}

export function aspect(v: unknown, d = 16 / 9): number {
  const m = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(str(v));
  return m ? Number(m[1]) / Number(m[2]) : d;
}

const tw = (s: string, size: number, face: Face = "hand") => textWidth(s, face, size);
const lines = (s: string, size: number, w: number, face: Face = "hand") => Math.max(1, wrap(s, face, size, Math.max(10, w)).length);

/** Intrinsic width: how wide it wants to be on one line. */
export function hugW(raw: WNode, file?: WireframeFile): number {
  const n = file ? resolveNode(file, raw) : raw;
  if (typeof n.width === "number") return n.width;
  const t = typeOf(n);
  const text = str(n.text);
  const kids = (n.children ?? []).map((c) => (file ? resolveNode(file, c) : c));
  switch (t) {
    case "title": return tw(text, FS.title, "title");
    case "heading": return tw(text, FS.heading, "title");
    case "text": return text ? tw(text, FS.text[str(n.size)] ?? FS.text.md) : 220;
    case "label": return tw(text, FS.label);
    case "link": return tw(text, FS.link);
    case "badge": return tw(text, 14) + 22;
    case "button": return (n.variant === "text" ? tw(text, FS.button[str(n.size)] ?? 18) + 12 : tw(text, FS.button[str(n.size)] ?? 18) + 40) + (n.icon ? 30 : 0);
    case "icon-button": return 44;
    case "input": case "textarea": case "select": case "search": return 240;
    case "checkbox": return 32 + tw(text, FS.item);
    case "radio": return n.dir === "right" ? itemsOf(n).reduce((a, i) => a + tw(itemText(i), FS.item) + 58, -24) : 34 + Math.max(0, ...itemsOf(n).map((i) => tw(itemText(i), FS.item)));
    case "toggle": return tw(text, FS.item) + 72;
    case "slider": case "progress": return 200;
    case "stepper": return 112;
    case "segmented": return itemsOf(n).reduce((a, i) => a + tw(itemText(i), 16) + 32, 0);
    case "chips": return itemsOf(n).reduce((a, i) => a + tw(itemText(i), 15) + 30 + 8, -8);
    case "tabs": return itemsOf(n).reduce((a, i) => a + tw(itemText(i), 16) + 32, 0);
    case "breadcrumbs": return itemsOf(n).reduce((a, i) => a + tw(itemText(i), 15) + 22, -22);
    case "pagination": { const p = num(n.pages, 5); return (p + 2) * 36 + (p + 1) * 6; }
    case "dots": return num(n.count, 3) * 16 - 6;
    case "sidebar": return n.collapsed ? 64 : 240;
    case "image": return typeof n.height === "number" ? n.height * aspect(n.aspect) : 140;
    case "avatar": return num(n.size, 40);
    case "icon": return num(n.size, 24);
    case "list": return 300;
    case "table": return 360;
    case "chart": case "map": case "video": return 300;
    case "rating": return 5 * 22 + 4 * 4;
    case "divider": return 120;
    case "spacer": return 0;
    case "alert": return 300;
    case "toast": return tw(text, 16) + 40 + (n.action ? tw(str(n.action), 16) + 24 : 0);
    case "steps": return 300;
    case "spinner": return 28 + (n.label ? 10 + tw(str(n.label), FS.label) : 0);
    case "sketch": return Math.max(120, tw(str(n.label), FS.label) + 32);
    case "banner": case "empty-state": case "skeleton": case "date-picker": case "tag-input": case "file-upload": case "details": case "tree": case "timeline": case "code": case "accordion": case "toolbar": return 300;
    case "stat": return 180;
    case "split-button": return tw(text, 18) + 40 + 44;
    case "fab": return n.text ? tw(text, 17) + 72 : 56;
    case "calendar": return 280;
    case "avatar-group": { const k = (Array.isArray(n.items) ? n.items.length : 3) + (num(n.more, 0) ? 1 : 0); return 40 + Math.max(0, k - 1) * 28; }
    case "menu": return Math.min(320, Math.max(180, ...itemsOf(n).map((i) => tw(itemText(i), 16) + 76 + (typeof i === "object" && i.shortcut ? tw(str(i.shortcut), 14) + 16 : 0))));
    case "tooltip": return tw(text, 15) + 24;
  }
  if (isContainer(n)) {
    const p = padOf(n) * 2;
    if (dirOf(n) === "right") return kids.reduce((a, c) => a + hugW(c, file), 0) + gapOf(n) * Math.max(0, kids.length - 1) + p;
    if (t === "grid") { const cols = num(n.columns, 2); return cols * Math.max(0, ...kids.map((c) => hugW(c, file))) + gapOf(n) * (cols - 1) + p; }
    const head = t === "section" ? tw(str(n.title), FS.label) + (n.action ? tw(str(n.action), FS.label) + 16 : 0) : 0;
    return Math.max(head, ...kids.map((c) => hugW(c, file))) + p;
  }
  return 200;
}

/** How wide a child is inside `avail` px of its parent. */
export function widthOf(n: WNode, avail: number, file?: WireframeFile): number {
  if (typeof n.width === "number") return Math.min(n.width, avail);
  const mode = n.width === "hug" || n.width === "fill" ? n.width : def(n).defaultWidth;
  if (typeOf(n) === "dialog") return Math.min(avail, 400);
  if (typeOf(n) === "drawer") return Math.min(avail, Math.max(260, Math.min(360, avail * 0.85)));
  if (typeOf(n) === "popover" && n.width === undefined) return Math.min(avail, 280);
  return mode === "hug" ? Math.min(Math.ceil(hugW(n, file)), avail) : avail;
}

// ---------- item geometry (shared by layout, renderer and links) ----------

export interface Rect { x: number; y: number; w: number; h: number }

export function listRows(n: WNode, w: number): (Rect & { item: Item })[] {
  const cards = !!n.cards;
  let y = 0;
  return itemsOf(n).map((item) => {
    const o = typeof item === "string" ? {} : item;
    const h = o.image ? 76 : o.subtitle ? 68 : 52;
    const r = { x: 0, y, w, h, item };
    y += h + (cards ? 8 : 0);
    return r;
  });
}

/** A dropdown/menu panel's rows: "-" (or { divider: true }) is a thin divider. */
export const MENU_PAD = 6;
export function menuRows(items: Item[], w: number): (Rect & { item: Item; divider: boolean })[] {
  let y = MENU_PAD;
  return items.map((item) => {
    const divider = item === "-" || (typeof item === "object" && !!item.divider);
    const r = { x: MENU_PAD, y, w: w - MENU_PAD * 2, h: divider ? 11 : 40, item, divider };
    y += r.h;
    return r;
  });
}
export const menuH = (items: Item[]) => { const r = menuRows(items, 100); return r.length ? r[r.length - 1].y + r[r.length - 1].h + MENU_PAD : 52; };

/** Tree items flattened to visible rows, with their depth. */
export function treeRows(items: Item[], depth = 0, out: { item: Item; depth: number; kids: boolean }[] = []) {
  for (const it of items) {
    const o = typeof it === "string" ? {} : it;
    const kids = Array.isArray(o.children) ? (o.children as Item[]) : [];
    out.push({ item: it, depth, kids: kids.length > 0 });
    if (kids.length && o.open) treeRows(kids, depth + 1, out);
  }
  return out;
}

export function accordionRows(n: WNode, w: number): (Rect & { item: Item; open: boolean; textH: number })[] {
  const open = new Set(Array.isArray(n.open) ? n.open.map(String) : n.open ? [String(n.open)] : []);
  let y = 0;
  return itemsOf(n).map((item) => {
    const o = typeof item === "string" ? { title: item } : item;
    const isOpen = open.has(itemTitle(o as Item));
    const body = isOpen ? str(o.text) : "";
    const textH = isOpen ? (body ? lines(body, 16, w - 32) * lineH(16) : 2 * lineH(16)) + 16 : 0;
    const r = { x: 0, y, w, h: 52 + textH, item, open: isOpen, textH };
    y += r.h;
    return r;
  });
}

export function timelineRows(n: WNode, w: number): (Rect & { item: Item })[] {
  let y = 0;
  return itemsOf(n).map((item) => {
    const o = typeof item === "string" ? {} : item;
    const h = 30 + (o.text ? lines(str(o.text), 15, w - 40) * lineH(15) + 2 : 0) + 18;
    const r = { x: 0, y, w, h, item };
    y += h;
    return r;
  });
}

export function detailRows(n: WNode): { label: string; value: string }[] {
  return itemsOf(n).map((it) => {
    if (typeof it === "string") { const i = it.indexOf(":"); return i > 0 ? { label: it.slice(0, i).trim(), value: it.slice(i + 1).trim() } : { label: it, value: "" }; }
    return { label: str(it.label ?? it.title ?? it.text), value: str(it.value ?? it.subtitle ?? "") };
  });
}

export function chipRects(n: WNode, w: number): Rect[] {
  const out: Rect[] = [];
  let x = 0, y = 0;
  for (const it of itemsOf(n)) {
    const cw = Math.min(w, tw(itemText(it), 15) + 30 + (n.close ? 18 : 0));
    if (x > 0 && x + cw > w) { x = 0; y += 34 + 8; }
    out.push({ x, y, w: cw, h: 34 });
    x += cw + 8;
  }
  return out;
}

export function itemRects(n: WNode, w: number, h: number): Rect[] {
  const t = typeOf(n);
  const its = itemsOf(n);
  const k = its.length || 1;
  switch (t) {
    case "list": return listRows(n, w);
    case "chips": return chipRects(n, w);
    case "tabbar": return its.map((_, i) => ({ x: (w / k) * i, y: 0, w: w / k, h: 64 }));
    case "tabs": case "segmented": return its.map((_, i) => ({ x: (w / k) * i, y: 0, w: w / k, h }));
    case "menu": return menuRows(its, w).map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
    case "toolbar": {
      let x = 0;
      return its.map((it) => {
        const icon = isIconItem(it);
        const r = { x, y: (h - 40) / 2, w: icon ? 40 : tw(itemText(it), 16) + 32 + (typeof it === "object" && it.icon ? 26 : 0), h: 40 };
        x += r.w + 8;
        return r;
      });
    }
    case "sidebar": return its.map((_, i) => ({ x: n.collapsed ? 8 : 10, y: (n.title && !n.collapsed ? 64 : 16) + i * 44, w: w - (n.collapsed ? 16 : 20), h: 40 }));
    case "breadcrumbs": {
      let x = 0;
      return its.map((it) => { const r = { x, y: 0, w: tw(itemText(it), 15), h }; x += r.w + 22; return r; });
    }
    case "topnav": {
      let x = w - 24 - (n.button ? tw(str(n.button), 16) + 36 + 20 : 0);
      return its.map((it) => ({ it, wd: tw(itemText(it), 16) })).reverse().map(({ wd }) => { x -= wd; const r = { x: x - 6, y: 12, w: wd + 12, h: h - 24 }; x -= 28; return r; }).reverse();
    }
    case "navbar": {
      const acts = itemsOf({ items: n.actions } as WNode);
      return acts.map((_, i) => ({ x: w - 8 - 40 * (acts.length - i), y: 8, w: 40, h: 40 }));
    }
  }
  return [];
}

// ---------- heights ----------

/** A month calendar: header, weekday letters, six weeks. */
export const CAL_H = 44 + 26 + 6 * 36 + 8;

export function heightOf(raw: WNode, w: number, file?: WireframeFile): number {
  const n = file ? resolveNode(file, raw) : raw;
  if (typeof n.height === "number" && typeOf(n) !== "spacer") return n.height;
  const t = typeOf(n);
  const text = str(n.text);
  const lab = n.label ? 26 : 0;
  switch (t) {
    case "title": return lines(text, FS.title, w, "title") * lineH(FS.title, "title");
    case "heading": return lines(text, FS.heading, w, "title") * lineH(FS.heading, "title");
    case "text": { const s = FS.text[str(n.size)] ?? FS.text.md; return (text ? lines(text, s, w) : num(n.lines, 3)) * lineH(s); }
    case "label": return lines(text, FS.label, w) * lineH(FS.label);
    case "link": return lines(text, FS.link, w) * lineH(FS.link);
    case "badge": return 26;
    case "button": return n.variant === "text" ? 32 : ({ sm: 38, md: 48, lg: 56 } as Record<string, number>)[str(n.size)] ?? 48;
    case "icon-button": return 44;
    case "input": case "select": return lab + 46 + (n.error || n.help ? 22 : 0);
    case "textarea": return lab + num(n.rows, 3) * 22 + 24 + (n.error || n.help ? 22 : 0);
    case "search": return 44;
    case "checkbox": return Math.max(28, lines(text, FS.item, w - 34) * lineH(FS.item));
    case "radio": return n.dir === "right" ? 36 : itemsOf(n).length * 36;
    case "toggle": return Math.max(32, lines(text, FS.item, w - 72) * lineH(FS.item));
    case "slider": return lab + 24;
    case "stepper": return 38;
    case "segmented": return 40;
    case "chips": { const r = chipRects(n, w); return r.length ? r[r.length - 1].y + 34 : 34; }
    case "navbar": return n.large ? 104 : 56;
    case "tabbar": return 64;
    case "tabs": return 44;
    case "breadcrumbs": return 24;
    case "pagination": return 36;
    case "dots": return 10;
    case "sidebar": return (n.title ? 64 : 16) + itemsOf(n).length * 44 + 16;
    case "topnav": return 64;
    case "image": return Math.round(w / aspect(n.aspect, n.round ? 1 : 16 / 9));
    case "avatar": return num(n.size, 40);
    case "icon": return num(n.size, 24);
    case "list": { const r = listRows(n, w); return r.length ? r[r.length - 1].y + r[r.length - 1].h : 52; }
    case "table": return 40 + (Array.isArray(n.rows) ? n.rows.length : 2) * 40;
    // (the select column and actions column sit inside the same width)
    case "chart": return 160 + (n.label ? 24 : 0);
    case "map": return 180 + (n.label ? 24 : 0);
    case "video": return Math.round((w * 9) / 16) + (n.label ? 24 : 0);
    case "rating": return 22;
    case "divider": return n.text ? 22 : 2;
    case "spacer": return num(n.height, 0);
    case "keyboard": return 260;
    case "alert": return 24 + (n.title ? 22 : 0) + lines(text, 16, w - 58) * lineH(16);
    case "toast": return 48;
    case "progress": return n.kind === "circle" ? 72 + (n.label ? 26 : 0) : (n.label ? 26 : 0) + 12;
    case "steps": return n.vertical ? Math.max(1, Array.isArray(n.items) ? n.items.length : 3) * 56 - 20 : 58;
    case "spinner": return 28;
    case "sketch": return 120;
    case "banner": return 48;
    case "empty-state": return 64 + 14 + (n.title ? lines(str(n.title), 20, w - 32, "title") * lineH(20, "title") + 6 : 0) + (text ? lines(text, 16, Math.min(w, 340) - 16) * lineH(16) + 6 : 0) + (n.button ? 60 : 0);
    case "skeleton": return (n.image ? Math.round(w * 0.42) + 14 : 0) + Math.max(n.avatar ? 44 : 0, num(n.lines, 3) * 22);
    case "split-button": return 48;
    case "fab": return 56;
    case "date-picker": return lab + 46 + (n.error ? 22 : 0);
    case "tag-input": return lab + 46;
    case "file-upload": return lab + 110 + (Array.isArray(n.files) ? n.files.length * 40 + 6 : 0);
    case "calendar": return CAL_H;
    case "details": { const k = Math.max(1, num(n.columns, 1)); return Math.ceil(detailRows(n).length / k) * 52; }
    case "stat": return 104;
    case "avatar-group": return 40;
    case "tree": return treeRows(itemsOf(n)).length * 36;
    case "timeline": { const r = timelineRows(n, w); return r.length ? r[r.length - 1].y + r[r.length - 1].h - 14 : 40; }
    case "code": return 24 + (text ? text.split("\n").length : num(n.lines, 4)) * 21;
    case "accordion": { const r = accordionRows(n, w); return r.length ? r[r.length - 1].y + r[r.length - 1].h : 52; }
    case "toolbar": return 56;
    case "menu": return menuH(itemsOf(n));
    case "tooltip": return 36 + 8;
  }
  if (isContainer(n)) return containerHeight(n, w, file);
  return 40;
}

function flowKids(n: WNode, file?: WireframeFile) {
  return (n.children ?? []).map((c, i) => ({ c: file ? resolveNode(file, c) : c, i }));
}

function containerHeight(n: WNode, w: number, file?: WireframeFile): number {
  const p = padOf(n), g = gapOf(n), cw = w - p * 2;
  const kids = flowKids(n, file).map((k) => k.c);
  const head = headerOf(n);
  if (!kids.length) return p * 2 + head + (typeOf(n) === "card" ? 24 : 0);
  if (typeOf(n) === "grid") {
    const cols = Math.max(1, num(n.columns, 2));
    const colW = (cw - g * (cols - 1)) / cols;
    let total = 0;
    for (let r = 0; r < kids.length; r += cols) total += Math.max(...kids.slice(r, r + cols).map((c) => heightOf(c, colW, file))) + (r ? g : 0);
    return p * 2 + head + total;
  }
  if (dirOf(n) === "right") {
    if (n.wrap) return p * 2 + head + wrapRows(n, cw, file).reduce((a, r, i) => a + r.h + (i ? g : 0), 0);
    const ws = rowWidths(kids, cw, g, file);
    return p * 2 + head + Math.max(0, ...kids.map((c, i) => heightOf(c, ws[i], file)));
  }
  return p * 2 + head + kids.reduce((a, c) => a + heightOf(c, widthOf(c, cw, file), file), 0) + g * (kids.length - 1);
}

/** Widths of children laid across: hug things keep their width, fill things share the rest. */
export function rowWidths(kids: WNode[], cw: number, g: number, file?: WireframeFile): number[] {
  const free = cw - g * Math.max(0, kids.length - 1);
  const fixed = kids.map((c) => {
    if (typeof c.width === "number") return c.width;
    const mode = c.width === "hug" || c.width === "fill" ? c.width : typeOf(c) === "spacer" ? "fill" : def(c).defaultWidth;
    return mode === "hug" && !(typeof c.grow === "number" && c.grow > 0) ? Math.ceil(hugW(c, file)) : -1;
  });
  const used = fixed.reduce((a, x) => a + (x > 0 ? x : 0), 0);
  const weights = kids.map((c, i) => (fixed[i] >= 0 ? 0 : typeOf(c) === "spacer" ? num(c.grow, 1) : num(c.grow, 1) || 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const left = Math.max(0, free - used);
  const scale = used > free && used > 0 ? free / used : 1;
  return kids.map((_, i) => (fixed[i] >= 0 ? fixed[i] * (wsum ? Math.min(1, scale) : scale) : wsum ? (left * weights[i]) / wsum : 0));
}

function wrapRows(n: WNode, cw: number, file?: WireframeFile) {
  const g = gapOf(n);
  const rows: { idx: number[]; ws: number[]; h: number }[] = [];
  let cur = { idx: [] as number[], ws: [] as number[], h: 0 }, x = 0;
  flowKids(n, file).forEach(({ c, i }) => {
    const w = Math.min(cw, typeof c.width === "number" ? c.width : Math.ceil(hugW(c, file)));
    if (cur.idx.length && x + w > cw) { rows.push(cur); cur = { idx: [], ws: [], h: 0 }; x = 0; }
    cur.idx.push(i); cur.ws.push(w); cur.h = Math.max(cur.h, heightOf(c, w, file)); x += w + g;
  });
  if (cur.idx.length) rows.push(cur);
  return rows;
}

// ---------- placement ----------

interface Ctx { file: WireframeFile; out: Box[]; items: ItemBox[]; plane: number; screenPath: Path }

function emit(ctx: Ctx, n: WNode, path: Path, x: number, y: number, w: number, h: number, depth: number, extra: Partial<Box> = {}) {
  const key = path.slice(ctx.screenPath.length).join("/");
  const b: Box = { key, path, node: n, type: typeOf(n), x, y, w, h, plane: ctx.plane, depth, id: typeof n.id === "string" ? n.id : undefined, goes: typeof n.goes === "string" ? n.goes : undefined, ...extra };
  if (typeOf(n) === "navbar" && n.back && !b.goes) b.goes = undefined;
  ctx.out.push(b);
  if (def(n).linkItems || typeOf(n) === "navbar") {
    const its = typeOf(n) === "navbar" ? itemsOf({ items: n.actions } as WNode) : itemsOf(n);
    itemRects(n, w, h).forEach((r, i) => {
      const it = its[i];
      if (it === undefined) return;
      ctx.items.push({ key: `${key}#${i}`, parent: key, path: [...path, typeOf(n) === "navbar" ? "actions" : "items", i], index: i, x: x + r.x, y: y + r.y, w: r.w, h: r.h, goes: itemGoes(it), text: typeof it === "string" ? it : itemText(it) || String((it as { icon?: string }).icon ?? "") });
    });
  }
  return b;
}

function place(ctx: Ctx, n: WNode, path: Path, x: number, y: number, w: number, h: number, depth: number, root?: { W: number; first: boolean; last: boolean }) {
  if (depth > 0) emit(ctx, n, path, x, y, w, h, depth);
  if (!isContainer(n)) return;
  const p = padOf(n), g = gapOf(n), head = headerOf(n);
  const kids = flowKids(n, ctx.file).filter(({ c }) => !(depth === 0 && (pinOf(c) || isFree(c))));
  const cx0 = x + p, cw = w - p * 2;

  if (typeOf(n) === "grid") {
    const cols = Math.max(1, num(n.columns, 2));
    const colW = (cw - g * (cols - 1)) / cols;
    let cy = y + p + head;
    for (let r = 0; r < kids.length; r += cols) {
      const row = kids.slice(r, r + cols);
      const rh = Math.max(...row.map(({ c }) => heightOf(c, colW, ctx.file)));
      row.forEach(({ c, i }, j) => place(ctx, c, [...path, "children", i], cx0 + j * (colW + g), cy, colW, rh, depth + 1));
      cy += rh + g;
    }
    return;
  }

  if (dirOf(n) === "right") {
    const innerH = h - p * 2 - head;
    const align = str(n.align) || (typeOf(n) === "row" ? "center" : depth === 0 ? "stretch" : "start");
    if (n.wrap) {
      let cy = y + p + head;
      for (const r of wrapRows({ ...n, children: kids.map((k) => k.c) } as WNode, cw, ctx.file)) {
        let cx = cx0;
        r.idx.forEach((ki, j) => { const { c, i } = kids[ki]; const ch = heightOf(c, r.ws[j], ctx.file); place(ctx, c, [...path, "children", i], cx, cy + (r.h - ch) / 2, r.ws[j], ch, depth + 1); cx += r.ws[j] + g; });
        cy += r.h + g;
      }
      return;
    }
    const ws = rowWidths(kids.map((k) => k.c), cw, g, ctx.file);
    const used = ws.reduce((a, b) => a + b, 0) + g * Math.max(0, kids.length - 1);
    const left = Math.max(0, cw - used);
    const j = str(n.justify);
    let cx = cx0 + (j === "center" ? left / 2 : j === "end" ? left : 0);
    const between = j === "between" && kids.length > 1 ? left / (kids.length - 1) : 0;
    kids.forEach(({ c, i }, k) => {
      const ch = align === "stretch" ? innerH : Math.min(innerH > 0 ? innerH : Infinity, heightOf(c, ws[k], ctx.file));
      const cy = y + p + head + (align === "center" ? (innerH - ch) / 2 : align === "end" ? innerH - ch : 0);
      place(ctx, c, [...path, "children", i], cx, cy, ws[k], ch, depth + 1);
      cx += ws[k] + g + between;
    });
    return;
  }

  // down
  const widths = kids.map(({ c }) => (root && COMPONENTS[typeOf(c)]?.bleed ? root.W : widthOf(c, cw, ctx.file)));
  const heights = kids.map(({ c }, k) => heightOf(c, widths[k], ctx.file));
  const natural = p * 2 + head + heights.reduce((a, b) => a + b, 0) + g * Math.max(0, kids.length - 1);
  let extra = h - natural;
  // a bleed bar at the very top/bottom of a screen sits flush, without the screen's padding
  const firstBleed = !!root && kids.length > 0 && !!COMPONENTS[typeOf(kids[0].c)]?.bleed;
  const lastBleed = !!root && kids.length > 0 && !!COMPONENTS[typeOf(kids[kids.length - 1].c)]?.bleed;
  if (firstBleed) extra += p;
  if (lastBleed) extra += p;
  const weights = kids.map(({ c }) => (typeOf(c) === "spacer" && typeof c.height !== "number" ? num(c.grow, 1) : num(c.grow, 0)));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const j = str(n.justify);
  let cy = y + (firstBleed ? 0 : p) + head;
  let between = 0;
  if (extra > 0 && !wsum) {
    if (j === "center") cy += extra / 2;
    else if (j === "end") cy += extra;
    else if (j === "between" && kids.length > 1) between = extra / (kids.length - 1);
  }
  const align = str(n.align) || "start";
  kids.forEach(({ c, i }, k) => {
    const cw2 = widths[k];
    const bleed = root && COMPONENTS[typeOf(c)]?.bleed;
    const ch = heights[k] + (wsum && extra > 0 ? (extra * weights[k]) / wsum : 0);
    const free = cw - cw2;
    const cx = bleed ? x : cx0 + (align === "center" ? free / 2 : align === "end" ? free : 0);
    const stretchW = align === "stretch" && !bleed ? cw : cw2;
    place(ctx, c, [...path, "children", i], cx, cy, stretchW, ch, depth + 1);
    cy += ch + g + between;
  });
}

/** Placed freely by the designer: [x, y] on the screen, outside the stacks. */
export const isFree = (c: WNode) => Array.isArray(c.at) && c.at.length === 2 && c.at.every((v) => typeof v === "number" && isFinite(v));
const pinOf = (c: WNode): Pin | undefined => (isFree(c) ? undefined : (c.pin as Pin | undefined) ?? COMPONENTS[typeOf(c)]?.defaultPin);

/** Size of a freely placed element: its own width/height, else its natural size (fill = to the right edge). */
export function freeSize(c: WNode, screenW: number, file?: WireframeFile): { w: number; h: number } {
  const x = (c.at as [number, number])[0];
  const mode = typeof c.width === "number" ? c.width : c.width === "hug" || c.width === "fill" ? c.width : def(c).defaultWidth;
  const w = typeof mode === "number" ? mode : mode === "hug" ? Math.ceil(hugW(c, file)) : Math.max(40, Math.min(screenW - x - 16, 360));
  return { w, h: typeof c.height === "number" ? c.height : heightOf(c, w, file) };
}

/** Lay out one screen. */
export function layoutScreen(file: WireframeFile, screenId: string): Layout {
  const screen: Screen = file.screens[screenId] ?? { children: [] };
  const dev = deviceSize(file, screen);
  const phone = dev.chrome === "phone";
  const statusbar = screen.statusbar ?? (phone || dev.chrome === "tablet");
  const bar = statusbar ? (phone ? 47 : 24) : 0;
  // a screen with a `url` sits in a browser: its tabs and address bar take the top
  const browser = typeof screen.url === "string" ? { y: bar, url: screen.url, title: screen.title ?? "" } : undefined;
  const top = bar + (browser ? BROWSER_BAR : 0);
  const home = statusbar && phone ? 34 : 0;
  const W = dev.w;
  const pad = num(screen.pad, dev.w >= 1000 ? 32 : dev.w < 250 ? 10 : 16);
  const rootNode: WNode = { type: "stack", dir: screen.dir === "right" ? "right" : "down", gap: num(screen.gap, 12), pad, align: screen.align, children: screen.children ?? [] };
  const screenPath: Path = ["screens", screenId];
  const out: Box[] = [];
  const items: ItemBox[] = [];
  const ctx: Ctx = { file, out, items, plane: 0, screenPath };

  // pinned: bottom bars reserve space; everything else floats
  const pinned = (screen.children ?? []).map((raw, i) => ({ c: resolveNode(file, raw), i })).filter(({ c }) => pinOf(c));
  const reserveBottom = pinned.filter(({ c }) => pinOf(c) === "bottom" && COMPONENTS[typeOf(c)]?.bleed && typeOf(c) !== "sheet")
    .reduce((a, { c }) => a + heightOf(c, W, file) + home, 0);
  const reserveTop = pinned.filter(({ c }) => pinOf(c) === "top" && COMPONENTS[typeOf(c)]?.bleed).reduce((a, { c }) => a + heightOf(c, W, file), 0);
  const bottomInset = reserveBottom || home;
  const areaY = top + reserveTop;
  const areaH = dev.h - areaY - bottomInset;

  // the flow. Long pages scroll: the screen grows to fit.
  const naturalH = heightOf(rootNode, W, file);
  const flowH = screen.scroll ? Math.max(areaH, naturalH) : areaH;
  place(ctx, rootNode, screenPath, 0, areaY, W, flowH, 0, { W, first: true, last: true });
  const H = screen.scroll ? Math.max(dev.h, areaY + naturalH + bottomInset) : dev.h;
  const contentBottom = Math.max(areaY, ...out.filter((b) => b.depth === 1 && b.plane === 0).map((b) => b.y + b.h));
  const overflow = screen.scroll ? 0 : Math.max(0, Math.round(contentBottom - (areaY + areaH)));

  // floating things, in file order, each on its own plane
  let stackBottom = H - (home && !reserveBottom ? home : 0);
  const bottomBleeds = pinned.filter(({ c }) => pinOf(c) === "bottom" && COMPONENTS[typeOf(c)]?.bleed && typeOf(c) !== "sheet");
  let plane = 1;
  for (const { c, i } of bottomBleeds) {
    const h = heightOf(c, W, file) + home;
    ctx.plane = plane++;
    emit(ctx, c, [...screenPath, "children", i], 0, stackBottom - h, W, h, 1, { pinned: true });
    stackBottom -= h;
  }
  for (const { c, i } of pinned) {
    if (bottomBleeds.some((bb) => bb.i === i)) continue;
    const pin = pinOf(c)!;
    const t = typeOf(c);
    const bleed = !!COMPONENTS[t]?.bleed;
    const w = bleed ? W : widthOf(c, W - pad * 2, file);
    const h0 = heightOf(c, w, file);
    const h = t === "sheet" ? h0 + home : h0;
    const lowest = t === "sheet" ? H : stackBottom - pad;
    let x = bleed ? 0 : pad, y = top + pad;
    if (pin.includes("bottom")) y = lowest - h;
    if (pin === "top") y = bleed ? top : top + pad;
    if (pin === "top" || pin === "bottom") x = bleed ? 0 : (W - w) / 2;
    if (pin.endsWith("right")) x = W - pad - w;
    if (pin.endsWith("left")) x = pad;
    if (pin === "center" || pin === "left" || pin === "right") y = (H - h) / 2;
    if (pin === "center") x = (W - w) / 2;
    let hh = h;
    if (t === "drawer") { x = c.side === "left" ? 0 : W - w; y = top; hh = H - top; }
    ctx.plane = plane++;
    const scrim = t === "sheet" || t === "dialog" || t === "drawer";
    if (isContainer(c)) {
      emit(ctx, c, [...screenPath, "children", i], x, y, w, hh, 1, { pinned: true, scrim });
      place(ctx, { ...c }, [...screenPath, "children", i], x, y, w, hh, 0);
      // place() at depth 0 doesn't emit the container itself; its children are depth 1. Bump them under it.
      for (const b of out) if (b.plane === ctx.plane && b.key.startsWith(`${[...screenPath, "children", i].slice(2).join("/")}/`)) b.depth += 1;
    } else emit(ctx, c, [...screenPath, "children", i], x, y, w, hh, 1, { pinned: true });
    if (pin.includes("bottom") && !scrim) stackBottom = Math.min(stackBottom, y + pad - 8);
  }

  // shared pieces (and everything inside them)
  const sharedKeys: string[] = [];
  const walk = (kids: WNode[] | undefined, prefix: string) => (kids ?? []).forEach((k, i) => {
    const key = `${prefix}children/${i}`;
    if (k && typeof k === "object" && k.use) sharedKeys.push(key);
    else walk(k?.children, `${key}/`);
  });
  walk(screen.children, "");
  const inShared = (k: string) => sharedKeys.some((sk) => k === sk || k.startsWith(`${sk}/`) || k.startsWith(`${sk}#`));
  for (const b of out) if (inShared(b.key)) b.shared = true;
  for (const it of items) if (inShared(it.key)) it.shared = true;

  // freely placed things, on top of everything, in file order
  (screen.children ?? []).forEach((raw, i) => {
    const c = resolveNode(file, raw);
    if (!isFree(c)) return;
    const [x, y] = c.at as [number, number];
    const { w, h } = freeSize(c, W, file);
    ctx.plane = plane++;
    const path = [...screenPath, "children", i];
    emit(ctx, c, path, x, y, w, h, 1, { free: true });
    if (isContainer(c)) {
      place(ctx, { ...c }, path, x, y, w, h, 0);
      for (const b of out) if (b.plane === ctx.plane && b.key.startsWith(`${path.slice(2).join("/")}/`)) b.depth += 1;
    }
  });

  // the designer's nudges
  const nudges: Record<string, Nudge> = file.layout?.[screenId] ?? {};
  for (const b of out) {
    const nd = b.id ? nudges[b.id] : undefined;
    if (!nd) continue;
    const dx = num(nd.dx, 0), dy = num(nd.dy, 0);
    const under = (k: string) => k === b.key || k.startsWith(`${b.key}/`) || k.startsWith(`${b.key}#`);
    for (const d of out) if (under(d.key)) { d.x += dx; d.y += dy; if (nd.hidden) d.hidden = true; }
    for (const it of items) if (under(it.key)) { it.x += dx; it.y += dy; }
    if (typeof nd.scale === "number" && nd.scale > 0) b.scale = nd.scale;
  }

  const notes: Layout["notes"] = [];
  if (screen.note) notes.push({ n: 0, key: "", text: screen.note });
  for (const b of out) if (typeof b.node.note === "string" && b.node.note && !b.hidden) notes.push({ n: notes.filter((x) => x.n > 0).length + 1, key: b.key, text: b.node.note });

  return { browser, screen: screenId, w: W, h: H, boxes: out, items: items.filter((it) => !out.find((b) => b.key === it.parent)?.hidden), overflow, insets: { top, bottom: bottomInset }, phone, statusbar, notes };
}

/** Every link on a screen: element or item → screen id. */
export function linksOf(l: Layout, withShared = false): { from: Rect; key: string; to: string }[] {
  const out: { from: Rect; key: string; to: string }[] = [];
  for (const b of l.boxes) if (b.goes && b.goes !== "back" && !b.hidden && (withShared || !b.shared)) out.push({ from: b, key: b.key, to: b.goes });
  for (const it of l.items) if (it.goes && it.goes !== "back" && (withShared || !it.shared)) out.push({ from: it, key: it.key, to: it.goes });
  return out;
}

export { guessIcon };

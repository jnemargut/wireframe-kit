import { isHex } from "../vendor/sketch/tokens";
import { formatIssues, suggest, type Issue, type Result } from "../vendor/sketch/suggest";
import { findUndrawable, undrawableHint } from "../vendor/sketch/glyphs";
import { isCrop } from "../vendor/sketch/crop";
import { layoutScreen, linksOf, typeOf, type Layout } from "./layout";
import { textWidth } from "./text";
import { CHROMES, COMMON, COMPONENTS, DEVICES, ICONS, PINS, propsOf, TYPES, type PropDef } from "./vocab";
import { MARKER_COLORS, SHAPE_COLORS, SHAPE_FILLS, SHAPE_TYPES, SHAPE_WEIGHTS, TEXT_SIZES } from "../vendor/sketch/shapes";
import { resolveNode, type WireframeFile, type WNode } from "./types";

export type { Issue, Result };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const TOP = ["$schema", "title", "device", "start", "shared", "screens", "layout", "canvas"];
const SCREEN = ["title", "url", "locked", "dir", "gap", "pad", "align", "scroll", "statusbar", "device", "chrome", "versionOf", "note", "children", "shapes", "markup"];
const SHAPE_KEYS = ["id", "type", "points", "fill", "text", "color", "weight", "size", "rotate", "locked", "group"];
const ITEM = ["text", "title", "subtitle", "meta", "icon", "image", "goes", "state", "badge", "shortcut", "checked", "danger", "divider", "open", "children", "label", "value"];
const ITEM_STATES = ["normal", "hover", "selected", "disabled"];

export function validate(input: unknown): Result {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (path: string, message: string, hint?: string) => errors.push({ path, message, hint });
  const warn = (path: string, message: string, hint?: string) => warnings.push({ path, message, hint });
  const unknownKey = (path: string, key: string, known: readonly string[], what: string) => {
    const s = suggest(key, known);
    err(`${path}.${key}`, `isn't something ${what} has.`, s ? `Did you mean "${s}"?` : `It can have: ${known.filter((k) => k !== "type").join(", ")}`);
  };

  if (!isObj(input)) { err("$", "A wireframe file is a JSON object with \"title\" and \"screens\"."); return { ok: false, errors, warnings }; }
  const f = input as Obj;
  for (const k of Object.keys(f)) if (!TOP.includes(k)) unknownKey("$", k, TOP, "a wireframe file");
  if (typeof f.title !== "string" || !f.title) err("$.title", "is required: a short name for the flow.");
  const deviceOk = (path: string, d: unknown) => {
    if (d === undefined) return;
    if (typeof d === "string") { if (!(d in DEVICES)) { const s = suggest(d, Object.keys(DEVICES)); err(path, `"${d}" isn't a device.`, s ? `Did you mean "${s}"?` : `Use ${Object.keys(DEVICES).join(", ")}, or { "w": 375, "h": 667 }.`); } }
    else if (!isObj(d) || typeof d.w !== "number" || typeof d.h !== "number") err(path, "must be a device name or { \"w\": number, \"h\": number }.");
  };
  deviceOk("$.device", f.device);
  if (!isObj(f.screens) || !Object.keys(f.screens).length) {
    err("$.screens", "needs at least one screen: { \"home\": { \"children\": [ … ] } }.");
    return { ok: false, errors, warnings };
  }
  const screens = f.screens as Record<string, Obj>;
  const ids = Object.keys(screens);
  if (f.start !== undefined && (typeof f.start !== "string" || !screens[f.start])) {
    const s = typeof f.start === "string" ? suggest(f.start, ids) : undefined;
    err("$.start", `"${String(f.start)}" isn't a screen in this file.`, s ? `Did you mean "${s}"?` : `Screens: ${ids.join(", ")}`);
  }
  const shared = isObj(f.shared) ? (f.shared as Record<string, WNode>) : {};
  if (f.shared !== undefined && !isObj(f.shared)) err("$.shared", "must be an object of named pieces, e.g. { \"tabs\": { \"type\": \"tabbar\", … } }.");

  const goesOk = (path: string, g: unknown) => {
    if (g === undefined) return;
    if (typeof g !== "string") { err(path, "must be a screen id (a string)."); return; }
    if (g === "back" || screens[g]) return;
    const s = suggest(g, ids);
    err(path, `goes to "${g}", which isn't a screen in this file.`, s ? `Did you mean "${s}"?` : `Screens: ${ids.join(", ")}. Add a "${g}" screen, or use "back".`);
  };

  const checkProp = (path: string, key: string, v: unknown, d: PropDef, type: string) => {
    const t = d.type;
    switch (t.kind) {
      case "text": if (typeof v !== "string" && typeof v !== "number") err(path, "must be text."); break;
      case "number": if (typeof v !== "number") err(path, "must be a number.");
        else if ((t.min !== undefined && v < t.min) || (t.max !== undefined && v > t.max)) err(path, `must be between ${t.min ?? "-∞"} and ${t.max ?? "∞"}.`); break;
      case "bool": if (typeof v !== "boolean") err(path, "must be true or false."); break;
      case "enum": if (typeof v !== "string" || !t.values.includes(v)) { const s = typeof v === "string" ? suggest(v, t.values) : undefined; err(path, `"${String(v)}" isn't an option.`, s ? `Did you mean "${s}"?` : `Use one of: ${t.values.join(", ")}`); } break;
      case "icon": if (typeof v !== "string" || !(ICONS as readonly string[]).includes(v)) { const s = typeof v === "string" ? suggest(v, ICONS) : undefined; err(path, `"${String(v)}" isn't an icon.`, s ? `Did you mean "${s}"?` : "Run `wf vocab icons` for the list."); } break;
      case "screen": goesOk(path, v); break;
      case "strings":
        if (key === "active" && typeof v === "string") break;
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string" && typeof x !== "number")) err(path, "must be a list of text, e.g. [\"One\", \"Two\"].");
        break;
      case "rows": if (!Array.isArray(v) || v.some((r) => !Array.isArray(r))) err(path, "must be a list of rows, each a list of cells: [[\"#214\", \"$5.25\"]]."); break;
      case "items":
        if (!Array.isArray(v)) { err(path, "must be a list: [\"Home\", \"Search\"] or [{ \"text\": \"Home\", \"goes\": \"home\" }]."); break; }
        v.forEach((it, i) => {
          if (typeof it === "string" || typeof it === "number") return;
          if (!isObj(it)) { err(`${path}[${i}]`, "must be text or an object."); return; }
          for (const k of Object.keys(it)) if (!ITEM.includes(k)) unknownKey(`${path}[${i}]`, k, ITEM, "an item");
          goesOk(`${path}[${i}].goes`, it.goes);
          if (it.state !== undefined && !ITEM_STATES.includes(String(it.state))) err(`${path}[${i}].state`, `An item's state is one of ${ITEM_STATES.join(", ")}.`);
          if (it.children !== undefined && !Array.isArray(it.children)) err(`${path}[${i}].children`, "must be a list of items (a tree's sub-items).");
          if (it.icon !== undefined && !(ICONS as readonly string[]).includes(String(it.icon))) { const s = suggest(String(it.icon), ICONS); err(`${path}[${i}].icon`, `"${String(it.icon)}" isn't an icon.`, s ? `Did you mean "${s}"?` : "Run `wf vocab icons`."); }
        });
        if (type === "navbar") v.forEach((it, i) => { const name = typeof it === "string" ? it : isObj(it) ? it.icon : undefined; if (name !== undefined && !(ICONS as readonly string[]).includes(String(name))) { const s = suggest(String(name), ICONS); err(`${path}[${i}]`, `"${String(name)}" isn't an icon.`, s ? `Did you mean "${s}"?` : "Navbar actions are icon names."); } });
        break;
      case "crop": if (!isCrop(v)) err(path, "must be [left, top, right, bottom], fractions from 0 to 1.", "e.g. [0, 0.1, 1, 0.6]"); break;
      case "point": if (!Array.isArray(v) || v.length !== 2 || v.some((x) => typeof x !== "number")) err(path, "must be [x, y] in screen px, e.g. [24, 300]."); break;
      case "children": break;
    }
  };

  const seenIds = new Map<string, Set<string>>();
  const checkNode = (path: string, raw: unknown, screen: string, topLevel = false) => {
    if (!isObj(raw)) { err(path, "must be an object like { \"type\": \"button\", \"text\": \"Pay\" }."); return; }
    const n = raw as WNode;
    if (n.use !== undefined) {
      if (typeof n.use !== "string" || !shared[n.use]) { const s = typeof n.use === "string" ? suggest(n.use, Object.keys(shared)) : undefined; err(`${path}.use`, `"${String(n.use)}" isn't in this file's "shared" pieces.`, s ? `Did you mean "${s}"?` : Object.keys(shared).length ? `Shared pieces: ${Object.keys(shared).join(", ")}` : "Define it under \"shared\" first."); return; }
    } else if (typeof n.type !== "string") { err(path, "needs a \"type\" (or \"use\" for a shared piece).", "Run `wf vocab` to see the components."); return; }
    else if (!COMPONENTS[n.type]) { const s = suggest(n.type, TYPES); err(`${path}.type`, `"${n.type}" isn't a component.`, s ? `Did you mean "${s}"? Or use { "type": "sketch", "label": "${n.type}" } for something the catalog doesn't have.` : `Use { "type": "sketch", "label": "${n.type}" } for things the catalog doesn't have, or run \`wf vocab\`.`); return; }
    const res = n.use ? resolveNode(input as unknown as WireframeFile, n) : n;
    const type = typeOf(res);
    const known = propsOf(type);
    for (const [k, v] of Object.entries(n)) {
      if (k === "type" || k === "use") continue;
      if (k === "children" && !COMPONENTS[type].container) { err(`${path}.children`, `a ${type} can't hold other things.`, "Wrap them together in a \"card\", \"stack\" or \"row\" instead."); continue; }
      const d = known[k];
      if (!d) { unknownKey(path, k, Object.keys(known), `a ${type}`); continue; }
      if (k === "width") { if (!(v === "fill" || v === "hug" || (typeof v === "number" && v > 0))) err(`${path}.width`, "must be \"fill\", \"hug\", or a number of px."); continue; }
      if (k === "id") {
        if (typeof v !== "string" || !v) { err(`${path}.id`, "must be text."); continue; }
        const set = seenIds.get(screen) ?? new Set();
        if (set.has(v)) err(`${path}.id`, `"${v}" is used twice on this screen.`, "Ids name one element each.");
        set.add(v); seenIds.set(screen, set);
        continue;
      }
      if (k === "children") {
        if (!COMPONENTS[type].container) { err(`${path}.children`, `a ${type} can't hold other things.`, "Wrap them together in a \"card\", \"stack\" or \"row\" instead."); continue; }
        if (!Array.isArray(v)) { err(`${path}.children`, "must be a list."); continue; }
        v.forEach((c, i) => checkNode(`${path}.children[${i}]`, c, screen));
        continue;
      }
      if (k === "at" && !topLevel) warn(`${path}.at`, "Free placement only works for things directly on a screen, so it's ignored here.", "Move it to the screen's children, or drop \"at\".");
      checkProp(`${path}.${k}`, k, v, d, type);
    }
    if (COMPONENTS[type].container && !Array.isArray(res.children) && type !== "sheet" && type !== "dialog") warn(path, `This ${type} is empty.`, "Give it \"children\".");
  };

  for (const [k, v] of Object.entries(shared)) checkNode(`$.shared.${k}`, v, `shared:${k}`);

  for (const id of ids) {
    const sp = `$.screens.${id}`;
    const sc = screens[id];
    if (/[#/\s]/.test(id)) err(sp, `Screen ids can't contain spaces, "#" or "/" ("${id}").`, "Use something like \"order-status\". Storyboards point at screens with file#id.");
    if (!isObj(sc)) { err(sp, "must be an object with \"children\"."); continue; }
    for (const k of Object.keys(sc)) if (!SCREEN.includes(k)) unknownKey(sp, k, SCREEN, "a screen");
    deviceOk(`${sp}.device`, sc.device);
    if (sc.versionOf !== undefined && (typeof sc.versionOf !== "string" || !screens[sc.versionOf])) { const sg = typeof sc.versionOf === "string" ? suggest(sc.versionOf, ids) : undefined; err(`${sp}.versionOf`, `"${String(sc.versionOf)}" isn't a screen in this file.`, sg ? `Did you mean "${sg}"?` : `Screens: ${ids.join(", ")}`); }
    if (sc.dir !== undefined && sc.dir !== "down" && sc.dir !== "right") err(`${sp}.dir`, "must be \"down\" or \"right\".");
    if (!Array.isArray(sc.children)) { err(`${sp}.children`, "is required: the list of what's on the screen."); continue; }
    sc.children.forEach((c, i) => checkNode(`${sp}.children[${i}]`, c, id, true));
    if (sc.chrome !== undefined && !(CHROMES as readonly string[]).includes(String(sc.chrome))) { const sg = suggest(String(sc.chrome), CHROMES); err(`${sp}.chrome`, `"${String(sc.chrome)}" isn't a device body.`, sg ? `Did you mean "${sg}"?` : `Use one of: ${CHROMES.join(", ")}`); }
    for (const [key, list] of [["shapes", sc.shapes], ["markup", sc.markup]] as const) {
      if (list === undefined) continue;
      if (!Array.isArray(list)) { err(`${sp}.${key}`, "must be a list."); continue; }
      list.forEach((sh, i) => {
        const q = `${sp}.${key}[${i}]`;
        if (!isObj(sh) || !Array.isArray(sh.points) || !sh.points.length || sh.points.some((pt: unknown) => !Array.isArray(pt) || pt.length !== 2 || pt.some((x) => typeof x !== "number"))) { err(q, "needs \"points\": [[x, y], …]."); return; }
        if (key === "shapes") {
          for (const k of Object.keys(sh)) if (!SHAPE_KEYS.includes(k)) unknownKey(q, k, SHAPE_KEYS, "a shape");
          if (!(SHAPE_TYPES as readonly string[]).includes(String(sh.type))) { const sg = suggest(String(sh.type), SHAPE_TYPES); err(`${q}.type`, `"${String(sh.type)}" isn't a shape.`, sg ? `Did you mean "${sg}"?` : `Use one of: ${SHAPE_TYPES.join(", ")}`); }
        }
        const colors: readonly string[] = key === "shapes" ? SHAPE_COLORS : MARKER_COLORS;
        if (sh.color !== undefined && !colors.includes(String(sh.color)) && !isHex(sh.color)) err(`${q}.color`, `"${String(sh.color)}" isn't a marker color.`, `Use one of: ${colors.join(", ")}, or any hex like "#e8b04b".`);
        if (sh.fill !== undefined && !(SHAPE_FILLS as readonly string[]).includes(String(sh.fill))) err(`${q}.fill`, `"${String(sh.fill)}" isn't a fill.`, `Use one of: ${SHAPE_FILLS.join(", ")}`);
        if (sh.weight !== undefined && !(SHAPE_WEIGHTS as readonly string[]).includes(String(sh.weight))) err(`${q}.weight`, `"${String(sh.weight)}" isn't a line weight.`, `Use one of: ${SHAPE_WEIGHTS.join(", ")}`);
        if (sh.size !== undefined && !(TEXT_SIZES as readonly string[]).includes(String(sh.size))) err(`${q}.size`, `"${String(sh.size)}" isn't a text size.`, `Use one of: ${TEXT_SIZES.join(", ")}`);
      });
    }
  }
  for (const [k, v] of Object.entries(isObj(f.layout) ? f.layout : {})) if (!screens[k]) warn(`$.layout.${k}`, `Nudges for a screen that doesn't exist ("${k}").`);

  // storytelling and layout nudges (only once the structure is sound)
  if (!errors.length) {
    const file = input as unknown as WireframeFile;
    const layouts: Record<string, Layout> = {};
    for (const id of ids) try { layouts[id] = layoutScreen(file, id); } catch (e) { err(`$.screens.${id}`, `couldn't be laid out: ${(e as Error).message}`); }
    const linked = new Set<string>();
    for (const l of Object.values(layouts)) for (const ln of linksOf(l, true)) linked.add(ln.to);
    const start = file.start ?? ids[0];
    for (const [id, l] of Object.entries(layouts)) {
      const sp = `$.screens.${id}`;
      if (ids.length > 1 && id !== start && !linked.has(id) && !file.screens[id].versionOf) warn(sp, `Nothing links to "${id}" yet.`, `Give a button or list item "goes": "${id}" so the flow can reach it.`);
      if (l.overflow > 8) warn(sp, `Content runs ${l.overflow}px past the bottom of the screen.`, "Trim it, or set \"scroll\": true if it's a long page.");
      const leaves = l.boxes.filter((b) => !b.hidden && !COMPONENTS[b.type]?.container && b.type !== "spacer");
      const primaries = leaves.filter((b) => b.type === "button" && b.node.variant === "primary");
      if (primaries.length > 1) warn(sp, `${primaries.length} primary buttons compete on this screen.`, "Keep one main action primary; make the others \"secondary\" or \"outline\".");
      const area = l.w * (l.h - l.insets.top - l.insets.bottom);
      const sketchArea = leaves.filter((b) => b.type === "sketch").reduce((a, b) => a + b.w * b.h, 0);
      if (sketchArea > area / 3) warn(sp, "Over a third of this screen is sketch boxes.", "Use real components where you can (`wf vocab`); keep sketch boxes for the truly custom bits.");
      for (const b of leaves.filter((x) => x.type === "button" && x.node.variant !== "text")) {
        const size = b.node.size === "sm" ? 15 : b.node.size === "lg" ? 19 : 18;
        if (textWidth(String(b.node.text ?? ""), "hand", size) > b.w - (b.node.icon ? 46 : 16)) warn(`${sp} (${b.key})`, `The button "${b.node.text}" is cut off.`, "Shorten the words or let the button fill the width.");
      }
      // pinned things sitting on top of content
      for (const p of l.boxes.filter((b) => b.pinned && !b.free && !b.scrim && !b.hidden && !COMPONENTS[b.type]?.bleed)) {
        const hit = leaves.find((b) => b.plane === 0 && b.x < p.x + p.w - 4 && b.x + b.w > p.x + 4 && b.y < p.y + p.h - 4 && b.y + b.h > p.y + 4);
        if (hit) warn(`${sp} (${p.key})`, `The pinned ${p.type} covers a ${hit.type}${hit.node.text ? ` ("${hit.node.text}")` : ""}.`, "Move it, add a spacer at the end of the screen, or pin it somewhere else.");
      }
      for (const nid of Object.keys(file.layout?.[id] ?? {})) if (!l.boxes.some((b) => b.id === nid)) warn(`$.layout.${id}.${nid}`, `Nudge for "${nid}", but nothing on the screen has that id.`);
    }
  }
  for (const u of findUndrawable(f)) { const h = undrawableHint(u.chars); warn(u.path, h.message, h.hint); }
  return { ok: errors.length === 0, errors, warnings };
}

export function formatResult(r: Result, file: string, doc?: WireframeFile): string {
  let summary: string | undefined;
  if (doc && r.ok) {
    const n = Object.keys(doc.screens).length;
    let links = 0;
    for (const id of Object.keys(doc.screens)) links += linksOf(layoutScreen(doc, id), true).length;
    summary = `${n} screen${n === 1 ? "" : "s"}, ${links} link${links === 1 ? "" : "s"}`;
  }
  return formatIssues(r, file, summary);
}

export const KNOWN = { TOP, SCREEN, ITEM, COMMON: Object.keys(COMMON), PINS };

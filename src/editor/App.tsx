import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CropDialog } from "../../vendor/sketch/crop-dialog";
import type { Result } from "../../vendor/sketch/suggest";
import { arrows as arrowsOf, bounds, laneSpace, layoutAll, positions } from "../render/flow";
import { startScreen, type Item, type WireframeFile, type WNode } from "../types";
import { validate } from "../validate";
import { shapeBox, type MarkupStroke, type SketchShape } from "../../vendor/sketch/shapes";
import { isFree, typeOf } from "../layout";
import { deviceSize, resolveNode } from "../types";
import { COMPONENTS } from "../vocab";
import { api, bakedUrl } from "./api";
import { Canvas, selRectOf, type InlineEdit, type Rect, type Tool, type View } from "./Canvas";
import { TOOL_KEYS, Tools } from "../../vendor/sketch/tools";
import { Inspector, type InspectorActions } from "./Inspector";
import * as M from "./model";
import { Palette } from "./Palette";
import { Play } from "./Play";

const CLIP = "wireframe-kit/node";
const SHAPE_CLIP = "wireframe-kit/shape";

export function App() {
  const [doc, setDoc] = useState<WireframeFile | null>(null);
  const [draft, setDraft] = useState<WireframeFile | null>(null);
  const [result, setResult] = useState<Result>();
  const [file, setFile] = useState("");
  const [bust, setBust] = useState(0);
  const [sel, setSelOnly] = useState<M.Sel>(null);
  /** Also selected (Shift+click): more screens, or more free elements and drawings on the same screen. */
  const [extra, setExtra] = useState<{ screen: string; key: string }[]>([]);
  const [styleClip, setStyleClip] = useState<{ kind: string; props: Record<string, unknown> } | null>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 0.5 });
  const [dragging, setDragging] = useState(false);
  const [play, setPlay] = useState<string | null>(null);
  // the properties panel can be put away for more canvas; remembered per browser
  const [props, setPropsRaw] = useState(() => { try { return localStorage.getItem("props-panel") !== "hidden"; } catch { return true; } });
  const setProps = (on: boolean) => { setPropsRaw(on); try { localStorage.setItem("props-panel", on ? "shown" : "hidden"); } catch { /* private window: fine */ } };
  const [palette, setPalette] = useState(true);
  const [focusText, setFocusText] = useState(0);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("ink");
  /** Line thickness for new drawings. */
  const [weight, setWeight] = useState("normal");
  const [editing, setEditing] = useState<InlineEdit | null>(null);
  const [cropping, setCropping] = useState<(string | number)[] | null>(null);
  const undo = useRef<WireframeFile[]>([]);
  const redo = useRef<WireframeFile[]>([]);
  const lastCo = useRef<string | undefined>(undefined);
  const saveT = useRef<number | undefined>(undefined);
  const latest = useRef<WireframeFile | null>(null);
  const canvasEl = useRef<HTMLDivElement>(null);
  const lastScreen = useRef<string>("");

  const shown = draft ?? doc;
  const layouts = useMemo(() => (shown ? layoutAll(shown) : {}), [shown]);
  const pos = useMemo(() => (shown ? positions(shown, layouts) : {}), [shown, layouts]);
  const arr = useMemo(() => (shown ? arrowsOf(shown, layouts, pos) : []), [shown, layouts, pos]);
  const asset = useMemo(() => bakedUrl(bust), [bust]);

  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(""), 1800); };

  const fit = useCallback((d = doc) => {
    if (!d || !canvasEl.current) return;
    const ls = layoutAll(d), ps = positions(d, ls);
    const b = bounds(d, ls, ps, laneSpace(arrowsOf(d, ls, ps)));
    const r = canvasEl.current.getBoundingClientRect();
    const k = Math.min(1, (r.width - 80) / b.w, (r.height - 80) / (b.h + 60));
    setView({ k, x: (r.width - b.w * k) / 2 - b.x * k, y: (r.height - b.h * k) / 2 - (b.y - 30) * k });
  }, [doc]);

  // load, then follow the agent's edits live
  useEffect(() => {
    let first = true;
    const load = () => api.load().then((r) => {
      setDoc(r.doc); latest.current = r.doc; setResult(r.result); setFile(r.file ?? ""); setBust((b) => b + 1); setError("");
      if (first) { first = false; document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => fit(r.doc)))); }
    }).catch((e) => setError(String(e.message ?? e)));
    load();
    const es = new EventSource("/api/events");
    es.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.type === "change" && msg.source === "file") load();
      if (msg.type === "invalid") setError(msg.message);
    };
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (d: WireframeFile, now = false) => {
    latest.current = d;
    setStatus("saving");
    window.clearTimeout(saveT.current);
    const go = () => api.put(latest.current!).then((r) => { setResult(r.result); setStatus("saved"); }).catch(() => setStatus("error"));
    if (now) go(); else saveT.current = window.setTimeout(go, 250);
  };

  /** Every change goes through here: undo history (typing coalesces), validation, save. */
  const edit = (nextRaw: WireframeFile, coalesce?: string) => {
    if (!doc) return;
    const next = M.keepClear(doc, nextRaw, (d, id) => deviceSize(d, d.screens[id]).w);
    if (coalesce === undefined || coalesce !== lastCo.current) { undo.current.push(doc); if (undo.current.length > 200) undo.current.shift(); redo.current = []; }
    lastCo.current = coalesce;
    setDoc(next);
    setResult(validate(next));
    save(next);
  };
  const step = (from: React.MutableRefObject<WireframeFile[]>, to: React.MutableRefObject<WireframeFile[]>) => {
    const prev = from.current.pop();
    if (!prev || !doc) return;
    to.current.push(doc);
    lastCo.current = undefined;
    setDoc(prev); setResult(validate(prev)); save(prev, true);
    if (sel && !prev.screens[sel.screen]) setSel(null);
  };

  const selPath = () => (sel && doc ? (sel.key.includes("#") ? layouts[sel.screen]?.items.find((it) => it.key === sel.key)?.path : M.pathOf(sel.screen, sel.key)) : undefined);
  const focusedScreen = () => sel?.screen ?? (lastScreen.current && doc?.screens[lastScreen.current] ? lastScreen.current : doc ? startScreen(doc) : "");

  const insertNode = (node: unknown) => {
    if (!doc) return;
    const t = M.insertTarget(doc, sel, focusedScreen());
    const r = M.insertAt(doc, t.list, t.index, M.freshCopy(doc, node));
    edit(r.doc);
    setSel({ screen: t.screen, key: M.keyOf(r.path) });
  };

  /** Selecting one thing in a group picks up the whole group. */
  function setSel(next: M.Sel | ((cur: M.Sel) => M.Sel)) {
    setSelOnly((cur) => {
      const n = typeof next === "function" ? (next as (c: M.Sel) => M.Sel)(cur) : next;
      setExtra(n && doc ? M.groupMates(doc, n) : []);
      return n;
    });
  }
  const allSel = (): { screen: string; key: string }[] => (sel ? [sel, ...extra] : []);
  const onToggle = (c: { screen: string; key: string }) => {
    if (!sel) return setSel(c);
    const same = (x: { screen: string; key: string }) => x.screen === c.screen && x.key === c.key;
    if (same(sel)) { const [first, ...rest] = extra; setSelOnly(first ?? null); setExtra(rest); return; }
    if (extra.some(same)) { setExtra(extra.filter((x) => !same(x))); return; }
    // screens go with screens; elements with elements on the same screen
    const ok = (!sel.key && !c.key) || (!!sel.key && !!c.key && sel.screen === c.screen);
    if (!ok) return setSel(c);
    setExtra([...extra, c, ...(doc ? M.groupMates(doc, c).filter((m) => !same(m) && !extra.some((x) => x.screen === m.screen && x.key === m.key)) : [])]);
  };
  const isLocked = (x: { screen: string; key: string }, d: WireframeFile | null = doc) => {
    if (!d) return false;
    if (!x.key) return !!d.screens[x.screen]?.locked;
    if (x.key.startsWith("shape:")) return !!d.screens[x.screen]?.shapes?.[Number(x.key.slice(6))]?.locked;
    return !!(M.getAt(d, M.pathOf(x.screen, x.key)) as WNode | undefined)?.locked;
  };
  /** A free element or drawing moved by (dx, dy); things in the stacks get a nudge instead. */
  const moveOne = (d: WireframeFile, screen: string, key: string, dx: number, dy: number): WireframeFile => {
    if (key.startsWith("shape:")) {
      const i = Number(key.slice(6));
      const sh = d.screens[screen]?.shapes?.[i];
      return sh ? M.setAt(d, ["screens", screen, "shapes", i, "points"], sh.points.map(([x, y]) => [x + dx, y + dy])) : d;
    }
    const path = M.pathOf(screen, key);
    const raw = M.getAt(d, path) as WNode;
    if (raw && isFree(raw)) { const [x, y] = raw.at as [number, number]; return M.setAt(d, [...path, "at"], [Math.round(x + dx), Math.round(y + dy)]); }
    const { doc: withId, id } = M.ensureId(d, screen, path);
    const cur = d.layout?.[screen]?.[id] ?? {};
    const nx = (cur.dx ?? 0) + dx, ny = (cur.dy ?? 0) + dy;
    const clean = Object.fromEntries(Object.entries({ ...cur, dx: nx || undefined, dy: ny || undefined }).filter(([, v]) => v !== undefined));
    return M.setAt(withId, ["layout", screen, id], Object.keys(clean).length ? clean : undefined);
  };
  /** Where a selected thing sits on the canvas (screens) or on its screen (elements, drawings). */
  const rectFor = (x: { screen: string; key: string }): { x: number; y: number; w: number; h: number } | undefined => {
    const l = layouts[x.screen];
    if (!l) return undefined;
    if (!x.key) return { x: pos[x.screen][0], y: pos[x.screen][1], w: l.w, h: l.h };
    return doc ? selRectOf(doc, l, x.key) : undefined;
  };
  const shift = (d: WireframeFile, moves: { x: { screen: string; key: string }; dx: number; dy: number }[]): WireframeFile => {
    let n = d;
    const canvas: Record<string, [number, number]> = { ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, [v[0], v[1]] as [number, number]])), ...(d.canvas ?? {}) };
    let screens = false;
    for (const { x, dx, dy } of moves) {
      if (isLocked(x, n) || (!dx && !dy)) continue;
      if (!x.key) { canvas[x.screen] = [Math.round(canvas[x.screen][0] + dx), Math.round(canvas[x.screen][1] + dy)]; screens = true; }
      else n = moveOne(n, x.screen, x.key, Math.round(dx), Math.round(dy));
    }
    return screens ? { ...n, canvas } : n;
  };

  const a: InspectorActions = {
    align: (how) => {
      if (!doc) return;
      const items = allSel().filter((x) => !isLocked(x)).map((x) => ({ x, r: rectFor(x) })).filter((v): v is { x: { screen: string; key: string }; r: { x: number; y: number; w: number; h: number } } => !!v.r);
      if (items.length < 2) return;
      const L0 = Math.min(...items.map((v) => v.r.x)), R0 = Math.max(...items.map((v) => v.r.x + v.r.w));
      const T0 = Math.min(...items.map((v) => v.r.y)), B0 = Math.max(...items.map((v) => v.r.y + v.r.h));
      edit(shift(doc, items.map(({ x, r }) => ({ x,
        dx: how === "left" ? L0 - r.x : how === "right" ? R0 - r.x - r.w : how === "center" ? (L0 + R0) / 2 - r.x - r.w / 2 : 0,
        dy: how === "top" ? T0 - r.y : how === "bottom" ? B0 - r.y - r.h : how === "middle" ? (T0 + B0) / 2 - r.y - r.h / 2 : 0 }))));
    },
    distribute: (axis) => {
      if (!doc) return;
      const items = allSel().filter((x) => !isLocked(x)).map((x) => ({ x, r: rectFor(x) })).filter((v): v is { x: { screen: string; key: string }; r: { x: number; y: number; w: number; h: number } } => !!v.r);
      if (items.length < 3) return;
      const P = (r: { x: number; y: number }) => (axis === "across" ? r.x : r.y), S = (r: { w: number; h: number }) => (axis === "across" ? r.w : r.h);
      items.sort((p1, q) => P(p1.r) - P(q.r));
      const span = P(items[items.length - 1].r) + S(items[items.length - 1].r) - P(items[0].r), total = items.reduce((t, v) => t + S(v.r), 0);
      const gap = (span - total) / (items.length - 1);
      let at = P(items[0].r);
      edit(shift(doc, items.map(({ x, r }) => { const m = { x, dx: axis === "across" ? at - r.x : 0, dy: axis === "down" ? at - r.y : 0 }; at += S(r) + gap; return m; })));
    },
    group: () => {
      if (!doc) return;
      const items = allSel().filter((x) => x.key);
      if (items.length < 2) return;
      const used = new Set<string>();
      for (const sc of Object.values(doc.screens)) { for (const sh of sc.shapes ?? []) if (sh.group) used.add(sh.group); }
      let n = 1; while (used.has(`g${n}`) || JSON.stringify(doc).includes(`"group":"g${n}"`)) n++;
      let d = doc;
      for (const x of items) d = M.setAt(d, [...M.propPathOf(x), "group"], `g${n}`);
      edit(d); flash("Grouped. Click any of them to pick up the lot. Shift+Cmd+G ungroups.");
    },
    ungroup: () => {
      if (!doc) return;
      let d = doc;
      for (const x of allSel()) if (x.key) d = M.setAt(d, [...M.propPathOf(x), "group"], undefined);
      edit(d);
    },
    lock: () => {
      if (!doc) return;
      const items = allSel();
      if (!items.length) return;
      const on = !items.every((x) => isLocked(x));
      let d = doc;
      for (const x of items) d = M.setAt(d, [...M.propPathOf(x), "locked"], on ? true : undefined);
      edit(d); flash(on ? "Locked: it stays put. Shift+Cmd+L unlocks." : "Unlocked.");
    },
    copyStyle: () => {
      if (!doc || !sel?.key) return;
      const o = M.getAt(doc, M.propPathOf(sel)) as Record<string, unknown> | undefined;
      if (!o) return;
      const kind = sel.key.startsWith("shape:") ? "shape" : String(o.type ?? "");
      const keys = kind === "shape" ? ["color", "weight", "fill", "size"] : M.STYLE_KEYS.filter((k) => k in (COMPONENTS[kind]?.props ?? {}));
      setStyleClip({ kind, props: Object.fromEntries(keys.map((k) => [k, o[k]])) });
      flash("Style copied. Select something like it and Option+Cmd+V (or Paste style).");
    },
    pasteStyle: () => {
      if (!doc || !styleClip) return;
      let d = doc, n = 0;
      for (const x of allSel()) {
        if (!x.key) continue;
        const o = M.getAt(d, M.propPathOf(x)) as Record<string, unknown> | undefined;
        const kind = x.key.startsWith("shape:") ? "shape" : String(o?.type ?? "");
        if (kind !== styleClip.kind) continue;
        for (const [k, v] of Object.entries(styleClip.props)) d = M.setAt(d, [...M.propPathOf(x), k], v);
        n++;
      }
      if (!n) return flash(`That style is from a ${styleClip.kind === "shape" ? "drawing" : styleClip.kind}: select one of those.`);
      edit(d);
    },
    canPasteStyle: !!styleClip,
    extraCount: extra.length,
    edit,
    setProp: (path, prop, value, co) => doc && edit(M.setProp(doc, path, prop, value), co),
    select: setSel,
    remove: () => {
      if (!doc || !sel) return;
      if (!sel.key) { a.deleteScreen(); return; }
      if (sel.key.startsWith("shape:")) {
        const shapes = (doc.screens[sel.screen].shapes ?? []).filter((_, i) => i !== Number(sel.key.slice(6)));
        edit(M.setAt(doc, ["screens", sel.screen, "shapes"], shapes.length ? shapes : undefined));
        setSel({ screen: sel.screen, key: "" });
        return;
      }
      if (sel.key.includes("#")) {
        const p = selPath(); if (!p) return;
        edit(M.setAt(doc, p, undefined));
        setSel({ screen: sel.screen, key: sel.key.split("#")[0] });
        return;
      }
      edit(M.remove(doc, sel.screen, M.pathOf(sel.screen, sel.key)));
      const parts = sel.key.split("/");
      setSel({ screen: sel.screen, key: parts.length > 2 ? parts.slice(0, -2).join("/") : "" });
    },
    crop: (path) => setCropping(path),
    arrange: (to) => {
      if (!doc || !sel?.key || sel.key.includes("#")) return;
      // drawings: their order in the screen's shapes; elements: their order among their siblings
      const isShape = sel.key.startsWith("shape:");
      const listPath = isShape ? ["screens", sel.screen, "shapes"] : M.parentOf(M.pathOf(sel.screen, sel.key))?.list;
      const index = isShape ? Number(sel.key.slice(6)) : M.parentOf(M.pathOf(sel.screen, sel.key))?.index;
      const list = listPath ? (M.getAt(doc, listPath) as unknown[] | undefined) : undefined;
      if (!list || index === undefined) return;
      const target = to === "front" ? list.length - 1 : to === "back" ? 0 : to === "forward" ? Math.min(list.length - 1, index + 1) : Math.max(0, index - 1);
      if (target === index) return;
      const next = [...list];
      const [it] = next.splice(index, 1);
      next.splice(target, 0, it);
      edit(M.setAt(doc, listPath!, next));
      setSel({ screen: sel.screen, key: isShape ? `shape:${target}` : M.keyOf([...listPath!, target]) });
    },
    move: (delta) => {
      if (!doc || !sel?.key || sel.key.includes("#") || sel.key.startsWith("shape:")) return;
      const r = M.move(doc, M.pathOf(sel.screen, sel.key), delta);
      if (r.doc !== doc) { edit(r.doc); setSel({ screen: sel.screen, key: M.keyOf(r.path) }); }
    },
    duplicate: () => {
      if (sel?.key.startsWith("shape:") && doc) {
        const shapes = doc.screens[sel.screen].shapes ?? [];
        const sh = shapes[Number(sel.key.slice(6))];
        if (!sh) return;
        edit(M.setAt(doc, ["screens", sel.screen, "shapes"], [...shapes, { ...sh, points: sh.points.map(([x, y]) => [x + 16, y + 16]) }]));
        setSel({ screen: sel.screen, key: `shape:${shapes.length}` });
        return;
      }
      if (!doc || !sel?.key || sel.key.includes("#")) { if (sel && !sel.key) a.duplicateScreen(); return; }
      const path = M.pathOf(sel.screen, sel.key);
      const p = M.parentOf(path); if (!p) return;
      const r = M.insertAt(doc, p.list, p.index + 1, M.freshCopy(doc, M.getAt(doc, path)));
      edit(r.doc); setSel({ screen: sel.screen, key: M.keyOf(r.path) });
    },
    resetNudge: () => {
      if (!doc || !sel?.key) return;
      const n = M.getAt(doc, M.pathOf(sel.screen, sel.key.split("#")[0])) as WNode;
      if (typeof n?.id === "string") {
        let d = M.setAt(doc, ["layout", sel.screen, n.id], undefined);
        if (!Object.keys(d.layout?.[sel.screen] ?? {}).length) d = M.setAt(d, ["layout", sel.screen], undefined);
        if (!Object.keys(d.layout ?? {}).length) d = M.setAt(d, ["layout"], undefined);
        edit(d);
      }
    },
    copyPointer: () => {
      if (!doc || !sel) return;
      navigator.clipboard.writeText(M.pointer(file, doc, sel.screen, sel.key.split("#")[0])).then(() => flash("Pointer copied. Paste it to your agent with what to change."), () => flash("Couldn't reach the clipboard."));
    },
    renameScreen: (from, to) => { if (!doc) return; const d = M.renameScreen(doc, from, to); if (d !== doc) { edit(d); setSel({ screen: to, key: "" }); } else flash(`"${to}" is taken.`); },
    addScreen: () => { if (!doc) return; const r = M.addScreen(doc, sel?.screen); edit(r.doc); setSel({ screen: r.id, key: "" }); },
    duplicateScreen: () => { if (!doc || !sel) return; const r = M.duplicateScreen(doc, sel.screen); edit(r.doc); setSel({ screen: r.id, key: "" }); },
    deleteScreen: () => { if (!doc || !sel || Object.keys(doc.screens).length <= 1) return; edit(M.deleteScreen(doc, sel.screen)); setSel(null); },
    copyScreenImage: async () => {
      if (!sel) return;
      try {
        const blob = fetch(`/api/screen.png?id=${encodeURIComponent(sel.screen)}&scale=2`).then((r) => r.blob());
        // a note riding along (where browsers allow it) so Flowchart Kit pastes a live card, not a flat picture
        const note = new Blob([JSON.stringify({ wireframeScreen: 1, file, screen: sel.screen })], { type: "application/x-wireframe-screen" });
        const custom = (ClipboardItem as unknown as { supports?: (t: string) => boolean }).supports?.("web application/x-wireframe-screen");
        await navigator.clipboard.write([new ClipboardItem(custom ? { "image/png": blob, "web application/x-wireframe-screen": note } : { "image/png": blob })]);
        flash("Screen copied as an image. Paste it into Slack, Figma, a doc, or a Flowchart Kit board…");
      } catch { flash("This browser won't copy images. Use Export instead."); }
    },
    play: (screen) => setPlay(screen ?? (doc ? startScreen(doc) : null)),
    setFree: (on) => setFree(on),
    versionAs: (device) => {
      if (!doc || !sel) return;
      const r = M.versionAs(doc, sel.screen, device, (d, id) => {
        if (!d.canvas) return undefined;
        const ps = positions(d, layoutAll(d));
        return ps[id] ? { x: ps[id][0], y: ps[id][1], h: layouts[id]?.h ?? 844 } : undefined;
      });
      // with no saved positions, freeze the current ones so the new version can sit under its original
      let next = r.doc;
      if (!doc.canvas) {
        const ps = positions(doc, layouts);
        const canvas: Record<string, [number, number]> = Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, [v[0], v[1]] as [number, number]]));
        canvas[r.id] = [ps[sel.screen][0], ps[sel.screen][1] + (layouts[sel.screen]?.h ?? 844) + 180];
        next = { ...next, canvas };
      }
      edit(next);
      setSel({ screen: r.id, key: "" });
      flash(`Made a ${device} version. Ask your agent to adapt its layout for ${device}.`);
    },
    startEdit: () => sel && startEdit(sel.screen, sel.key),
    focusScreen: (id) => {
      const l = layouts[id], p = pos[id], el = canvasEl.current;
      if (!l || !p || !el) return;
      const r = el.getBoundingClientRect();
      const k = Math.min(1, (r.height - 120) / l.h);
      setView({ k, x: r.width / 2 - (p[0] + l.w / 2) * k, y: r.height / 2 - (p[1] + l.h / 2) * k });
      setSel({ screen: id, key: "" });
    },
  };

  /** Move a drawing, a free element (its `at`), or nudge a layout element. */
  const onMove = (screen: string, key: string, dx: number, dy: number, commit: boolean) => {
    if (!doc) return;
    // several selected: they all move together (locked ones stay put)
    if (extra.length && sel && sel.screen === screen && sel.key === key) {
      const next0 = shift(doc, allSel().filter((x) => x.key).map((x) => ({ x, dx, dy })));
      if (commit) { setDraft(null); if (dx || dy) edit(next0); } else setDraft(next0);
      return;
    }
    if (isLocked({ screen, key })) return;
    let next: WireframeFile;
    if (key.startsWith("shape:")) {
      const i = Number(key.slice(6));
      const sh = doc.screens[screen]?.shapes?.[i];
      if (!sh) return;
      next = M.setAt(doc, ["screens", screen, "shapes", i, "points"], sh.points.map(([x, y]) => [x + dx, y + dy]));
    } else {
      const path = M.pathOf(screen, key);
      const raw = M.getAt(doc, path) as WNode;
      if (raw && isFree(raw)) {
        const [x, y] = raw.at as [number, number];
        next = M.setAt(doc, [...path, "at"], [Math.round(x + dx), Math.round(y + dy)]);
      } else {
        const { doc: withId, id } = M.ensureId(doc, screen, path);
        const cur = doc.layout?.[screen]?.[id] ?? {};
        const nx = (cur.dx ?? 0) + dx, ny = (cur.dy ?? 0) + dy;
        const clean = Object.fromEntries(Object.entries({ ...cur, dx: nx || undefined, dy: ny || undefined }).filter(([, v]) => v !== undefined));
        next = M.setAt(withId, ["layout", screen, id], Object.keys(clean).length ? clean : undefined);
      }
    }
    if (commit) { setDraft(null); if (dx || dy) edit(next); } else setDraft(next);
  };

  /** Resize a screen (custom device size), a drawing (scale its points), a free element (box), or a layout element (width/height). */
  const onResize = (screen: string, key: string, from: Rect, to: Rect, commit: boolean) => {
    if (!doc) return;
    let next: WireframeFile;
    if (!key) next = M.setAt(doc, ["screens", screen, "device"], { w: Math.max(120, to.w), h: Math.max(120, to.h) });
    else if (key.startsWith("shape:")) {
      const i = Number(key.slice(6));
      const sh = doc.screens[screen]?.shapes?.[i];
      if (!sh) return;
      const sx = from.w ? to.w / from.w : 1, sy = from.h ? to.h / from.h : 1;
      next = M.setAt(doc, ["screens", screen, "shapes", i, "points"], sh.points.map(([x, y]) => [Math.round(to.x + (x - from.x) * sx), Math.round(to.y + (y - from.y) * sy)]));
    } else {
      const path = M.pathOf(screen, key);
      const raw = M.getAt(doc, path) as WNode;
      next = M.setAt(doc, [...path, "width"], to.w);
      if (to.h !== from.h || raw?.height !== undefined) next = M.setAt(next, [...path, "height"], to.h);
      if (raw && isFree(raw)) next = M.setAt(next, [...path, "at"], [to.x, to.y]);
    }
    if (commit) { setDraft(null); edit(next); } else setDraft(next);
  };

  /** A new drawing: preview while dragging, keep it on release (tiny accidental ones are dropped). */
  const onDraw = (screen: string, kind: Tool, points: [number, number][], commit: boolean) => {
    if (!doc || kind === "select" || kind === "text") return;
    const shape: SketchShape = { type: kind === "pen" ? "path" : kind, points, ...(color !== "ink" ? { color } : {}), ...(weight !== "normal" ? { weight } : {}) };
    const box = shapeBox(shape);
    const real = kind === "pen" ? points.length > 2 : box.w + box.h > 6;
    const shapes = [...(doc.screens[screen]?.shapes ?? []), shape];
    const next = M.setAt(doc, ["screens", screen, "shapes"], shapes);
    if (!commit) { setDraft(next); return; }
    setDraft(null);
    if (!real) return;
    edit(next);
    setSel({ screen, key: `shape:${shapes.length - 1}` });
  };

  const onTextTool = (screen: string, x: number, y: number) => {
    if (!doc) return;
    const shapes = [...(doc.screens[screen]?.shapes ?? []), { type: "text", points: [[Math.round(x), Math.round(y)]], text: "Text", ...(color !== "ink" ? { color } : {}) } as SketchShape];
    const next = M.setAt(doc, ["screens", screen, "shapes"], shapes);
    edit(next);
    const key = `shape:${shapes.length - 1}`;
    setSel({ screen, key });
    setTool("select");
    window.setTimeout(() => startEdit(screen, key, next), 0);
  };

  /** The words you'd most want to change on a thing. */
  const TEXT_PROP: Record<string, string> = { navbar: "title", sidebar: "title", topnav: "title", section: "title", sheet: "title", dialog: "title", input: "label", select: "label", textarea: "label", slider: "label", progress: "label", spinner: "label", search: "hint", image: "label", sketch: "label", chart: "label", map: "label", video: "label", avatar: "text" };
  const startEdit = (screen: string, key: string, d = doc) => {
    if (!d) return;
    const l = layouts[screen] ?? layoutAll(d)[screen];
    const rect = selRectOf(d, l, key);
    if (!rect) return;
    if (key.startsWith("shape:")) {
      const sh = d.screens[screen]?.shapes?.[Number(key.slice(6))];
      if (!sh || sh.type !== "text") return;
      setEditing({ screen, key, value: sh.text ?? "", rect, size: 22, face: "hand", multiline: true });
      return;
    }
    if (key.includes("#")) {
      const it = l.items.find((x) => x.key === key);
      if (!it) return;
      setEditing({ screen, key, value: it.text, rect, size: 16, face: "hand", multiline: false });
      return;
    }
    const raw = M.getAt(d, M.pathOf(screen, key)) as WNode;
    const n = resolveNode(d, raw);
    const type = typeOf(n);
    const prop = TEXT_PROP[type] ?? "text";
    if (!COMPONENTS[type]?.props[prop]) { setFocusText((k) => k + 1); return; }
    const face = type === "title" || type === "heading" ? "title" : "hand";
    setEditing({ screen, key, value: String(n[prop] ?? ""), rect, size: type === "title" ? 28 : type === "heading" ? 20 : 17, face, multiline: type === "text" || type === "alert" || type === "sketch" });
  };
  const finishEdit = (value: string | null) => {
    const ed = editing;
    setEditing(null);
    if (!ed || value === null || !doc) return;
    if (ed.key.startsWith("shape:")) { edit(M.setAt(doc, ["screens", ed.screen, "shapes", Number(ed.key.slice(6)), "text"], value)); return; }
    if (ed.key.includes("#")) {
      const it = layouts[ed.screen]?.items.find((x) => x.key === ed.key);
      if (!it) return;
      const cur = M.getAt(doc, it.path);
      edit(M.setAt(doc, it.path, typeof cur === "object" && cur ? { ...(cur as object), [("title" in (cur as object)) ? "title" : "text"]: value } : value));
      return;
    }
    const path = M.pathOf(ed.screen, ed.key);
    const n = resolveNode(doc, M.getAt(doc, path) as WNode);
    edit(M.setProp(doc, path, TEXT_PROP[typeOf(n)] ?? "text", value));
  };

  /** Dropped from the palette onto a screen: placed freely, centered where you let go. */
  const onDropNode = (screen: string, x: number, y: number, payload: string) => {
    if (!doc) return;
    let node: WNode;
    try { node = JSON.parse(payload); } catch { return; }
    const sw = layouts[screen]?.w ?? 390;
    const probe = { ...node, at: [0, 0] as [number, number] };
    const w = typeof node.width === "number" ? node.width : node.type === "icon" ? 32 : Math.min(sw - 32, COMPONENTS[String(node.type)]?.defaultWidth === "hug" ? 0 : 280) || undefined;
    if (w) probe.width = w;
    if (node.type === "icon") { probe.width = 32; probe.height = 32; (probe as WNode).size = 32; }
    const tmp = M.setAt(doc, ["screens", screen, "children"], [...(doc.screens[screen].children ?? []), probe]);
    const b = layoutAll(tmp)[screen].boxes.find((bb) => bb.key === `children/${tmp.screens[screen].children.length - 1}`);
    const at: [number, number] = [Math.round(x - (b?.w ?? 0) / 2), Math.round(y - (b?.h ?? 0) / 2)];
    const r = M.insertAt(doc, ["screens", screen, "children"], doc.screens[screen].children.length, M.freshCopy(doc, { ...probe, at }));
    edit(r.doc);
    setSel({ screen, key: M.keyOf(r.path) });
  };

  const onDropFile = async (screen: string | null, x: number, y: number, f: File) => {
    if (!doc) return;
    const { path } = await api.upload(f);
    setBust((b) => b + 1);
    const selNode = sel?.key && !sel.key.includes("#") && !sel.key.startsWith("shape:") ? (M.getAt(doc, M.pathOf(sel.screen, sel.key)) as WNode) : undefined;
    if (selNode?.type === "image") { edit(M.setProp(doc, M.pathOf(sel!.screen, sel!.key), "src", path)); return; }
    if (screen) onDropNode(screen, x, y, JSON.stringify({ type: "image", src: path, aspect: "4:3", width: 220 }));
  };

  /** Take something out of the stacks (placed where it is now), or put it back. */
  const setFree = (on: boolean) => {
    if (!doc || !sel?.key || sel.key.includes("#") || sel.key.startsWith("shape:")) return;
    const path = M.pathOf(sel.screen, sel.key);
    const raw = M.getAt(doc, path) as WNode;
    const box = layouts[sel.screen]?.boxes.find((b) => b.key === sel.key);
    if (!raw || !box) return;
    if (!on) { edit(M.setAt(M.setAt(doc, [...path, "at"], undefined), [...path, "height"], typeof raw.height === "number" && !COMPONENTS[typeOf(raw)]?.container ? raw.height : undefined)); return; }
    const freed = { ...raw, at: [Math.round(box.x), Math.round(box.y)] as [number, number], width: Math.round(box.w) };
    if (path.length === 4) { edit(M.setAt(doc, path, freed)); return; }
    // nested: lift it onto the screen itself
    const d = M.remove(doc, sel.screen, path);
    const r = M.insertAt(d, ["screens", sel.screen, "children"], d.screens[sel.screen].children.length, freed);
    edit(r.doc);
    setSel({ screen: sel.screen, key: M.keyOf(r.path) });
  };

  const onMoveScreen = (screen: string, x: number, y: number, commit: boolean) => {
    if (!doc || isLocked({ screen, key: "" })) return;
    if (extra.length && sel && !sel.key && sel.screen === screen) {
      const dx = x - pos[screen][0], dy = y - pos[screen][1];
      const next0 = shift(doc, allSel().filter((s2) => !s2.key).map((s2) => ({ x: s2, dx, dy })));
      if (commit) { setDraft(null); edit(next0); } else setDraft(next0);
      return;
    }
    // first move freezes every screen where it is, so moving one doesn't shuffle the rest
    const canvas: Record<string, [number, number]> = { ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, [v[0], v[1]] as [number, number]])), ...(doc.canvas ?? {}), [screen]: [x, y] };
    const next = { ...doc, canvas };
    if (commit) { setDraft(null); edit(next); } else setDraft(next);
  };

  const onInsert = (node: Record<string, unknown>) => insertNode(M.clone(node));

  /** Put a copied element or drawing back: drawings onto the screen you're on, elements where they'd go. */
  const pasteOwn = (o: Record<string, unknown>) => {
    if (!doc) return;
    if (o?.[SHAPE_CLIP]) {
      const screen = focusedScreen();
      const shapes = [...(doc.screens[screen]?.shapes ?? []), o[SHAPE_CLIP] as SketchShape];
      edit(M.setAt(doc, ["screens", screen, "shapes"], shapes));
      setSel({ screen, key: `shape:${shapes.length - 1}` });
      return;
    }
    const n = o?.[CLIP] ?? (o?.type || o?.use ? o : undefined);
    if (n) insertNode(n);
  };
  /**
   * Copy twice over: a picture of it (for Slack, docs, Figma) and the thing itself (for any wireframe), the same way
   * Storyboard Kit copies panels. Browsers that can't hold both get the picture, and this tab remembers the rest.
   */
  const lastCopy = useRef<{ clip: Record<string, unknown>; size?: number } | null>(null);
  const copyEverywhere = async (clip: Record<string, unknown>, screen: string, r: Rect | undefined, cut: boolean) => {
    const json = JSON.stringify(clip, null, 2);
    lastCopy.current = { clip };
    try {
      if (!r) throw new Error("no picture");
      const pad = 6;
      const png = fetch(`/api/screen.png?id=${encodeURIComponent(screen)}&scale=2&x=${Math.round(r.x - pad)}&y=${Math.round(r.y - pad)}&w=${Math.round(r.w + pad * 2)}&h=${Math.round(r.h + pad * 2)}`).then((x) => x.blob()).then((b) => { if (lastCopy.current) lastCopy.current.size = b.size; return b; });
      const custom = (ClipboardItem as unknown as { supports?: (t: string) => boolean }).supports?.("web application/x-wireframe-node");
      await navigator.clipboard.write([new ClipboardItem(custom ? { "image/png": png, "web application/x-wireframe-node": new Blob([json], { type: "application/x-wireframe-node" }) } : { "image/png": png })]);
      flash(cut ? "Cut. It's on the clipboard as a picture (for Slack, docs…) and as itself (for any wireframe)." : "Copied as a picture (paste into Slack, a doc…) and as itself (paste into any wireframe).");
    } catch {
      await navigator.clipboard.writeText(json).catch(() => undefined);
      flash(cut ? "Cut. Paste it into any screen, or Cmd+Z to undo." : "Copied. Paste into any wireframe, or to your agent as JSON.");
    }
  };

  /** An image from the clipboard or the upload button: into the selected image, else onto the screen you're on. */
  const addImage = (f: File) => {
    if (!doc) return;
    const screen = focusedScreen();
    const l = layouts[screen];
    if (!screen || !l) return;
    onDropFile(screen, Math.round(l.w / 2), Math.round(l.h / 3), f);
  };
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (play || (e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable]"))) return;
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (!f) return;
      e.preventDefault();
      // something copied here comes back as itself, not as a picture of itself
      if (lastCopy.current && lastCopy.current.size === f.size) { pasteOwn(lastCopy.current.clip); return; }
      try {
        for (const item of await navigator.clipboard.read()) if (item.types.includes("web application/x-wireframe-node")) { pasteOwn(JSON.parse(await (await item.getType("web application/x-wireframe-node")).text())); return; }
      } catch { /* no permission, or not ours */ }
      addImage(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const onMarkup = (screen: string, strokes: MarkupStroke[]) => { if (doc) edit(M.setAt(doc, ["screens", screen, "markup"], strokes.length ? strokes : undefined)); };

  // keyboard
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (play || cropping) return;
      const typing = (e.target as HTMLElement).closest("input,textarea,select,[contenteditable]");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) step(redo, undo); else step(undo, redo); return; }
      if (typing) return;
      if (mod && e.altKey && e.key.toLowerCase() === "c" && sel) { e.preventDefault(); a.copyStyle(); return; }
      if (mod && e.altKey && e.key.toLowerCase() === "v" && sel) { e.preventDefault(); a.pasteStyle(); return; }
      if (mod && e.key.toLowerCase() === "g" && sel) { e.preventDefault(); if (e.shiftKey) a.ungroup(); else a.group(); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === "l" && sel) { e.preventDefault(); a.lock(); return; }
      if (e.key === "Escape") {
        setMenu(false);
        if (tool !== "select") { setTool("select"); return; }
        // step out to the parent: item → its list → its container → the screen → nothing
        if (sel?.key && !sel.key.startsWith("shape:")) {
          const k = sel.key.includes("#") ? sel.key.split("#")[0] : sel.key.split("/").slice(0, -2).join("/");
          setSel({ screen: sel.screen, key: k });
        } else if (sel?.key) setSel({ screen: sel.screen, key: "" });
        else setSel(null);
        return;
      }
      if (!mod && !e.altKey) {
        const t = TOOL_KEYS[e.key.toLowerCase()];
        if (t) { setTool(t); return; }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); a.remove(); return; }
      if (mod && e.key.toLowerCase() === "d" && sel) { e.preventDefault(); a.duplicate(); return; }
      if (mod && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && sel && !sel.key.includes("#") && doc) {
        e.preventDefault();
        const cut = e.key.toLowerCase() === "x";
        if (!sel.key) { if (!cut) a.copyScreenImage(); return; }
        const isShape = sel.key.startsWith("shape:");
        const clip = isShape ? { [SHAPE_CLIP]: doc.screens[sel.screen]?.shapes?.[Number(sel.key.slice(6))] } : { [CLIP]: M.getAt(doc, M.pathOf(sel.screen, sel.key)) };
        const done = copyEverywhere(clip, sel.screen, layouts[sel.screen] ? selRectOf(doc, layouts[sel.screen], sel.key) : undefined, cut);
        // a cut feels instant: it's gone now, and the clipboard catches up in a moment
        if (cut) a.remove();
        await done;
        return;
      }
      if (mod && (e.code === "BracketRight" || e.code === "BracketLeft") && sel?.key && !sel.key.includes("#")) {
        e.preventDefault();
        const up = e.code === "BracketRight";
        a.arrange(e.shiftKey ? (up ? "front" : "back") : up ? "forward" : "backward");
        return;
      }
      if (mod && e.code === "Backslash") { e.preventDefault(); setProps(!props); return; }
      if (mod && e.key.toLowerCase() === "v" && doc) {
        const text = await navigator.clipboard.readText().catch(() => "");
        try {
          const o = JSON.parse(text);
          if (o?.[SHAPE_CLIP] || o?.[CLIP] || o?.type || o?.use) { e.preventDefault(); pasteOwn(o); }
        } catch { /* not ours: the paste event handles pictures */ }
        return;
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); a.move(e.key === "ArrowUp" ? -1 : 1); return; }
      if (sel?.key && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0, dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        onMove(sel.screen, sel.key.startsWith("shape:") ? sel.key : sel.key.split("#")[0], dx, dy, true);
        return;
      }
      if (e.key === "Enter" && sel) { e.preventDefault(); if (sel.key) startEdit(sel.screen, sel.key); else setFocusText((n) => n + 1); return; }
      if (e.key.toLowerCase() === "p" && !mod) { a.play(sel?.screen); return; }
      if (e.key === "0" && mod) { e.preventDefault(); fit(); return; }
      if (e.key === "1" && e.shiftKey) { fit(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => { if (sel) lastScreen.current = sel.screen; }, [sel]);
  // read-only hook for the end-to-end tests: where things are on the canvas
  useEffect(() => { (window as unknown as { __wf: unknown }).__wf = { layouts, pos, view, sel, extra }; }, [layouts, pos, view, sel, extra]);

  if (error && !doc) return <div className="boot">Couldn't load the wireframe: {error}</div>;
  if (!doc || !shown) return <div className="boot">Loading…</div>;

  const errs = result?.errors.length ?? 0, warns = result?.warnings.length ?? 0;
  return (
    <div className="app">
      <header className="top">
        <span className="brand">Wireframe Kit</span>
        <span className="file" title={file}>{file}</span>
        <button className={`btn${palette ? " on" : ""}`} onClick={() => setPalette(!palette)}>Components</button>
        <button className={`btn${props ? " on" : ""}`} onClick={() => setProps(!props)} title={"Show or hide the properties panel (⌘\\)"}>Properties</button>
        <button className="btn" onClick={a.addScreen}>+ Screen</button>
        <button className="btn" disabled={!undo.current.length} onClick={() => step(undo, redo)} title="Undo (⌘Z)">Undo</button>
        <button className="btn" disabled={!redo.current.length} onClick={() => step(redo, undo)} title="Redo (⇧⌘Z)">Redo</button>
        <span className="spacer" />
        <span className={`status ${errs ? "err" : warns ? "warn" : "ok"}`} onClick={() => setSel(null)} title="Show all checks">
          {errs ? `${errs} error${errs > 1 ? "s" : ""}` : warns ? `${warns} suggestion${warns > 1 ? "s" : ""}` : "Looks good"}
          {status === "saving" ? " · saving" : status === "error" ? " · not saved" : " · saved"}
        </span>
        <span className="zoom">
          <button className="btn ghost" onClick={() => setView((v) => ({ ...v, k: Math.max(0.1, v.k / 1.25) }))} title="Zoom out">−</button>
          <button className="btn ghost mono" onClick={() => fit()} title="Fit everything (⌘0)">{Math.round(view.k * 100)}%</button>
          <button className="btn ghost" onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.25) }))} title="Zoom in">+</button>
        </span>
        <div className="menu">
          <button className="btn" onClick={() => setMenu(!menu)}>Export</button>
          {menu ? <div className="menu-list" onClick={() => setMenu(false)}>
            <a href="/api/export?format=png" download>Flow as PNG</a>
            <a href="/api/export?format=pdf" download>PDF (flow + each screen)</a>
            <a href="/api/export?format=svg" download>Flow as SVG</a>
            <a href="/api/export?format=html" download>Clickable prototype (one HTML file)</a>
          </div> : null}
        </div>
        <button className="btn dark" onClick={() => a.play(sel?.screen)} title="Click through the flow (P)">Play</button>
      </header>
      <div className={`main${palette ? " with-palette" : ""}${props ? "" : " no-props"}`}>
        {palette ? <Palette onInsert={onInsert} onClose={() => setPalette(false)} onUpload={addImage} /> : null}
        <div className="canvas-wrap" ref={canvasEl}>
          <Canvas doc={shown} layouts={layouts} pos={pos} arrows={arr} below={laneSpace(arr)} view={view} setView={setView}
            sel={sel} onSelect={setSel} extra={extra} onToggle={onToggle} tool={tool} onMove={onMove} onResize={onResize} onMoveScreen={onMoveScreen}
            onDraw={onDraw} onTextTool={onTextTool} onStartEdit={(s2, k) => { setSel({ screen: s2, key: k }); startEdit(s2, k); }} editing={editing} onEditDone={finishEdit}
            onDropNode={onDropNode} onDropFile={onDropFile}
            asset={asset} dragging={dragging} setDragging={setDragging} />
          <Tools tool={tool} setTool={setTool} color={color} setColor={setColor} weight={weight} setWeight={setWeight} />
          {error ? <div className="banner">{error}</div> : null}
        </div>
        {props ? <Inspector doc={doc} layouts={layouts} sel={sel} result={result} a={a} focusText={focusText} /> : null}
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
      {cropping && doc ? (() => {
        const n = M.getAt(doc, cropping) as WNode | undefined;
        if (!n?.src) return null;
        return <CropDialog src={asset(String(n.src), true) ?? ""} crop={Array.isArray(n.crop) ? (n.crop as [number, number, number, number]) : undefined} onCancel={() => setCropping(null)} onDone={(c) => { edit(M.setProp(doc, cropping, "crop", c)); setCropping(null); }} />;
      })() : null}
      {play ? <Play doc={doc} start={play} asset={asset} onMarkup={onMarkup} onExit={(last) => { setPlay(null); setSel({ screen: last, key: "" }); }} /> : null}
    </div>
  );
}

export type { Item };

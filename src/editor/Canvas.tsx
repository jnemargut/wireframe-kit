import { useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import { RichHTML } from "../../vendor/sketch/rich";
import { shapeBox, shapeTextSize } from "../../vendor/sketch/shapes";
import type { DrawTool } from "../../vendor/sketch/tools";
import { useWheelView, type View } from "../../vendor/sketch/view";
import type { Layout } from "../layout";
import { ArrowPath, bezelOf, Frame, Notes, type Arrow } from "../render/flow";
import { ScreenArt, shapeScale } from "../render/screen";
import type { WireframeFile } from "../types";
import type { Sel } from "./model";

export type { View };
export type Tool = DrawTool;
export interface Rect { x: number; y: number; w: number; h: number }
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface InlineEdit { screen: string; key: string; value: string; rect: Rect; size: number; face: "title" | "hand"; multiline: boolean }

interface Props {
  doc: WireframeFile;
  layouts: Record<string, Layout>;
  pos: Record<string, [number, number]>;
  arrows: Arrow[];
  below: number;
  view: View;
  setView: (v: View | ((v: View) => View)) => void;
  sel: Sel;
  onSelect: (s: Sel) => void;
  tool: Tool;
  /** Move an element, item's parent or drawing by (dx, dy) screen px. Live while dragging, then commit. */
  onMove: (screen: string, key: string, dx: number, dy: number, commit: boolean) => void;
  onResize: (screen: string, key: string, from: Rect, to: Rect, commit: boolean) => void;
  onMoveScreen: (screen: string, x: number, y: number, commit: boolean) => void;
  onDraw: (screen: string, kind: Tool, points: [number, number][], commit: boolean) => void;
  onTextTool: (screen: string, x: number, y: number) => void;
  onStartEdit: (screen: string, key: string) => void;
  editing: InlineEdit | null;
  onEditDone: (value: string | null) => void;
  onDropNode: (screen: string, x: number, y: number, payload: string) => void;
  onDropFile: (screen: string | null, x: number, y: number, file: File) => void;
  asset: (src: string, raw?: boolean, crop?: number[]) => string | undefined;
  dragging: boolean;
  setDragging: (d: boolean) => void;
}

const inside = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

/** The topmost thing under a point: drawings, then items, then free and pinned planes over the flow, then the deepest box. */
export function hitTest(l: Layout, x: number, y: number, doc?: WireframeFile): string {
  const shapes = doc?.screens[l.screen]?.shapes ?? [];
  for (let i = shapes.length - 1; i >= 0; i--) {
    const b = shapeBox(shapes[i]);
    if (shapes[i].type === "text") { const w = Math.max(40, (shapes[i].text ?? "").length * 9 * shapeScale(l.w) / 1.4 * shapeTextSize(shapes[i]) / 16); if (inside({ x: b.x - w / 2, y: b.y - 16, w, h: 32 }, x, y)) return `shape:${i}`; }
    else if (inside(b, x, y, 8)) return `shape:${i}`;
  }
  const boxes = l.boxes.filter((b) => !b.hidden && inside(b, x, y));
  if (!boxes.length) return "";
  const top = Math.max(...boxes.map((b) => b.plane));
  const onTop = boxes.filter((b) => b.plane === top);
  const deepest = onTop.reduce((a, b) => (b.depth >= a.depth ? b : a));
  const item = l.items.find((it) => inside(it, x, y) && it.parent === deepest.key);
  return item ? item.key : deepest.key;
}

/** Everything under a point, outermost first: "children/2" → "children/2/children/1" → "children/2/children/1#3". */
export function hitChain(l: Layout, x: number, y: number, doc?: WireframeFile): string[] {
  const deepest = hitTest(l, x, y, doc);
  if (!deepest || deepest.startsWith("shape:")) return deepest ? [deepest] : [];
  const [node, item] = deepest.split("#");
  const parts = node.split("/");
  const chain: string[] = [];
  for (let i = 2; i <= parts.length; i += 2) {
    const k = parts.slice(0, i).join("/");
    if (l.boxes.some((b) => b.key === k)) chain.push(k);
  }
  if (item !== undefined) chain.push(deepest);
  return chain;
}

/** Click to pick the outer thing; click again to go one level in; ⌘/Ctrl-click for the innermost. */
export function pickFrom(chain: string[], sel: Sel, screen: string, deep: boolean): string {
  if (!chain.length) return "";
  if (deep) return chain[chain.length - 1];
  if (sel && sel.screen === screen) {
    const i = chain.indexOf(sel.key);
    if (i >= 0) return chain[Math.min(i + 1, chain.length - 1)];
  }
  return chain[0];
}

/** Where a selection sits, in screen px. */
export function selRectOf(doc: WireframeFile, l: Layout | undefined, key: string): Rect | undefined {
  if (!l) return undefined;
  if (key.startsWith("shape:")) {
    const s = doc.screens[l.screen]?.shapes?.[Number(key.slice(6))];
    if (!s) return undefined;
    const b = shapeBox(s);
    if (s.type === "text") { const tk = shapeTextSize(s) / 16; const w = Math.max(40, (s.text ?? "").split("\n").reduce((a, t) => Math.max(a, t.length), 0) * 9 * shapeScale(l.w) / 1.4 * tk); const h = (s.text ?? "").split("\n").length * 22 * shapeScale(l.w) / 1.4 * tk + 8; return { x: b.x - w / 2, y: b.y - h / 2, w, h }; }
    return b;
  }
  const r = key.includes("#") ? l.items.find((it) => it.key === key) : l.boxes.find((b) => b.key === key);
  return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : undefined;
}

export function Canvas(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ screen: string; key: string } | null>(null);
  const [space, setSpace] = useState(false);
  // Chrome can leave stale pixels behind (a gray "trail") when clipped SVG changes under a drag;
  // redrawing the screen being edited from scratch on every move, and once on release, leaves nothing behind.
  const [repaint, setRepaint] = useState({ screen: "", n: 0 });
  const drag = useRef<{ kind: "pan" | "move" | "screen" | "resize" | "draw" | "size"; sx: number; sy: number; vx: number; vy: number; screen?: string; key?: string; moved: boolean; handle?: Handle; from?: Rect; points?: [number, number][]; size?: { w: number; h: number }; pick?: string } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target as HTMLElement).closest("input,textarea,select")) { setSpace(true); e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // wheel: pinch / ctrl+wheel zooms around the cursor, plain wheel pans
  useWheelView(ref, p.setView);

  const world = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - p.view.x) / p.view.k, y: (e.clientY - r.top - p.view.y) / p.view.k };
  };
  const local = (e: { clientX: number; clientY: number }, screen: string) => {
    const w = world(e);
    const [ox, oy] = p.pos[screen];
    return { x: w.x - ox, y: w.y - oy };
  };
  /** The screen under a point (its screen area). */
  const screenAt = (e: { clientX: number; clientY: number }) => {
    const w = world(e);
    return Object.keys(p.layouts).find((id) => { const [x, y] = p.pos[id]; const l = p.layouts[id]; return w.x >= x && w.x <= x + l.w && w.y >= y && w.y <= y + l.h; });
  };

  const begin = (e: RPE, d: NonNullable<typeof drag.current>) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = d;
  };

  const onDown = (e: RPE) => {
    if (e.button !== 0 || p.editing) return;
    const target = e.target as Element;
    const handle = (target as HTMLElement).dataset?.handle as Handle | undefined;
    if (handle && p.sel) {
      const l = p.layouts[p.sel.screen];
      if (p.sel.key === "" && handle === "se") return begin(e, { kind: "size", sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, screen: p.sel.screen, moved: false, size: { w: l.w, h: l.h } });
      const from = selRectOf(p.doc, l, p.sel.key);
      if (from) return begin(e, { kind: "resize", sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, screen: p.sel.screen, key: p.sel.key, handle, from, moved: false });
    }
    const title = target.closest("[data-title]") as HTMLElement | null;
    const screen = screenAt(e);
    if (space || (!screen && !title)) {
      if (!space) p.onSelect(null);
      return begin(e, { kind: "pan", sx: e.clientX, sy: e.clientY, vx: p.view.x, vy: p.view.y, moved: false });
    }
    if (title && !screen) {
      const s = title.dataset.title!;
      p.onSelect({ screen: s, key: "" });
      return begin(e, { kind: "screen", sx: e.clientX, sy: e.clientY, vx: p.pos[s][0], vy: p.pos[s][1], screen: s, moved: false });
    }
    const s = screen!;
    const pt = local(e, s);
    if (p.tool === "text") { p.onTextTool(s, pt.x, pt.y); return; }
    if (p.tool !== "select") return begin(e, { kind: "draw", sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, screen: s, moved: false, points: [[Math.round(pt.x), Math.round(pt.y)]] });
    const chain = hitChain(p.layouts[s], pt.x, pt.y, p.doc);
    const key = pickFrom(chain, p.sel, s, e.metaKey || e.ctrlKey);
    // pressing on what's already selected: a drag moves it; a plain click goes one level in
    const held = p.sel && p.sel.screen === s && p.sel.key && chain.includes(p.sel.key) && !(e.metaKey || e.ctrlKey) ? p.sel.key : undefined;
    if (!held) p.onSelect({ screen: s, key });
    const mv = held ?? key;
    if (mv) begin(e, { kind: "move", sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, screen: s, key: mv.startsWith("shape:") ? mv : mv.split("#")[0], moved: false, pick: held ? key : undefined });
  };

  const resized = (d: NonNullable<typeof drag.current>, dx: number, dy: number): Rect => {
    const f = d.from!, h = d.handle!;
    let { x, y, w, h: hh } = f;
    if (h.includes("e")) w = Math.max(8, f.w + dx);
    if (h.includes("s")) hh = Math.max(8, f.h + dy);
    if (h.includes("w")) { w = Math.max(8, f.w - dx); x = f.x + f.w - w; }
    if (h.includes("n")) { hh = Math.max(8, f.h - dy); y = f.y + f.h - hh; }
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) };
  };

  const onMove = (e: RPE) => {
    const d = drag.current;
    if (!d) {
      const s = screenAt(e);
      if (s && !space && p.tool === "select") { const pt = local(e, s); setHover({ screen: s, key: pickFrom(hitChain(p.layouts[s], pt.x, pt.y, p.doc), p.sel, s, e.metaKey || e.ctrlKey) }); }
      else if (hover) setHover(null);
      return;
    }
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    if (!d.moved) { d.moved = true; p.setDragging(true); }
    const k = p.view.k;
    if (d.kind !== "pan" && d.kind !== "screen" && d.screen) setRepaint((r) => ({ screen: d.screen!, n: r.n + 1 }));
    if (d.kind === "pan") p.setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
    else if (d.kind === "screen") p.onMoveScreen(d.screen!, Math.round(d.vx + dx / k), Math.round(d.vy + dy / k), false);
    else if (d.kind === "move") p.onMove(d.screen!, d.key!, Math.round(dx / k), Math.round(dy / k), false);
    else if (d.kind === "resize") p.onResize(d.screen!, d.key!, d.from!, resized(d, dx / k, dy / k), false);
    else if (d.kind === "size") p.onResize(d.screen!, "", { x: 0, y: 0, ...d.size! }, { x: 0, y: 0, w: Math.round((d.size!.w + dx / k) / 10) * 10, h: Math.round((d.size!.h + dy / k) / 10) * 10 }, false);
    else if (d.kind === "draw") {
      const pt = local(e, d.screen!);
      const q: [number, number] = [Math.round(pt.x), Math.round(pt.y)];
      if (p.tool === "pen") { const last = d.points![d.points!.length - 1]; if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 2) d.points!.push(q); }
      else d.points = [d.points![0], q];
      p.onDraw(d.screen!, p.tool, [...d.points!], false);
    }
  };

  const onUp = (e: RPE) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) {
      if (d?.kind === "draw") p.onDraw(d.screen!, p.tool, d.points!, true);
      if (d?.kind === "move" && d.pick !== undefined) p.onSelect({ screen: d.screen!, key: d.pick });
      return;
    }
    p.setDragging(false);
    if (d.screen) setRepaint((r) => ({ screen: d.screen!, n: r.n + 1 }));
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy, k = p.view.k;
    if (d.kind === "screen") p.onMoveScreen(d.screen!, Math.round(d.vx + dx / k), Math.round(d.vy + dy / k), true);
    else if (d.kind === "move") p.onMove(d.screen!, d.key!, Math.round(dx / k), Math.round(dy / k), true);
    else if (d.kind === "resize") p.onResize(d.screen!, d.key!, d.from!, resized(d, dx / k, dy / k), true);
    else if (d.kind === "size") p.onResize(d.screen!, "", { x: 0, y: 0, ...d.size! }, { x: 0, y: 0, w: Math.round((d.size!.w + dx / k) / 10) * 10, h: Math.round((d.size!.h + dy / k) / 10) * 10 }, true);
    else if (d.kind === "draw") p.onDraw(d.screen!, p.tool, d.points!, true);
  };

  const rectOf = (screen: string, key: string): Rect | undefined => {
    const l = p.layouts[screen];
    const [ox, oy] = p.pos[screen] ?? [0, 0];
    if (!l) return undefined;
    if (!key) { const bz = bezelOf(l, p.doc); return { x: ox - bz.l, y: oy - bz.t, w: l.w + bz.l + bz.r, h: l.h + bz.t + bz.b }; }
    const r = selRectOf(p.doc, l, key);
    return r ? { x: ox + r.x, y: oy + r.y, w: r.w, h: r.h } : undefined;
  };
  const selRect = p.sel ? rectOf(p.sel.screen, p.sel.key) : undefined;
  const hovRect = hover && hover.key && !(p.sel && p.sel.screen === hover.screen && p.sel.key === hover.key) ? rectOf(hover.screen, hover.key) : undefined;
  const bw = 2 / p.view.k;
  const selArrow = p.sel?.key ? p.arrows.find((a) => a.key === `${p.sel!.screen}:${p.sel!.key}`)?.key : undefined;
  // which handles: free things and drawings resize from any side; layout things grow right and down; screens from the corner
  const selBox = p.sel && p.sel.key ? p.layouts[p.sel.screen]?.boxes.find((b) => b.key === p.sel!.key) : undefined;
  const handles: Handle[] = !p.sel || p.sel.key.includes("#") ? [] : p.sel.key === "" ? ["se"] : p.sel.key.startsWith("shape:") ? (p.doc.screens[p.sel.screen]?.shapes?.[Number(p.sel.key.slice(6))]?.type === "text" ? [] : ["nw", "ne", "sw", "se"]) : selBox?.free ? ["nw", "n", "ne", "e", "se", "s", "sw", "w"] : ["e", "se", "s"];
  const screenSel = p.sel && !p.sel.key ? p.layouts[p.sel.screen] : undefined;
  const screenSize = screenSel && p.pos[screenSel.screen] ? { x: p.pos[screenSel.screen][0] + screenSel.w, y: p.pos[screenSel.screen][1] + screenSel.h } : undefined;

  const ed = p.editing;
  const edRect = ed ? rectOf(ed.screen, ed.key) ?? (() => { const [ox, oy] = p.pos[ed.screen]; return { x: ox + ed.rect.x, y: oy + ed.rect.y, w: ed.rect.w, h: ed.rect.h }; })() : undefined;

  return (
    <div ref={ref} className={`canvas${space ? " panning" : ""}${p.tool !== "select" ? " drawing" : ""}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover(null)}
      onDoubleClick={(e) => { const s = screenAt(e); if (!s || p.tool !== "select") return; const pt = local(e, s); const chain = hitChain(p.layouts[s], pt.x, pt.y, p.doc); const key = p.sel && p.sel.screen === s && chain.includes(p.sel.key) ? p.sel.key : chain[chain.length - 1]; if (key) p.onStartEdit(s, key); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("application/x-wireframe-node") || e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
      onDrop={(e) => {
        e.preventDefault();
        const s = screenAt(e) ?? null;
        const node = e.dataTransfer.getData("application/x-wireframe-node");
        if (node && s) { const pt = local(e, s); p.onDropNode(s, Math.round(pt.x), Math.round(pt.y), node); return; }
        const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
        if (f) { const pt = s ? local(e, s) : { x: 0, y: 0 }; p.onDropFile(s, Math.round(pt.x), Math.round(pt.y), f); }
      }}
      style={{ backgroundPosition: `${p.view.x}px ${p.view.y}px`, backgroundSize: `${20 * p.view.k}px ${20 * p.view.k}px` }}>
      <div className="world" style={{ transform: `translate(${p.view.x}px, ${p.view.y}px) scale(${p.view.k})` }}>
        {Object.entries(p.layouts).map(([id, l]) => {
          const [x, y] = p.pos[id];
          const bz = bezelOf(l, p.doc);
          const sc = p.doc.screens[id];
          return (
            <div key={id}>
              <div className={`screen-title${p.sel?.screen === id && !p.sel.key ? " on" : ""}`} data-title={id} style={{ left: x - bz.l, top: y - bz.t - 58 }}>
                <span className="t"><RichHTML src={sc.title ?? id} /></span>
                <span className="id">{id} · {l.w}×{l.h}{(p.doc.start ?? Object.keys(p.doc.screens)[0]) === id ? " · start" : ""}</span>
              </div>
              <svg key={repaint.screen === id ? `r${repaint.n}` : "s"} className="shot" data-screen={id} width={l.w} height={l.h} viewBox={`0 0 ${l.w} ${l.h}`} style={{ left: x, top: y }} overflow="visible">
                <Frame l={l} file={p.doc} x={0} y={0} />
                <ScreenArt layout={l} shapes={sc.shapes} opts={{ wobble: !p.dragging, asset: p.asset, rx: bz.screenRx, uid: `ed-${id.replace(/[^a-z0-9]/gi, "_")}` }} />
                <Notes l={l} file={p.doc} x={0} y={0} below={p.below} />
              </svg>
            </div>
          );
        })}
        <svg className="arrows" width={1} height={1} overflow="visible">
          {p.arrows.map((a) => <ArrowPath key={a.key} a={a} highlight={a.key === selArrow} />)}
        </svg>
        {hovRect && p.tool === "select" ? <div className="hover-box" style={{ left: hovRect.x, top: hovRect.y, width: hovRect.w, height: hovRect.h, borderWidth: bw }} /> : null}
        {selRect && !ed ? (
          <div className={`sel-box${p.sel && !p.sel.key ? " screen" : ""}`} style={{ left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h, borderWidth: bw * 1.25 }}>
            {p.sel?.key ? handles.map((h) => <span key={h} className={`handle h-${h}`} data-handle={h} style={{ width: 11 / p.view.k, height: 11 / p.view.k, borderWidth: 2 / p.view.k }} />) : null}
          </div>
        ) : null}
        {screenSize && !ed ? <span className="handle h-screen" data-handle="se" title="Drag to resize the screen" style={{ left: screenSize.x - 7 / p.view.k, top: screenSize.y - 7 / p.view.k, width: 14 / p.view.k, height: 14 / p.view.k, borderWidth: 2 / p.view.k }} /> : null}
        {ed && edRect ? (
          <textarea className="inline-edit" autoFocus defaultValue={ed.value}
            style={{ left: edRect.x - 4, top: edRect.y - 4, width: Math.max(edRect.w + 8, 80), minHeight: edRect.h + 8, fontSize: ed.size, fontFamily: ed.face === "title" ? "Permanent Marker" : "Patrick Hand", borderWidth: 2 / p.view.k }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") p.onEditDone(null);
              if (e.key === "Enter" && (!ed.multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); p.onEditDone((e.target as HTMLTextAreaElement).value); }
            }}
            onBlur={(e) => p.onEditDone(e.target.value)}
            onFocus={(e) => e.target.select()} />
        ) : null}
      </div>
    </div>
  );
}

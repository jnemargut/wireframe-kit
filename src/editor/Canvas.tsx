import { useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import type { Layout } from "../layout";
import { ArrowPath, bezelOf, Frame, Notes, type Arrow } from "../render/flow";
import { ScreenArt } from "../render/screen";
import type { WireframeFile } from "../types";
import type { Sel } from "./model";

export interface View { x: number; y: number; k: number }

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
  /** Live while dragging (commit=false), then once more on release (commit=true). */
  onNudge: (screen: string, key: string, dx: number, dy: number, commit: boolean) => void;
  onMoveScreen: (screen: string, x: number, y: number, commit: boolean) => void;
  onEdit: () => void;
  asset: (src: string) => string | undefined;
  dragging: boolean;
  setDragging: (d: boolean) => void;
}

/** The deepest thing under a point: items first, then pinned planes over the flow, then the deepest box. */
export function hitTest(l: Layout, x: number, y: number): string {
  const inside = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const boxes = l.boxes.filter((b) => !b.hidden && inside(b));
  if (!boxes.length) return "";
  const top = Math.max(...boxes.map((b) => b.plane));
  const onTop = boxes.filter((b) => b.plane === top);
  const deepest = onTop.reduce((a, b) => (b.depth >= a.depth ? b : a));
  const item = l.items.find((it) => inside(it) && (it.parent === deepest.key));
  return item ? item.key : deepest.key;
}

export function Canvas(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ screen: string; key: string } | null>(null);
  const [space, setSpace] = useState(false);
  const drag = useRef<{ kind: "pan" | "nudge" | "screen"; sx: number; sy: number; vx: number; vy: number; screen?: string; key?: string; moved: boolean } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target as HTMLElement).closest("input,textarea,select")) { setSpace(true); e.preventDefault(); } };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // wheel: pinch / ctrl+wheel zooms around the cursor, plain wheel pans
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const cx = e.clientX - r.left, cy = e.clientY - r.top;
        p.setView((v) => {
          const k = Math.min(3, Math.max(0.1, v.k * Math.exp(-e.deltaY * 0.01)));
          return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
        });
      } else p.setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [p.setView]);

  const local = (e: { clientX: number; clientY: number }, screen: string) => {
    const r = ref.current!.getBoundingClientRect();
    const [ox, oy] = p.pos[screen];
    return { x: (e.clientX - r.left - p.view.x) / p.view.k - ox, y: (e.clientY - r.top - p.view.y) / p.view.k - oy };
  };

  const start = (e: RPE, kind: "pan" | "nudge" | "screen", screen?: string, key?: string) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const [vx, vy] = screen && kind === "screen" ? p.pos[screen] : [p.view.x, p.view.y];
    drag.current = { kind, sx: e.clientX, sy: e.clientY, vx, vy, screen, key, moved: false };
  };

  const onDown = (e: RPE) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    const shot = target.closest("[data-screen]") as HTMLElement | null;
    const title = target.closest("[data-title]") as HTMLElement | null;
    if (space || (!shot && !title)) {
      if (!space) p.onSelect(null);
      return start(e, "pan");
    }
    if (title) {
      const s = title.dataset.title!;
      p.onSelect({ screen: s, key: "" });
      return start(e, "screen", s);
    }
    const s = shot!.dataset.screen!;
    const pt = local(e, s);
    const key = hitTest(p.layouts[s], pt.x, pt.y);
    p.onSelect({ screen: s, key });
    if (key) start(e, "nudge", s, key.split("#")[0]);
  };

  const onMove = (e: RPE) => {
    const d = drag.current;
    if (!d) {
      const shot = (e.target as Element).closest("[data-screen]") as HTMLElement | null;
      if (shot && !space) { const s = shot.dataset.screen!; const pt = local(e, s); setHover({ screen: s, key: hitTest(p.layouts[s], pt.x, pt.y) }); }
      else if (hover) setHover(null);
      return;
    }
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; p.setDragging(true); }
    if (d.kind === "pan") p.setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
    else if (d.kind === "screen") p.onMoveScreen(d.screen!, Math.round(d.vx + dx / p.view.k), Math.round(d.vy + dy / p.view.k), false);
    else p.onNudge(d.screen!, d.key!, Math.round(dx / p.view.k / 2) * 2, Math.round(dy / p.view.k / 2) * 2, false);
  };

  const onUp = (e: RPE) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    p.setDragging(false);
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (d.kind === "screen") p.onMoveScreen(d.screen!, Math.round(d.vx + dx / p.view.k), Math.round(d.vy + dy / p.view.k), true);
    else if (d.kind === "nudge") p.onNudge(d.screen!, d.key!, Math.round(dx / p.view.k / 2) * 2, Math.round(dy / p.view.k / 2) * 2, true);
  };

  const rectOf = (screen: string, key: string) => {
    const l = p.layouts[screen];
    const [ox, oy] = p.pos[screen] ?? [0, 0];
    if (!l) return undefined;
    if (!key) { const bz = bezelOf(l, p.doc); return { x: ox - bz.l, y: oy - bz.t, w: l.w + bz.l + bz.r, h: l.h + bz.t + bz.b }; }
    const r = key.includes("#") ? l.items.find((it) => it.key === key) : l.boxes.find((b) => b.key === key);
    return r ? { x: ox + r.x, y: oy + r.y, w: r.w, h: r.h } : undefined;
  };
  const selRect = p.sel ? rectOf(p.sel.screen, p.sel.key) : undefined;
  const hovRect = hover && hover.key && !(p.sel && p.sel.screen === hover.screen && p.sel.key === hover.key) ? rectOf(hover.screen, hover.key) : undefined;
  const bw = 2 / p.view.k;
  const selArrow = p.sel?.key ? p.arrows.find((a) => a.key === `${p.sel!.screen}:${p.sel!.key}`)?.key : undefined;

  return (
    <div ref={ref} className={`canvas${space ? " panning" : ""}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setHover(null)}
      onDoubleClick={(e) => { if ((e.target as Element).closest("[data-screen]")) p.onEdit(); }}
      style={{ backgroundPosition: `${p.view.x}px ${p.view.y}px`, backgroundSize: `${20 * p.view.k}px ${20 * p.view.k}px` }}>
      <div className="world" style={{ transform: `translate(${p.view.x}px, ${p.view.y}px) scale(${p.view.k})` }}>
        {Object.entries(p.layouts).map(([id, l]) => {
          const [x, y] = p.pos[id];
          const bz = bezelOf(l, p.doc);
          const sc = p.doc.screens[id];
          return (
            <div key={id}>
              <div className={`screen-title${p.sel?.screen === id && !p.sel.key ? " on" : ""}`} data-title={id} style={{ left: x - bz.l, top: y - bz.t - 58 }}>
                <span className="t">{sc.title ?? id}</span>
                <span className="id">{id}{(p.doc.start ?? Object.keys(p.doc.screens)[0]) === id ? " · start" : ""}</span>
              </div>
              <svg className="shot" data-screen={id} width={l.w} height={l.h} viewBox={`0 0 ${l.w} ${l.h}`} style={{ left: x, top: y }} overflow="visible">
                <Frame l={l} file={p.doc} x={0} y={0} />
                <ScreenArt layout={l} opts={{ wobble: !p.dragging, asset: p.asset, uid: `ed-${id.replace(/[^a-z0-9]/gi, "_")}` }} />
                <Notes l={l} file={p.doc} x={0} y={0} below={p.below} />
              </svg>
            </div>
          );
        })}
        <svg className="arrows" width={1} height={1} overflow="visible">
          {p.arrows.map((a) => <ArrowPath key={a.key} a={a} highlight={a.key === selArrow} />)}
        </svg>
        {hovRect ? <div className="hover-box" style={{ left: hovRect.x, top: hovRect.y, width: hovRect.w, height: hovRect.h, borderWidth: bw }} /> : null}
        {selRect ? <div className={`sel-box${p.sel && !p.sel.key ? " screen" : ""}`} style={{ left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h, borderWidth: bw * 1.25 }} /> : null}
      </div>
    </div>
  );
}

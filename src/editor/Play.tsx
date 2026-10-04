import { useEffect, useMemo, useRef, useState } from "react";
import { plainText, RichHTML } from "../../vendor/sketch/rich";
import { DeviceChrome } from "../../vendor/sketch/device-chrome";
import type { MarkupStroke } from "../../vendor/sketch/shapes";
import { MARKER, markerHex } from "../../vendor/sketch/tokens";
import { AnyColor } from "../../vendor/sketch/color";
import { layoutScreen, type Rect } from "../layout";
import { bezelOf } from "../render/flow";
import { ScreenArt, shapeScale } from "../render/screen";
import type { WireframeFile } from "../types";
import { COLORS } from "../../vendor/sketch/tools";
import { useQuietControls } from "../../vendor/sketch/quiet";

interface Hot extends Rect { key: string; goes: string }
type MarkTool = "pen" | "eraser" | null;

/** Click through the flow like the real thing. Links glow orange (what a person does); a sharpie for crits; Esc leaves. */
export function Play({ doc, start, onExit, asset, onMarkup }: { doc: WireframeFile; start: string; onExit: (last: string) => void; asset: (src: string, raw?: boolean, crop?: number[]) => string | undefined; onMarkup: (screen: string, strokes: MarkupStroke[]) => void }) {
  const [stack, setStack] = useState<string[]>([start]);
  const [hover, setHover] = useState<string | null>(null);
  const [tap, setTap] = useState<{ x: number; y: number; n: number } | null>(null);
  const [hint, setHint] = useState(false);
  const [strip, setStrip] = useState(false);
  // what's being shown is all that's on screen: the controls show when the mouse moves and step aside when it stops
  const { awake, tip, onPointerMove: onQuietMove } = useQuietControls(".play-bar");
  const [tool, setTool] = useState<MarkTool>(null);
  const [color, setColor] = useState("red");
  const [picking, setPicking] = useState(false);
  const [live, setLive] = useState<[number, number][] | null>(null);
  const erased = useRef<Set<number> | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const screen = stack[stack.length - 1];
  const l = useMemo(() => layoutScreen(doc, screen), [doc, screen]);
  const bz = bezelOf(l, doc);
  const fw = l.w + bz.l + bz.r, fh = l.h + bz.t + bz.b;
  const k = Math.min(1.6, (size.h - 24) / fh, (size.w - 24) / fw);
  const marks = doc.screens[screen]?.markup ?? [];
  const sc = shapeScale(l.w);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, [strip]);

  const hots: Hot[] = useMemo(() => {
    const out: Hot[] = [];
    for (const b of l.boxes) {
      if (b.hidden) continue;
      if (b.goes) out.push({ key: b.key, goes: b.goes, x: b.x, y: b.y, w: b.w, h: b.h });
      if (b.type === "navbar" && b.node.back) out.push({ key: `${b.key}:back`, goes: "back", x: b.x + 4, y: b.y + 4, w: 48, h: 48 });
    }
    for (const it of l.items) if (it.goes) out.push({ key: it.key, goes: it.goes, x: it.x, y: it.y, w: it.w, h: it.h });
    return out.reverse();
  }, [l]);

  const go = (target: string) => {
    if (target === "back") { if (stack.length > 1) setStack(stack.slice(0, -1)); return; }
    if (doc.screens[target] && target !== screen) setStack([...stack, target]);
  };

  const anyMarkup = Object.values(doc.screens).some((s) => s.markup?.length);
  const clearScreen = () => { if (marks.length) onMarkup(screen, []); };
  const clearAll = () => { if (anyMarkup && window.confirm("Clear the markup on every screen?")) for (const [id, s] of Object.entries(doc.screens)) if (s.markup?.length) onMarkup(id, []); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea")) return;
      if (e.key === "Escape") { if (tool) setTool(null); else onExit(screen); }
      else if (e.key === "Backspace" || e.key === "ArrowLeft") go("back");
      else if (e.key.toLowerCase() === "d") setTool((t) => (t === "pen" ? null : "pen"));
      else if (e.key.toLowerCase() === "e") setTool((t) => (t === "eraser" ? null : "eraser"));
      else if (e.key.toLowerCase() === "s") setStrip((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const at = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  const hit = (x: number, y: number) => hots.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  /** Strokes under the eraser. */
  const near = (x: number, y: number) => marks.map((m, i) => (m.points.some(([px, py]) => Math.hypot(px - x, py - y) < 14 * sc) ? i : -1)).filter((i) => i >= 0);

  return (
    <div className={`play${tool ? ` marking ${tool}` : ""}`} onPointerMove={onQuietMove}>
      {/* the screen is all that's on show: the controls are a small bar that steps aside when the mouse stops */}
      <div className={`play-bar${awake || tool || picking ? "" : " asleep"}`}>
        <button className="nav" disabled={stack.length < 2} onClick={() => go("back")} title="Back (←)" aria-label="Back">←</button>
        <span className="play-title"><RichHTML src={doc.screens[screen]?.title ?? screen} /></span>
        <span className="play-count">{stack.length > 1 ? `${stack.length - 1} step${stack.length > 2 ? "s" : ""} in` : "start"}</span>
        <span className="sep" />
        <div className="play-tools" role="group" aria-label="Markup">
          <button className={tool === "pen" ? "on" : ""} aria-pressed={tool === "pen"} onClick={() => setTool(tool === "pen" ? null : "pen")} title="Sharpie: draw over the screen (D)">Sharpie</button>
          {/* the sharpie's own tools only while you're drawing */}
          {tool ? <>
          <span className="pen-color">
            <button className="pen-dot" style={{ background: markerHex(color) }} onClick={() => setPicking(!picking)} aria-expanded={picking} aria-label={`Sharpie color: ${color}`} title="Sharpie color" />
            {picking ? <span className="pen-pop">{COLORS.map((c) => <button key={c} className={`pen-dot${c === color ? " on" : ""}`} style={{ background: MARKER[c] }} aria-label={c} title={c} onClick={() => { setColor(c); setTool("pen"); setPicking(false); }} />)}<AnyColor value={color} onPick={(h) => { setColor(h); setTool("pen"); }} title="Any sharpie color" /></span> : null}
          </span>
          <button className={tool === "eraser" ? "on" : ""} aria-pressed={tool === "eraser"} onClick={() => setTool(tool === "eraser" ? null : "eraser")} title="Eraser: click or drag over strokes (E)">Eraser</button>
          {marks.length ? <button onClick={clearScreen} title="Remove all markup from this screen">Clear screen</button> : null}
          {anyMarkup ? <button onClick={clearAll} title="Remove markup from every screen">Clear all</button> : null}
          </> : null}
        </div>
        <span className="sep" />
        <button disabled={stack.length < 2} onClick={() => setStack([start])} title="Back to the first screen">Restart</button>
        <button onClick={() => setHint(!hint)} aria-pressed={hint} title="Outline everything you can click">Show links</button>
        <button onClick={() => setStrip(!strip)} aria-pressed={strip} title="All screens (S)">Screens</button>
        <button onClick={() => onExit(screen)} title="Leave Play (Esc)">Exit</button>
      </div>
      <div className="play-stage" ref={stage}>
        <div className="play-device" style={{ width: l.w * k, height: l.h * k, margin: `${bz.t * k}px ${bz.r * k}px ${bz.b * k}px ${bz.l * k}px` }}
          onPointerDown={(e) => {
            if (!tool) return;
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            const p = at(e);
            if (tool === "pen") setLive([[Math.round(p.x), Math.round(p.y)]]);
            else { erased.current = new Set(near(p.x, p.y)); if (erased.current.size) onMarkup(screen, marks.filter((_, i) => !erased.current!.has(i))); }
          }}
          onPointerMove={(e) => {
            const p = at(e);
            if (tool === "pen" && live) { const last = live[live.length - 1]; if (Math.hypot(p.x - last[0], p.y - last[1]) > 2) setLive([...live, [Math.round(p.x), Math.round(p.y)]]); return; }
            if (tool === "eraser" && erased.current) { const hits = near(p.x, p.y); if (hits.length) onMarkup(screen, marks.filter((_, i) => !hits.includes(i))); return; }
            if (!tool) setHover(hit(p.x, p.y)?.key ?? null);
          }}
          onPointerUp={() => {
            if (tool === "pen" && live) { if (live.length > 1) onMarkup(screen, [...marks, { points: live, ...(color !== "red" ? { color } : {}) }]); setLive(null); }
            erased.current = null;
          }}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            if (tool) return;
            const p = at(e);
            setTap({ x: p.x, y: p.y, n: Date.now() });
            const h = hit(p.x, p.y);
            if (h) window.setTimeout(() => go(h.goes), 140);
          }}>
          <svg width={l.w * k} height={l.h * k} viewBox={`0 0 ${l.w} ${l.h}`} overflow="visible">
            {bz.kind !== "none" ? <DeviceChrome kind={bz.kind} w={l.w} h={l.h} /> : null}
            <ScreenArt layout={l} shapes={doc.screens[screen]?.shapes} markup={live ? [...marks, { points: live, color }] : marks} opts={{ asset, uid: `play-${screen}`, rx: bz.screenRx, showMarkup: true }} />
            {!tool ? hots.filter((h) => hint || h.key === hover).map((h) => <rect key={h.key} x={h.x - 2} y={h.y - 2} width={h.w + 4} height={h.h + 4} rx={8} fill="#e8590c" fillOpacity={0.08} stroke="#e8590c" strokeWidth={3} />) : null}
            {tap && !tool ? <circle key={tap.n} className="tap" cx={tap.x} cy={tap.y} r={22} fill="none" stroke="#e8590c" strokeWidth={4} /> : null}
          </svg>
        </div>
      </div>
      {strip ? (
        <div className="play-strip">
          {Object.keys(doc.screens).map((id) => <Thumb key={id} doc={doc} id={id} on={id === screen} onClick={() => go(id)} />)}
        </div>
      ) : null}
      {tool || tip ? <div className="play-foot">{tool === "pen" ? "Draw on the screen. Marks are saved but only show here in play mode. D to stop." : tool === "eraser" ? "Click or drag over a stroke to erase it. E to stop." : `Click anything with a link. Back with ← or the navbar arrow. S shows every screen. ${hots.length ? `${hots.length} link${hots.length === 1 ? "" : "s"} on this screen.` : "No links on this screen."}`}</div> : null}
    </div>
  );
}

function Thumb({ doc, id, on, onClick }: { doc: WireframeFile; id: string; on: boolean; onClick: () => void }) {
  const l = useMemo(() => layoutScreen(doc, id), [doc, id]);
  const h = 96, w = Math.max(40, Math.min(170, (l.w / l.h) * h));
  return (
    <button className={`thumb${on ? " on" : ""}`} onClick={onClick} title={plainText(doc.screens[id].title ?? id)}>
      <svg width={w} height={h} viewBox={`0 0 ${l.w} ${l.h}`}><ScreenArt layout={l} shapes={doc.screens[id].shapes} opts={{ uid: `th-${id}`, wobble: false, rx: 12 }} /></svg>
      <span><RichHTML src={doc.screens[id].title ?? id} /></span>
    </button>
  );
}

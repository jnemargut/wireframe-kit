import { useEffect, useMemo, useRef, useState } from "react";
import { layoutScreen, type Rect } from "../layout";
import { bezelOf, Frame } from "../render/flow";
import { ScreenArt } from "../render/screen";
import type { WireframeFile } from "../types";

interface Hot extends Rect { key: string; goes: string }

/** Click through the flow like the real thing. Links glow orange (what a person does); Esc leaves. */
export function Play({ doc, start, onExit, asset }: { doc: WireframeFile; start: string; onExit: (last: string) => void; asset: (src: string) => string | undefined }) {
  const [stack, setStack] = useState<string[]>([start]);
  const [hover, setHover] = useState<string | null>(null);
  const [tap, setTap] = useState<{ x: number; y: number; n: number } | null>(null);
  const [hint, setHint] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const screen = stack[stack.length - 1];
  const l = useMemo(() => layoutScreen(doc, screen), [doc, screen]);
  const bz = bezelOf(l, doc);
  const fw = l.w + bz.l + bz.r, fh = l.h + bz.t + bz.b;
  const k = Math.min(1.6, (size.h - 24) / fh, (size.w - 24) / fw);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, []);

  const hots: Hot[] = useMemo(() => {
    const out: Hot[] = [];
    for (const b of l.boxes) {
      if (b.hidden) continue;
      if (b.goes) out.push({ key: b.key, goes: b.goes, x: b.x, y: b.y, w: b.w, h: b.h });
      if (b.type === "navbar" && b.node.back) out.push({ key: `${b.key}:back`, goes: "back", x: b.x + 4, y: b.y + 4, w: 48, h: 48 });
    }
    for (const it of l.items) if (it.goes) out.push({ key: it.key, goes: it.goes, x: it.x, y: it.y, w: it.w, h: it.h });
    // pinned and item hotspots win over what's underneath
    return out.reverse();
  }, [l]);

  const go = (target: string) => {
    if (target === "back") { if (stack.length > 1) setStack(stack.slice(0, -1)); return; }
    if (doc.screens[target]) setStack([...stack, target]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit(screen);
      if (e.key === "Backspace" || e.key === "ArrowLeft") go("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const at = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };
  const hit = (x: number, y: number) => hots.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);

  return (
    <div className="play">
      <div className="play-top">
        <span className="play-title">{doc.screens[screen]?.title ?? screen}</span>
        <span className="play-count">{screen} · {stack.length > 1 ? `${stack.length - 1} step${stack.length > 2 ? "s" : ""} in` : "start"}</span>
        <span className="spacer" />
        <button disabled={stack.length < 2} onClick={() => go("back")}>Back</button>
        <button onClick={() => setStack([start])}>Restart</button>
        <button onClick={() => setHint(!hint)} aria-pressed={hint}>Show links</button>
        <button onClick={() => onExit(screen)}>Exit (Esc)</button>
      </div>
      <div className="play-stage" ref={stage}>
        <div className="play-device" style={{ width: l.w * k, height: l.h * k, margin: `${bz.t * k}px ${bz.r * k}px ${bz.b * k}px ${bz.l * k}px` }}
          onPointerMove={(e) => { const p = at(e); setHover(hit(p.x, p.y)?.key ?? null); }}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const p = at(e);
            setTap({ x: p.x, y: p.y, n: Date.now() });
            const h = hit(p.x, p.y);
            if (h) window.setTimeout(() => go(h.goes), 140);
          }}>
          <svg width={l.w * k} height={l.h * k} viewBox={`0 0 ${l.w} ${l.h}`} overflow="visible">
            <rect x={-bz.l - 1.5} y={-bz.t - 1.5} width={fw + 3} height={fh + 3} rx={bz.rx + 1.5} fill="none" stroke="#6f777f" strokeWidth={1.5} />
            <Frame l={l} file={doc} x={0} y={0} />
            <ScreenArt layout={l} opts={{ asset, uid: `play-${screen}` }} />
            {hots.filter((h) => hint || h.key === hover).map((h) => <rect key={h.key} x={h.x - 2} y={h.y - 2} width={h.w + 4} height={h.h + 4} rx={8} fill="#e8590c" fillOpacity={0.08} stroke="#e8590c" strokeWidth={3} />)}
            {tap ? <circle key={tap.n} className="tap" cx={tap.x} cy={tap.y} r={22} fill="none" stroke="#e8590c" strokeWidth={4} /> : null}
          </svg>
        </div>
      </div>
      <div className="play-foot">Click anything with a link. Back with ← or the navbar arrow. {hots.length ? `${hots.length} link${hots.length === 1 ? "" : "s"} on this screen.` : "No links on this screen."}</div>
    </div>
  );
}

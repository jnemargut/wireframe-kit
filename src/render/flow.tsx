/**
 * The flow canvas (decision 7): every screen in a device frame, side by side, with arrows for links and the
 * designer's notes as stickies. The editor draws this live; `wf export` renders the same thing to a file.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { C } from "../../vendor/sketch/tokens";
import { WobbleFilter } from "../../vendor/sketch/wobble";
import { layoutScreen, linksOf, type Layout, type Rect } from "../layout";
import { wrap } from "../text";
import { deviceSize, type WireframeFile } from "../types";
import { ScreenArt, type ScreenOpts } from "./screen";

export const GAP_X = 170;
export const TITLE_H = 64;

export function bezelOf(l: Layout, file: WireframeFile): { l: number; t: number; r: number; b: number; rx: number; browser?: boolean } {
  const d = deviceSize(file, file.screens[l.screen]);
  if (d.name === "desktop" || (d.name === "custom" && d.w >= 900)) return { l: 2, t: 40, r: 2, b: 2, rx: 10, browser: true };
  if (d.name === "tablet") return { l: 18, t: 18, r: 18, b: 18, rx: 34 };
  if (d.name === "watch") return { l: 14, t: 14, r: 14, b: 14, rx: 52 };
  if (l.phone) return { l: 12, t: 12, r: 12, b: 12, rx: 58 };
  return { l: 10, t: 10, r: 10, b: 10, rx: 16 };
}

/** Where each screen's top-left sits on the canvas. Saved positions win; the rest line up left to right. */
export function positions(file: WireframeFile, layouts: Record<string, Layout>): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  let x = 0;
  for (const id of Object.keys(file.screens)) {
    const l = layouts[id];
    const bz = bezelOf(l, file);
    const saved = file.canvas?.[id];
    out[id] = saved && saved.length === 2 && saved.every((v) => typeof v === "number") ? [saved[0], saved[1]] : [x + bz.l, TITLE_H + bz.t];
    x = Math.max(x, out[id][0] - bz.l) + bz.l + l.w + bz.r + GAP_X;
  }
  return out;
}

export function layoutAll(file: WireframeFile): Record<string, Layout> {
  return Object.fromEntries(Object.keys(file.screens).map((id) => [id, layoutScreen(file, id)]));
}

export interface Arrow { key: string; from: string; to: string; d: string; start: [number, number]; end: [number, number]; lane?: number }

const LANE = 14;

/** Link arrows between screens, in canvas units. Arrows that would cut across another screen go round underneath. */
export function arrows(file: WireframeFile, layouts: Record<string, Layout>, pos: Record<string, [number, number]>): Arrow[] {
  const out: Arrow[] = [];
  const frame = (id: string) => {
    const l = layouts[id], [x, y] = pos[id], bz = bezelOf(l, file);
    return { x0: x - bz.l, x1: x + l.w + bz.r, y0: y - bz.t, y1: y + l.h + bz.b };
  };
  let lanes = 0;
  for (const [id, l] of Object.entries(layouts)) {
    const [ox, oy] = pos[id];
    for (const link of linksOf(l)) {
      const tl = layouts[link.to];
      if (!tl || link.to === id) continue;
      const [tx, ty] = pos[link.to];
      const tb = bezelOf(tl, file);
      const r: Rect = link.from;
      const right = tx > ox;
      const sx = right ? ox + r.x + r.w : ox + r.x;
      const sy = oy + r.y + r.h / 2;
      const ex = right ? tx - tb.l - 6 : tx + tl.w + tb.r + 6;
      const ey = Math.min(ty + tl.h - 60, Math.max(ty + 60, sy));
      const lo = Math.min(sx, ex), hi = Math.max(sx, ex);
      const between = Object.keys(layouts).filter((o) => o !== id && o !== link.to).map(frame)
        .filter((f) => f.x0 < hi && f.x1 > lo && f.y0 < Math.max(sy, ey) && f.y1 > Math.min(sy, ey));
      if (!between.length) {
        const bend = Math.max(60, Math.abs(ex - sx) * 0.45);
        const d = `M${sx} ${sy} C${sx + (right ? bend : -bend)} ${sy}, ${ex - (right ? bend : -bend)} ${ey}, ${ex} ${ey}`;
        out.push({ key: `${id}:${link.key}`, from: id, to: link.to, d, start: [sx, sy], end: [ex, ey] });
        continue;
      }
      // round underneath: out into the gap, down to a lane below the frames, across, and up into the target
      const src = frame(id), dst = frame(link.to);
      const lane = lanes++;
      const laneY = Math.max(src.y1, dst.y1, ...between.map((f) => f.y1)) + 18 + lane * LANE;
      const dir = right ? 1 : -1;
      const g1 = (right ? src.x1 : src.x0) + dir * (GAP_X / 2 - 14 - lane * 6);
      const g2 = (right ? dst.x0 : dst.x1) - dir * (GAP_X / 2 - 14 - lane * 6);
      const q = 14;
      const d = `M${sx} ${sy} H${g1 - dir * q} Q${g1} ${sy} ${g1} ${sy + q} V${laneY - q} Q${g1} ${laneY} ${g1 + dir * q} ${laneY} H${g2 - dir * q} Q${g2} ${laneY} ${g2} ${laneY - q} V${ey + q} Q${g2} ${ey} ${g2 + dir * q} ${ey} H${ex}`;
      out.push({ key: `${id}:${link.key}`, from: id, to: link.to, d, start: [sx, sy], end: [ex, ey], lane });
    }
  }
  return out;
}

/** Room under the frames for arrows that go round. */
export const laneSpace = (arr: Arrow[]) => {
  const n = arr.filter((a) => a.lane !== undefined).length;
  return n ? 18 + n * LANE + 8 : 0;
};

export function Frame({ l, file, x, y, title, sub }: { l: Layout; file: WireframeFile; x: number; y: number; title?: string; sub?: string }) {
  const bz = bezelOf(l, file);
  const fx = x - bz.l, fy = y - bz.t, fw = l.w + bz.l + bz.r, fh = l.h + bz.t + bz.b;
  return (
    <g>
      {title ? <text x={fx} y={fy - 28} fontFamily="Permanent Marker" fontSize={24} fill={C.ink}>{title}</text> : null}
      {sub ? <text x={fx} y={fy - 10} fontFamily="Patrick Hand" fontSize={15} fill={C.g7}>{sub}</text> : null}
      <rect x={fx} y={fy} width={fw} height={fh} rx={bz.rx} fill={bz.browser ? C.g1 : C.ink} stroke={C.ink} strokeWidth={2.6} />
      {bz.browser ? <g>{[0, 1, 2].map((i) => <circle key={i} cx={fx + 20 + i * 18} cy={fy + 20} r={5.5} fill="none" stroke={C.g7} strokeWidth={1.6} />)}<rect x={fx + 90} y={fy + 9} width={Math.min(420, fw - 180)} height={22} rx={11} fill={C.paper} stroke={C.g5} strokeWidth={1.4} /></g> : null}
    </g>
  );
}

export function ArrowPath({ a, highlight }: { a: Arrow; highlight?: boolean }) {
  const [ex, ey] = a.end;
  const dir = a.end[0] > a.start[0] ? 1 : -1;
  const color = highlight ? C.action : C.g8;
  return (
    <g>
      <path d={a.d} fill="none" stroke={color} strokeWidth={highlight ? 3.4 : 2.6} strokeLinecap="round" />
      <path d={`M${ex - 13 * dir} ${ey - 8} L${ex} ${ey} L${ex - 13 * dir} ${ey + 8}`} fill="none" stroke={color} strokeWidth={highlight ? 3.4 : 2.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={a.start[0]} cy={a.start[1]} r={4.5} fill={color} />
    </g>
  );
}

/** Numbered note badges on elements and the stickies under the screen. */
export function Notes({ l, file, x, y, below = 0 }: { l: Layout; file: WireframeFile; x: number; y: number; below?: number }) {
  if (!l.notes.length) return null;
  const bz = bezelOf(l, file);
  let sy = y + l.h + bz.b + 22 + below;
  const w = l.w + bz.l + bz.r;
  return (
    <g>
      {l.notes.filter((n) => n.n > 0).map((n) => {
        const b = l.boxes.find((bb) => bb.key === n.key);
        if (!b) return null;
        return <g key={n.key}><circle cx={x + b.x + b.w - 4} cy={y + b.y + 4} r={12} fill={C.caption} stroke={C.ink} strokeWidth={1.8} /><text x={x + b.x + b.w - 4} y={y + b.y + 9.5} textAnchor="middle" fontFamily="Patrick Hand" fontSize={15} fill={C.ink}>{n.n}</text></g>;
      })}
      {l.notes.map((n) => {
        const lines = wrap(`${n.n ? `${n.n}. ` : ""}${n.text}`, "hand", 16, w - 28);
        const h = lines.length * 21 + 18;
        const top = sy;
        sy += h + 10;
        return <g key={`s-${n.key}`}><rect x={x - bz.l} y={top} width={w} height={h} fill={C.caption} stroke={C.ink} strokeWidth={1.6} transform={`rotate(${n.n % 2 ? -0.6 : 0.5} ${x} ${top})`} /><text fontFamily="Patrick Hand" fontSize={16} fill={C.ink}>{lines.map((ln, i) => <tspan key={i} x={x - bz.l + 14} y={top + 24 + i * 21}>{ln}</tspan>)}</text></g>;
      })}
    </g>
  );
}

export function notesHeight(l: Layout, file: WireframeFile): number {
  if (!l.notes.length) return 0;
  const bz = bezelOf(l, file);
  const w = l.w + bz.l + bz.r;
  return 22 + l.notes.reduce((a, n) => a + wrap(`${n.n ? `${n.n}. ` : ""}${n.text}`, "hand", 16, w - 28).length * 21 + 28, 0);
}

export function bounds(file: WireframeFile, layouts: Record<string, Layout>, pos: Record<string, [number, number]>, below = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [id, l] of Object.entries(layouts)) {
    const [x, y] = pos[id];
    const bz = bezelOf(l, file);
    x0 = Math.min(x0, x - bz.l); y0 = Math.min(y0, y - bz.t - TITLE_H + 8);
    x1 = Math.max(x1, x + l.w + bz.r); y1 = Math.max(y1, y + l.h + bz.b + below + notesHeight(l, file));
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The whole flow: frames, screens, arrows, notes. Canvas units. */
export function FlowArt({ file, opts = {}, highlight }: { file: WireframeFile; opts?: ScreenOpts; highlight?: string }) {
  const layouts = layoutAll(file);
  const pos = positions(file, layouts);
  const arr = arrows(file, layouts, pos);
  const below = laneSpace(arr);
  return (
    <g>
      <defs><WobbleFilter id="wf-arrow-wob" region="page" scale={2.4} frequency={0.03} /></defs>
      {Object.entries(layouts).map(([id, l]) => {
        const [x, y] = pos[id];
        return <g key={id}>
          <Frame l={l} file={file} x={x} y={y} title={file.screens[id].title ?? id} sub={file.screens[id].title ? id : undefined} />
          <g transform={`translate(${x} ${y})`}><ScreenArt layout={l} opts={{ ...opts, uid: `wf-${id.replace(/[^a-z0-9]/gi, "_")}` }} /></g>
          <Notes l={l} file={file} x={x} y={y} below={below} />
        </g>;
      })}
      <g filter={opts.wobble === false ? undefined : "url(#wf-arrow-wob)"}>{arr.map((a) => <ArrowPath key={a.key} a={a} highlight={highlight === a.key} />)}</g>
    </g>
  );
}

/** The flow sheet as a standalone SVG with a title. */
export function flowSVG(file: WireframeFile, o: ScreenOpts & { fontCss?: string } = {}): string {
  const layouts = layoutAll(file);
  const pos = positions(file, layouts);
  const b = bounds(file, layouts, pos, laneSpace(arrows(file, layouts, pos)));
  const m = 56, head = 70;
  const W = Math.ceil(b.w + m * 2), H = Math.ceil(b.h + m * 2 + head);
  return renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`${b.x - m} ${b.y - m - head} ${W} ${H}`}>
      {o.fontCss ? <style>{o.fontCss}</style> : null}
      <rect x={b.x - m} y={b.y - m - head} width={W} height={H} fill={C.paper} />
      <text x={b.x} y={b.y - head + 4} fontFamily="Permanent Marker" fontSize={36} fill={C.ink}>{file.title}</text>
      <FlowArt file={file} opts={o} />
    </svg>,
  );
}

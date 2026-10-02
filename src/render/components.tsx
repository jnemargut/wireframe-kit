/**
 * How each component is drawn. Every drawing returns two layers: `shape` (outlines and fills, which get
 * the marker wobble) and `words` (text and icons, kept crisp so dense screens stay readable).
 */
import type { ReactNode } from "react";
import { C } from "../../vendor/sketch/tokens";
import { aspect, chipRects, FS, itemRects, itemsOf, lineH, listRows, typeOf, type Box } from "../layout";
import { fit, textWidth, wrap, type Face } from "../text";
import { itemText, type Item } from "../types";
import { guessIcon } from "../vocab";
import { hasIcon, Icon } from "./icons";

export interface Drawn { shape?: ReactNode; words?: ReactNode }
export interface DrawCtx {
  /** Resolve an image `src` to an href (already sketchified). */
  asset?: (src: string) => string | undefined;
  /** Unique prefix for clip-path ids. */
  uid: string;
}

const ink: string = C.ink, paper: string = C.paper, white: string = "#ffffff", soft: string = C.g1, mid: string = C.g2, line: string = C.g4, muted: string = C.g7, hint: string = C.g5, dark: string = C.g8;
const SW = 2.4, THIN = 1.7;
const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const fontOf = (face: Face) => (face === "title" ? "Permanent Marker" : "Patrick Hand");

function T({ x, y, text, size, face = "hand", fill = ink, anchor = "start", underline }: { x: number; y: number; text: string; size: number; face?: Face; fill?: string; anchor?: "start" | "middle" | "end"; underline?: boolean }) {
  return <text x={x} y={y} fontFamily={fontOf(face)} fontSize={size} fill={fill} textAnchor={anchor} textDecoration={underline ? "underline" : undefined}>{text}</text>;
}
/** Single line, vertically centered in (y, h). */
const mid1 = (y: number, h: number, size: number) => y + h / 2 + size * 0.34;

function Para({ x, y, w, text, size, face = "hand", fill = ink, align = "start", maxLines }: { x: number; y: number; w: number; text: string; size: number; face?: Face; fill?: string; align?: string; maxLines?: number }) {
  let ls = wrap(text, face, size, Math.max(10, w));
  if (maxLines && ls.length > maxLines) { ls = ls.slice(0, maxLines); ls[maxLines - 1] = fit(ls[maxLines - 1] + "…", face, size, w); }
  const lh = lineH(size, face);
  const ax = align === "center" ? x + w / 2 : align === "end" ? x + w : x;
  const anchor = align === "center" ? "middle" : align === "end" ? "end" : "start";
  const base = y + (lh - size) / 2 + size * 0.84;
  return <text fontFamily={fontOf(face)} fontSize={size} fill={fill} textAnchor={anchor}>{ls.map((l, i) => <tspan key={i} x={ax} y={base + i * lh}>{l}</tspan>)}</text>;
}

const R = (x: number, y: number, w: number, h: number, o: { rx?: number; fill?: string; stroke?: string; sw?: number; dash?: string } = {}) =>
  <rect key={`r${x},${y},${w},${h}`} x={x} y={y} width={Math.max(0, w)} height={Math.max(0, h)} rx={o.rx ?? 0} fill={o.fill ?? "none"} stroke={o.stroke === undefined ? ink : o.stroke} strokeWidth={o.sw ?? SW} strokeDasharray={o.dash} />;
const Ln = (x1: number, y1: number, x2: number, y2: number, stroke = ink, sw = SW) => <line key={`l${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;

/** A gentle hand-drawn squiggle standing in for a line of text. */
function squiggle(x: number, y: number, w: number) {
  let d = `M${x} ${y}`;
  for (let i = 0, px = x; px < x + w - 1; i++) { const step = Math.min(14, x + w - px); d += ` q${step / 2} ${i % 2 ? 2.2 : -2.2} ${step} 0`; px += step; }
  return <path d={d} fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />;
}

function crossBox(b: { x: number; y: number; w: number; h: number }, rx: number, uid: string, label?: string) {
  const id = `${uid}-x`;
  return {
    shape: <g>
      <clipPath id={id}><rect x={b.x} y={b.y} width={b.w} height={b.h} rx={rx} /></clipPath>
      {R(b.x, b.y, b.w, b.h, { rx, fill: soft, stroke: "none" })}
      <g clipPath={`url(#${id})`}>{Ln(b.x, b.y, b.x + b.w, b.y + b.h, line, THIN)}{Ln(b.x + b.w, b.y, b.x, b.y + b.h, line, THIN)}</g>
      {R(b.x, b.y, b.w, b.h, { rx })}
    </g>,
    words: label && b.h > 26 && b.w > 50 ? (() => {
      const t = fit(label, "hand", 15, b.w - 24), tw = textWidth(t, "hand", 15);
      return <g>{R(b.x + b.w / 2 - tw / 2 - 8, b.y + b.h / 2 - 12, tw + 16, 24, { rx: 12, fill: paper, stroke: "none" })}<T x={b.x + b.w / 2} y={b.y + b.h / 2 + 5} text={t} size={15} fill={muted} anchor="middle" /></g>;
    })() : undefined,
  };
}

function iconFor(it: Item): string {
  const o = typeof it === "string" ? {} : it;
  return hasIcon(o.icon) ? (o.icon as string) : guessIcon(itemText(it));
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`); }
  return pts.join(" ");
}

export function draw(b: Box, ctx: DrawCtx): Drawn {
  const n = b.node, { x, y, w, h } = b;
  const text = s(n.text);
  const uid = `${ctx.uid}-${b.key.replace(/[^a-z0-9]/gi, "_") || "root"}`;
  switch (typeOf(n)) {
    // ---------- text ----------
    case "title": return { words: <Para x={x} y={y} w={w} text={text} size={FS.title} face="title" align={s(n.align)} /> };
    case "heading": return { words: <Para x={x} y={y} w={w} text={text} size={FS.heading} face="title" align={s(n.align)} /> };
    case "text": {
      const size = FS.text[s(n.size)] ?? FS.text.md;
      if (text) return { words: <Para x={x} y={y} w={w} text={text} size={size} fill={n.muted ? muted : ink} align={s(n.align)} /> };
      const k = Math.max(1, Math.round(h / lineH(size)));
      return { shape: <g>{Array.from({ length: k }, (_, i) => squiggle(x + 2, y + lineH(size) * (i + 0.55), (w - 4) * (i === k - 1 && k > 1 ? 0.55 : 0.96 - (i % 3) * 0.06)))}</g> };
    }
    case "label": return { words: <Para x={x} y={y} w={w} text={text} size={FS.label} fill={muted} align={s(n.align)} /> };
    case "link": {
      const ls = wrap(text, "hand", FS.link, w), lh = lineH(FS.link);
      return { words: <g><Para x={x} y={y} w={w} text={text} size={FS.link} />{ls.map((l, i) => Ln(x, y + lh * (i + 1) - 2, x + textWidth(l, "hand", FS.link), y + lh * (i + 1) - 2, ink, 1.5))}</g> };
    }
    case "badge": return {
      shape: R(x, y, w, h, { rx: h / 2, fill: n.filled ? ink : soft, sw: THIN }),
      words: <T x={x + w / 2} y={mid1(y, h, 14)} text={fit(text, "hand", 14, w - 12)} size={14} anchor="middle" fill={n.filled ? paper : ink} />,
    };

    // ---------- controls ----------
    case "button": {
      const v = s(n.variant) || "secondary";
      const size = FS.button[s(n.size)] ?? 18;
      const fg = v === "primary" ? paper : ink;
      const label = fit(text, "hand", size, w - (n.icon ? 46 : 16));
      const tw = textWidth(label, "hand", size) + (n.icon ? 28 : 0);
      const tx = x + (w - tw) / 2;
      const words = <g>
        {n.icon ? <Icon name={s(n.icon)} x={tx} y={y + h / 2 - 11} size={22} color={fg} /> : null}
        <T x={tx + (n.icon ? 28 : 0)} y={mid1(y, h, size)} text={label} size={size} fill={fg} />
        {v === "text" ? Ln(tx, y + h / 2 + size * 0.5, tx + tw, y + h / 2 + size * 0.5, ink, 1.4) : null}
      </g>;
      if (v === "text") return { words };
      const rx = Math.min(12, h / 2);
      return { shape: R(x, y, w, h, { rx, fill: v === "primary" ? ink : v === "outline" ? white : mid }), words };
    }
    case "icon-button": {
      const v = s(n.variant) || "plain";
      const r = Math.min(w, h) / 2;
      const cx = x + w / 2, cy = y + h / 2;
      return {
        shape: v === "plain" ? undefined : <circle cx={cx} cy={cy} r={r - 1} fill={v === "filled" ? mid : white} stroke={ink} strokeWidth={THIN} />,
        words: <g>
          <Icon name={s(n.icon)} x={cx - 12} y={cy - 12} />
          {n.badge ? <g><circle cx={cx + 11} cy={cy - 11} r={9} fill={ink} /><T x={cx + 11} y={cy - 7} text={s(n.badge).slice(0, 2)} size={12} fill={paper} anchor="middle" /></g> : null}
        </g>,
      };
    }
    case "input": case "select": case "textarea": {
      const lab = n.label ? 26 : 0;
      const isArea = typeOf(n) === "textarea";
      const bh = isArea ? h - lab : 46;
      const by = y + lab;
      const val = s(n.value), ph = s(n.hint);
      const ix = n.icon ? x + 44 : x + 14;
      const tw = w - (ix - x) - (typeOf(n) === "select" ? 40 : 14);
      return {
        shape: R(x, by, w, bh, { rx: 8, fill: white, sw: n.error ? 3 : SW }),
        words: <g>
          {n.label ? <T x={x + 2} y={y + 18} text={fit(s(n.label), "hand", FS.label, w)} size={FS.label} fill={dark} /> : null}
          {n.icon ? <Icon name={s(n.icon)} x={x + 12} y={by + bh / 2 - 12} color={muted} /> : null}
          {isArea
            ? <Para x={ix} y={by + 10} w={tw} text={val || ph} size={16} fill={val ? ink : hint} maxLines={Math.max(1, Math.floor((bh - 16) / 21))} />
            : <T x={ix} y={mid1(by, bh, 17)} text={fit(val || ph, "hand", 17, tw)} size={17} fill={val ? ink : hint} />}
          {typeOf(n) === "select" ? <Icon name="chevron-down" x={x + w - 34} y={by + bh / 2 - 12} /> : null}
          {n.error ? <g><Icon name="alert" x={x} y={by + bh + 3} size={16} /><T x={x + 22} y={by + bh + 17} text={fit(s(n.error), "hand", 15, w - 24)} size={15} /></g> : null}
        </g>,
      };
    }
    case "search": return {
      shape: R(x, y, w, h, { rx: h / 2, fill: soft }),
      words: <g><Icon name="search" x={x + 14} y={y + h / 2 - 12} color={muted} /><T x={x + 46} y={mid1(y, h, 17)} text={fit(s(n.value) || s(n.hint) || "Search", "hand", 17, w - 60)} size={17} fill={n.value ? ink : hint} /></g>,
    };
    case "checkbox": return {
      shape: <g>{R(x + 1, y + 3, 22, 22, { rx: 5, fill: n.checked ? mid : white, sw: THIN + 0.3 })}{n.checked ? <path d={`M${x + 6} ${y + 14} l4 4.5 l9 -10`} fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /> : null}</g>,
      words: <Para x={x + 34} y={y + Math.max(0, (28 - lineH(FS.item)) / 2)} w={w - 34} text={text} size={FS.item} />,
    };
    case "radio": {
      const its = itemsOf(n);
      return {
        shape: <g>{its.map((it, i) => <g key={i}><circle cx={x + 11} cy={y + i * 36 + 18} r={10} fill={white} stroke={ink} strokeWidth={THIN + 0.3} />{itemText(it) === s(n.value) ? <circle cx={x + 11} cy={y + i * 36 + 18} r={5} fill={ink} /> : null}</g>)}</g>,
        words: <g>{its.map((it, i) => <T key={i} x={x + 32} y={mid1(y + i * 36, 36, FS.item)} text={fit(itemText(it), "hand", FS.item, w - 34)} size={FS.item} />)}</g>,
      };
    }
    case "toggle": {
      const tx = x + w - 52, ty = y + h / 2 - 15;
      return {
        shape: <g>{R(tx, ty, 52, 30, { rx: 15, fill: n.on ? ink : soft, sw: THIN + 0.3 })}<circle cx={n.on ? tx + 37 : tx + 15} cy={ty + 15} r={10.5} fill={paper} stroke={ink} strokeWidth={THIN} /></g>,
        words: <Para x={x} y={y + Math.max(0, (32 - lineH(FS.item)) / 2)} w={w - 64} text={text} size={FS.item} />,
      };
    }
    case "slider": {
      const lab = n.label ? 26 : 0;
      const v = Math.max(0, Math.min(1, typeof n.value === "number" ? n.value : 0.5));
      const cy = y + lab + 12, kx = x + 12 + (w - 24) * v;
      return {
        shape: <g>{Ln(x + 12, cy, x + w - 12, cy, line, 4)}{Ln(x + 12, cy, kx, cy, ink, 4)}<circle cx={kx} cy={cy} r={11} fill={paper} stroke={ink} strokeWidth={THIN + 0.3} /></g>,
        words: n.label ? <T x={x + 2} y={y + 18} text={s(n.label)} size={FS.label} fill={dark} /> : undefined,
      };
    }
    case "stepper": return {
      shape: <g>{R(x, y, w, h, { rx: h / 2, fill: white, sw: THIN + 0.3 })}{Ln(x + w / 3, y + 7, x + w / 3, y + h - 7, line, THIN)}{Ln(x + (2 * w) / 3, y + 7, x + (2 * w) / 3, y + h - 7, line, THIN)}</g>,
      words: <g><Icon name="minus" x={x + w / 6 - 10} y={y + h / 2 - 10} size={20} /><T x={x + w / 2} y={mid1(y, h, 18)} text={String(typeof n.value === "number" ? n.value : 1)} size={18} anchor="middle" /><Icon name="plus" x={x + (5 * w) / 6 - 10} y={y + h / 2 - 10} size={20} /></g>,
    };
    case "segmented": {
      const rs = itemRects(n, w, h), its = itemsOf(n);
      const ai = its.findIndex((it) => itemText(it) === s(n.active));
      return {
        shape: <g>{R(x, y, w, h, { rx: 10, fill: soft, sw: THIN + 0.3 })}{ai >= 0 && rs[ai] ? R(x + rs[ai].x + 3, y + 3, rs[ai].w - 6, h - 6, { rx: 8, fill: paper, sw: THIN }) : null}</g>,
        words: <g>{its.map((it, i) => <T key={i} x={x + rs[i].x + rs[i].w / 2} y={mid1(y, h, 16)} text={fit(itemText(it), "hand", 16, rs[i].w - 10)} size={16} anchor="middle" fill={i === ai ? ink : muted} />)}</g>,
      };
    }
    case "chips": {
      const rs = chipRects(n, w), its = itemsOf(n);
      const act = new Set(Array.isArray(n.active) ? n.active.map(String) : n.active ? [String(n.active)] : []);
      return {
        shape: <g>{rs.map((r, i) => <g key={i}>{R(x + r.x, y + r.y, r.w, r.h, { rx: 17, fill: act.has(itemText(its[i])) ? ink : white, sw: THIN })}</g>)}</g>,
        words: <g>{rs.map((r, i) => <T key={i} x={x + r.x + r.w / 2} y={mid1(y + r.y, r.h, 15)} text={fit(itemText(its[i]), "hand", 15, r.w - 16)} size={15} anchor="middle" fill={act.has(itemText(its[i])) ? paper : ink} />)}</g>,
      };
    }

    // ---------- navigation ----------
    case "navbar": {
      const acts = itemsOf({ items: n.actions } as never);
      const rs = itemRects(n, w, h);
      const title = s(n.title);
      return {
        shape: Ln(x, y + h, x + w, y + h, line, THIN),
        words: <g>
          {n.back ? <Icon name="back" x={x + 14} y={y + 16} /> : null}
          {title && !n.large ? <T x={x + w / 2} y={mid1(y, 56, 19)} text={fit(title, "title", 19, w - 120)} size={19} face="title" anchor="middle" /> : null}
          {title && n.large ? <T x={x + 16} y={y + 92} text={fit(title, "title", 30, w - 32)} size={30} face="title" /> : null}
          {acts.map((a, i) => <Icon key={i} name={typeof a === "string" ? a : s(a.icon)} x={x + rs[i].x + 8} y={y + rs[i].y + 8} />)}
        </g>,
      };
    }
    case "tabbar": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      return {
        shape: <g>{R(x, y, w, h, { fill: paper, stroke: "none" })}{Ln(x, y, x + w, y, line, THIN)}</g>,
        words: <g>{its.map((it, i) => {
          const on = itemText(it) === s(n.active);
          const cx = x + rs[i].x + rs[i].w / 2;
          return <g key={i}><Icon name={iconFor(it)} x={cx - 13} y={y + 9} size={26} color={on ? ink : hint} /><T x={cx} y={y + 52} text={fit(itemText(it), "hand", 13, rs[i].w - 6)} size={13} anchor="middle" fill={on ? ink : muted} /></g>;
        })}</g>,
      };
    }
    case "tabs": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      return {
        shape: <g>{Ln(x, y + h, x + w, y + h, line, THIN)}{its.map((it, i) => itemText(it) === s(n.active) ? <g key={i}>{Ln(x + rs[i].x + 10, y + h - 1, x + rs[i].x + rs[i].w - 10, y + h - 1, ink, 3.5)}</g> : null)}</g>,
        words: <g>{its.map((it, i) => <T key={i} x={x + rs[i].x + rs[i].w / 2} y={mid1(y, h, 16)} text={fit(itemText(it), "hand", 16, rs[i].w - 8)} size={16} anchor="middle" fill={itemText(it) === s(n.active) ? ink : muted} />)}</g>,
      };
    }
    case "breadcrumbs": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      return { words: <g>{its.map((it, i) => <g key={i}><T x={x + rs[i].x} y={mid1(y, h, 15)} text={itemText(it)} size={15} fill={i === its.length - 1 ? ink : muted} underline={i < its.length - 1} />{i < its.length - 1 ? <T x={x + rs[i].x + rs[i].w + 11} y={mid1(y, h, 15)} text="›" size={15} fill={hint} anchor="middle" /> : null}</g>)}</g> };
    }
    case "pagination": {
      const pages = typeof n.pages === "number" ? n.pages : 5, cur = typeof n.current === "number" ? n.current : 1;
      const cells = ["‹", ...Array.from({ length: pages }, (_, i) => String(i + 1)), "›"];
      return {
        shape: <g>{cells.map((c, i) => R(x + i * 42, y, 36, 36, { rx: 8, fill: c === String(cur) ? ink : white, sw: THIN }))}</g>,
        words: <g>{cells.map((c, i) => <T key={i} x={x + i * 42 + 18} y={mid1(y, 36, 16)} text={c} size={16} anchor="middle" fill={c === String(cur) ? paper : ink} />)}</g>,
      };
    }
    case "dots": {
      const count = typeof n.count === "number" ? n.count : 3, act = typeof n.active === "number" ? n.active : 1;
      return { shape: <g>{Array.from({ length: count }, (_, i) => <circle key={i} cx={x + 5 + i * 16} cy={y + h / 2} r={4.5} fill={i + 1 === act ? ink : "none"} stroke={i + 1 === act ? ink : hint} strokeWidth={THIN} />)}</g> };
    }
    case "sidebar": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      const ai = its.findIndex((it) => itemText(it) === s(n.active));
      return {
        shape: <g>{R(x, y, w, h, { fill: soft, stroke: "none" })}{Ln(x + w, y, x + w, y + h, line, THIN)}{ai >= 0 ? R(x + rs[ai].x, y + rs[ai].y, rs[ai].w, rs[ai].h, { rx: 8, fill: paper, sw: THIN }) : null}</g>,
        words: <g>
          {n.title ? <T x={x + 20} y={y + 40} text={fit(s(n.title), "title", 20, w - 40)} size={20} face="title" /> : null}
          {its.map((it, i) => <g key={i}><Icon name={iconFor(it)} x={x + rs[i].x + 12} y={y + rs[i].y + 8} color={i === ai ? ink : muted} /><T x={x + rs[i].x + 46} y={mid1(y + rs[i].y, rs[i].h, 17)} text={fit(itemText(it), "hand", 17, rs[i].w - 56)} size={17} fill={i === ai ? ink : dark} /></g>)}
        </g>,
      };
    }
    case "topnav": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      const bw = n.button ? textWidth(s(n.button), "hand", 16) + 36 : 0;
      return {
        shape: <g>{Ln(x, y + h, x + w, y + h, line, THIN)}{n.button ? R(x + w - 24 - bw, y + 12, bw, h - 24, { rx: 10, fill: ink }) : null}{its.map((it, i) => itemText(it) === s(n.active) ? <g key={i}>{Ln(x + rs[i].x + 6, y + h - 14, x + rs[i].x + rs[i].w - 6, y + h - 14, ink, 2.6)}</g> : null)}</g>,
        words: <g>
          {n.title ? <T x={x + 24} y={mid1(y, h, 22)} text={s(n.title)} size={22} face="title" /> : null}
          {its.map((it, i) => <T key={i} x={x + rs[i].x + rs[i].w / 2} y={mid1(y, h, 16)} text={itemText(it)} size={16} anchor="middle" fill={itemText(it) === s(n.active) ? ink : dark} />)}
          {n.button ? <T x={x + w - 24 - bw / 2} y={mid1(y, h, 16)} text={s(n.button)} size={16} anchor="middle" fill={paper} /> : null}
        </g>,
      };
    }

    // ---------- content ----------
    case "image": {
      const rx = n.round ? (Math.abs(w - h) < 2 ? w / 2 : 18) : 8;
      const href = n.src && ctx.asset ? ctx.asset(s(n.src)) : undefined;
      if (href) {
        const id = `${uid}-img`;
        return { shape: <g><clipPath id={id}><rect x={x} y={y} width={w} height={h} rx={rx} /></clipPath><image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />{R(x, y, w, h, { rx })}</g> };
      }
      return crossBox(b, rx, uid, s(n.label));
    }
    case "avatar": {
      const r = Math.min(w, h) / 2, cx = x + w / 2, cy = y + h / 2, id = `${uid}-av`;
      return {
        shape: <g><circle cx={cx} cy={cy} r={r - 1} fill={mid} stroke={ink} strokeWidth={THIN + 0.3} />{!text ? <g><clipPath id={id}><circle cx={cx} cy={cy} r={r - 1} /></clipPath><g clipPath={`url(#${id})`} fill={line}><circle cx={cx} cy={cy - r * 0.18} r={r * 0.36} /><ellipse cx={cx} cy={cy + r * 0.82} rx={r * 0.7} ry={r * 0.55} /></g></g> : null}</g>,
        words: text ? <T x={cx} y={cy + r * 0.28} text={text.slice(0, 2).toUpperCase()} size={r * 0.8} anchor="middle" /> : undefined,
      };
    }
    case "icon": return { words: <Icon name={s(n.icon)} x={x + (w - Math.min(w, h)) / 2} y={y} size={Math.min(w, h)} /> };
    case "list": {
      const rows = listRows(n, w), cards = !!n.cards, dividers = n.dividers !== false && !cards;
      return {
        shape: <g>{rows.map((r, i) => {
          const o = typeof r.item === "string" ? {} : r.item;
          return <g key={i}>
            {cards ? R(x, y + r.y, w, r.h, { rx: 10, fill: white, sw: THIN }) : null}
            {dividers && i < rows.length - 1 ? Ln(x, y + r.y + r.h, x + w, y + r.y + r.h, mid, THIN) : null}
            {o.image ? crossBox({ x: x + (cards ? 10 : 0), y: y + r.y + 10, w: 56, h: 56 }, 8, `${uid}-${i}`).shape : null}
          </g>;
        })}</g>,
        words: <g>{rows.map((r, i) => {
          const o = typeof r.item === "string" ? { title: r.item } : r.item;
          const inset = cards ? 12 : 0;
          const left = x + inset + (o.image ? 70 : hasIcon(o.icon) ? 38 : 0);
          const meta = s(o.meta);
          const chev = !!(n.chevrons || o.goes);
          const right = x + w - inset - (chev ? 26 : 0);
          const metaW = meta ? textWidth(meta, "hand", 15) + 10 : 0;
          const title = itemText(o as Item);
          const ty = o.subtitle ? y + r.y + r.h / 2 - 4 : mid1(y + r.y, r.h, FS.item);
          return <g key={i}>
            {hasIcon(o.icon) ? <Icon name={s(o.icon)} x={x + inset + 2} y={y + r.y + r.h / 2 - 12} /> : null}
            <T x={left} y={ty} text={fit(title, "hand", FS.item, right - left - metaW)} size={FS.item} />
            {o.subtitle ? <T x={left} y={ty + 20} text={fit(s(o.subtitle), "hand", 14, right - left - metaW)} size={14} fill={muted} /> : null}
            {meta ? <T x={right} y={mid1(y + r.y, r.h, 15)} text={meta} size={15} fill={muted} anchor="end" /> : null}
            {chev ? <Icon name="chevron-right" x={x + w - inset - 22} y={y + r.y + r.h / 2 - 10} size={20} color={muted} /> : null}
          </g>;
        })}</g>,
      };
    }
    case "table": {
      const cols = Array.isArray(n.columns) ? n.columns.map(String) : ["Column", "Column"];
      const rows = Array.isArray(n.rows) ? (n.rows as unknown[][]) : [];
      const cw = w / Math.max(1, cols.length);
      return {
        shape: <g>{R(x, y, w, 40, { rx: 0, fill: soft, stroke: "none" })}{rows.map((_, i) => Ln(x, y + 40 + (i + 1) * 40, x + w, y + 40 + (i + 1) * 40, mid, THIN))}{Ln(x, y + 40, x + w, y + 40, ink, THIN)}{R(x, y, w, h, { rx: 6, sw: THIN + 0.3 })}</g>,
        words: <g>
          {cols.map((c, j) => <T key={j} x={x + j * cw + 12} y={mid1(y, 40, 15)} text={fit(c, "hand", 15, cw - 18)} size={15} fill={dark} />)}
          {rows.map((r, i) => (Array.isArray(r) ? r : []).slice(0, cols.length).map((cell, j) => <T key={`${i}-${j}`} x={x + j * cw + 12} y={mid1(y + 40 + i * 40, 40, 16)} text={fit(String(cell), "hand", 16, cw - 18)} size={16} />))}
        </g>,
      };
    }
    case "chart": {
      const kind = s(n.kind) || "bar";
      const ch = h - (n.label ? 24 : 0);
      const lab = n.label ? <T x={x + w / 2} y={y + h - 6} text={fit(s(n.label), "hand", 15, w)} size={15} fill={muted} anchor="middle" /> : undefined;
      if (kind === "pie" || kind === "donut") {
        const r = Math.min(w, ch) / 2 - 6, cx = x + w / 2, cy = y + ch / 2;
        const ang = [0.0, 0.38, 0.66, 0.84].map((f) => -Math.PI / 2 + f * Math.PI * 2);
        return {
          shape: <g><circle cx={cx} cy={cy} r={r} fill={soft} stroke={ink} strokeWidth={SW} />
            <path d={`M${cx} ${cy} L${cx + r * Math.cos(ang[0])} ${cy + r * Math.sin(ang[0])} A${r} ${r} 0 0 1 ${cx + r * Math.cos(ang[1])} ${cy + r * Math.sin(ang[1])} Z`} fill={mid} stroke="none" />
            {ang.map((a, i) => Ln(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), ink, THIN + 0.2))}
            {kind === "donut" ? <circle cx={cx} cy={cy} r={r * 0.5} fill={paper} stroke={ink} strokeWidth={THIN + 0.3} /> : null}</g>,
          words: lab,
        };
      }
      const bx = x + 8, by = y + ch - 8, bw = w - 16, bh = ch - 16;
      const vals = [0.45, 0.7, 0.55, 0.9, 0.62, 0.8];
      if (kind === "line") {
        const pts = vals.map((v, i) => `${bx + 12 + (i * (bw - 24)) / (vals.length - 1)},${by - v * bh * 0.85}`);
        return {
          shape: <g>{Ln(bx, by, bx + bw, by, ink, THIN + 0.3)}{Ln(bx, by, bx, by - bh, ink, THIN + 0.3)}<polyline points={pts.join(" ")} fill="none" stroke={ink} strokeWidth={SW} strokeLinejoin="round" />{pts.map((p, i) => { const [px, py] = p.split(",").map(Number); return <circle key={i} cx={px} cy={py} r={4} fill={paper} stroke={ink} strokeWidth={THIN} />; })}</g>,
          words: lab,
        };
      }
      const gap = 10, barW = (bw - 12 - gap * vals.length) / vals.length;
      return {
        shape: <g>{Ln(bx, by, bx + bw, by, ink, THIN + 0.3)}{vals.map((v, i) => R(bx + 10 + i * (barW + gap), by - v * bh * 0.9, barW, v * bh * 0.9, { rx: 3, fill: i === 3 ? C.g5 : mid, sw: THIN }))}</g>,
        words: lab,
      };
    }
    case "map": {
      const mh = h - (n.label ? 24 : 0), id = `${uid}-map`;
      return {
        shape: <g>
          <clipPath id={id}><rect x={x} y={y} width={w} height={mh} rx={8} /></clipPath>
          {R(x, y, w, mh, { rx: 8, fill: soft, stroke: "none" })}
          <g clipPath={`url(#${id})`} fill="none" stroke={paper} strokeWidth={9} strokeLinecap="round">
            <path d={`M${x - 10} ${y + mh * 0.35} C${x + w * 0.3} ${y + mh * 0.25}, ${x + w * 0.6} ${y + mh * 0.6}, ${x + w + 10} ${y + mh * 0.5}`} />
            <path d={`M${x + w * 0.35} ${y - 10} C${x + w * 0.4} ${y + mh * 0.4}, ${x + w * 0.3} ${y + mh * 0.7}, ${x + w * 0.45} ${y + mh + 10}`} />
            <path d={`M${x + w * 0.72} ${y - 10} L${x + w * 0.8} ${y + mh + 10}`} strokeWidth={6} />
          </g>
          {R(x, y, w, mh, { rx: 8 })}
        </g>,
        words: <g><g transform={`translate(${x + w / 2 - 18} ${y + mh / 2 - 34})`}><path d="M18 34s-13-12.5-13-21a13 13 0 0 1 26 0c0 8.5-13 21-13 21z" fill={ink} /><circle cx={18} cy={13} r={5} fill={paper} /></g>{n.label ? <T x={x + w / 2} y={y + h - 6} text={fit(s(n.label), "hand", 15, w)} size={15} fill={muted} anchor="middle" /> : null}</g>,
      };
    }
    case "video": {
      const vh = h - (n.label ? 24 : 0), cx = x + w / 2, cy = y + vh / 2;
      return {
        shape: <g>{R(x, y, w, vh, { rx: 8, fill: mid })}<circle cx={cx} cy={cy} r={24} fill={paper} stroke={ink} strokeWidth={SW} /><path d={`M${cx - 7} ${cy - 11} L${cx + 11} ${cy} L${cx - 7} ${cy + 11} Z`} fill={ink} />{Ln(x + 14, y + vh - 16, x + w - 14, y + vh - 16, paper, 4)}{Ln(x + 14, y + vh - 16, x + w * 0.35, y + vh - 16, ink, 4)}</g>,
        words: n.label ? <T x={x + w / 2} y={y + h - 6} text={fit(s(n.label), "hand", 15, w)} size={15} fill={muted} anchor="middle" /> : undefined,
      };
    }
    case "rating": {
      const v = typeof n.value === "number" ? n.value : 4;
      return { shape: <g>{Array.from({ length: 5 }, (_, i) => <polygon key={i} points={star(x + 11 + i * 26, y + 11, 11)} fill={i < Math.round(v) ? ink : "none"} stroke={ink} strokeWidth={THIN} strokeLinejoin="round" />)}</g> };
    }
    case "divider": {
      if (!text) return { shape: Ln(x, y + h / 2, x + w, y + h / 2, line, THIN) };
      const tw = textWidth(text, "hand", 15) + 20;
      return { shape: <g>{Ln(x, y + h / 2, x + (w - tw) / 2, y + h / 2, line, THIN)}{Ln(x + (w + tw) / 2, y + h / 2, x + w, y + h / 2, line, THIN)}</g>, words: <T x={x + w / 2} y={mid1(y, h, 15)} text={text} size={15} fill={muted} anchor="middle" /> };
    }
    case "spacer": return {};
    case "keyboard": {
      const rowsK = [10, 9, 7];
      const kh = 42, gap = 6, kw = (w - 12 - gap * 9) / 10;
      const shapes: ReactNode[] = [];
      rowsK.forEach((count, r) => {
        const rw = count * kw + (count - 1) * gap, sx = x + (w - rw) / 2;
        for (let i = 0; i < count; i++) shapes.push(<g key={`${r}-${i}`}>{R(sx + i * (kw + gap), y + 10 + r * (kh + 10), kw, kh, { rx: 6, fill: paper, stroke: hint, sw: 1.4 })}</g>);
      });
      shapes.push(<g key="space">{R(x + w * 0.25, y + 10 + 3 * (kh + 10), w * 0.5, kh, { rx: 6, fill: paper, stroke: hint, sw: 1.4 })}</g>);
      return { shape: <g>{R(x, y, w, h, { fill: soft, stroke: "none" })}{shapes}</g>, words: <T x={x + w / 2} y={y + 10 + 3 * (kh + 10) + 27} text="space" size={15} fill={muted} anchor="middle" /> };
    }

    // ---------- feedback ----------
    case "alert": {
      const kind = s(n.kind) || "info";
      const ic = kind === "success" ? "check" : kind === "warning" || kind === "error" ? "alert" : "info";
      return {
        shape: R(x, y, w, h, { rx: 10, fill: kind === "error" ? mid : soft, sw: kind === "error" ? 3 : SW }),
        words: <g>
          <Icon name={ic} x={x + 14} y={y + 12} />
          {n.title ? <T x={x + 46} y={y + 29} text={fit(s(n.title), "hand", 17, w - 58)} size={17} /> : null}
          <Para x={x + 46} y={y + 12 + (n.title ? 22 : 0)} w={w - 58} text={text} size={16} fill={n.title ? dark : ink} />
        </g>,
      };
    }
    case "toast": {
      const aw = n.action ? textWidth(s(n.action), "hand", 16) : 0;
      return {
        shape: R(x, y, w, h, { rx: 12, fill: ink }),
        words: <g><T x={x + 18} y={mid1(y, h, 16)} text={fit(text, "hand", 16, w - 36 - (aw ? aw + 20 : 0))} size={16} fill={paper} />{n.action ? <T x={x + w - 18} y={mid1(y, h, 16)} text={s(n.action)} size={16} fill={paper} anchor="end" underline /> : null}</g>,
      };
    }
    case "progress": {
      const lab = n.label ? 26 : 0;
      const v = Math.max(0, Math.min(1, typeof n.value === "number" ? n.value : 0.4));
      return {
        shape: <g>{R(x, y + lab, w, 12, { rx: 6, fill: white, sw: THIN + 0.3 })}{v > 0 ? R(x, y + lab, Math.max(12, w * v), 12, { rx: 6, fill: C.g5, sw: THIN + 0.3 }) : null}</g>,
        words: n.label ? <T x={x + 2} y={y + 18} text={fit(s(n.label), "hand", FS.label, w)} size={FS.label} fill={dark} /> : undefined,
      };
    }
    case "steps": {
      const its = Array.isArray(n.items) ? n.items.map(String) : ["Step", "Step", "Step"];
      const cur = typeof n.current === "number" ? n.current : 1;
      const k = its.length, sx = (i: number) => x + (k === 1 ? w / 2 : 16 + (i * (w - 32)) / (k - 1));
      return {
        shape: <g>
          {its.slice(1).map((_, i) => Ln(sx(i) + 15, y + 14, sx(i + 1) - 15, y + 14, i + 1 < cur ? ink : line, i + 1 < cur ? SW : THIN))}
          {its.map((_, i) => <circle key={i} cx={sx(i)} cy={y + 14} r={13} fill={i + 1 === cur ? ink : i + 1 < cur ? mid : white} stroke={ink} strokeWidth={THIN + 0.3} />)}
        </g>,
        words: <g>{its.map((t, i) => <g key={i}>
          {i + 1 < cur ? <Icon name="check" x={sx(i) - 9} y={y + 5} size={18} /> : <T x={sx(i)} y={y + 19} text={String(i + 1)} size={15} anchor="middle" fill={i + 1 === cur ? paper : ink} />}
          <T x={sx(i)} y={y + 50} text={fit(t, "hand", 14, (w / k) - 4)} size={14} anchor={k > 1 && i === 0 ? "start" : k > 1 && i === k - 1 ? "end" : "middle"} fill={i + 1 === cur ? ink : muted} />
        </g>)}</g>,
      };
    }
    case "spinner": {
      const cx = x + 14, cy = y + h / 2;
      return {
        shape: <g><circle cx={cx} cy={cy} r={11} fill="none" stroke={mid} strokeWidth={3.5} /><path d={`M${cx} ${cy - 11} A11 11 0 0 1 ${cx + 11} ${cy}`} fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" /></g>,
        words: n.label ? <T x={x + 38} y={mid1(y, h, FS.label)} text={s(n.label)} size={FS.label} fill={muted} /> : undefined,
      };
    }
    case "sketch": {
      const label = n.type && n.type !== "sketch" ? `${n.type}?` : s(n.label);
      return {
        shape: R(x, y, w, h, { rx: 8, stroke: C.g5, sw: 2, dash: "8 6" }),
        words: label ? <Para x={x + 10} y={y + h / 2 - lineH(15) * Math.min(3, wrap(label, "hand", 15, w - 20).length) / 2} w={w - 20} text={label} size={15} fill={muted} align="center" maxLines={3} /> : undefined,
      };
    }

    // ---------- containers ----------
    case "card": return { shape: n.flat ? R(x, y, w, h, { rx: 12, fill: soft, stroke: "none" }) : R(x, y, w, h, { rx: 12, fill: white }) };
    case "section": return {
      words: <g>
        {n.title ? <T x={x} y={y + 21} text={fit(s(n.title), "title", 17, w - (n.action ? textWidth(s(n.action), "hand", 15) + 16 : 0))} size={17} face="title" /> : null}
        {n.action ? <T x={x + w} y={y + 21} text={s(n.action)} size={15} fill={muted} anchor="end" underline /> : null}
      </g>,
    };
    case "sheet": return {
      shape: <g><path d={`M${x} ${y + h + 4} V${y + 20} Q${x} ${y} ${x + 20} ${y} H${x + w - 20} Q${x + w} ${y} ${x + w} ${y + 20} V${y + h + 4}`} fill={paper} stroke={ink} strokeWidth={SW} />{R(x + w / 2 - 22, y + 9, 44, 5, { rx: 2.5, fill: line, stroke: "none" })}</g>,
      words: n.title ? <T x={x + 20} y={y + 46} text={fit(s(n.title), "title", 20, w - 40)} size={20} face="title" /> : undefined,
    };
    case "dialog": return {
      shape: R(x, y, w, h, { rx: 16, fill: paper }),
      words: n.title ? <T x={x + 20} y={y + 42} text={fit(s(n.title), "title", 20, w - 40)} size={20} face="title" /> : undefined,
    };
  }
  return {};
}

/** Phone status bar: time, signal, wifi, battery. */
export function StatusBar({ w, phone }: { w: number; phone: boolean }) {
  const h = phone ? 47 : 24, cy = phone ? 27 : 13;
  return (
    <g>
      <T x={phone ? 34 : 16} y={cy + 6} text="9:41" size={phone ? 17 : 14} />
      <g transform={`translate(${w - (phone ? 92 : 80)} ${cy - 6})`} fill={ink}>
        {[0, 1, 2, 3].map((i) => <rect key={i} x={i * 5} y={9 - i * 3} width={3.4} height={3 + i * 3} rx={1} />)}
        <path d="M27 5.5a9 9 0 0 1 13 0M30 8.5a5 5 0 0 1 7 0" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" /><circle cx={33.5} cy={11} r={1.6} />
        <rect x={46} y={1} width={24} height={12} rx={3.5} fill="none" stroke={ink} strokeWidth={1.4} /><rect x={48.5} y={3.5} width={15} height={7} rx={1.5} /><rect x={71} y={5} width={1.8} height={4} rx={0.9} />
      </g>
      <rect x={0} y={h - 0.5} width={0} height={0} />
    </g>
  );
}

export const HomeIndicator = ({ w, h }: { w: number; h: number }) => <rect x={w / 2 - 67} y={h - 13} width={134} height={5} rx={2.5} fill={ink} />;

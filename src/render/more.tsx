/**
 * The rest of the catalog (overlays, browser and window frames, calendars, trees, stats...) and how any
 * component shows its interaction `state`. Open dropdowns and calendars draw on the `pop` layer, over the
 * whole screen, the way a real one covers whatever is below it.
 */
import type { ReactNode } from "react";
import { C } from "../../vendor/sketch/tokens";
import { accordionRows, BROWSER_BAR, CAL_H, detailRows, isIconItem, itemRects, itemsOf, lineH, MENU_PAD, menuH, menuRows, timelineRows, treeRows, typeOf, WINDOW_BAR, type Box } from "../layout";
import { fit, textWidth, wrap } from "../text";
import { itemText, itemTitle, type Item } from "../types";
import { Icon } from "./icons";
import { crossBox, dark, hint, iconFor, ink, line, Ln, mid, mid1, muted, paper, Para, R, s, soft, squiggle, SW, T, THIN, white, type DrawCtx, type Drawn } from "./prims";

const obj = (it: Item) => (typeof it === "string" ? { text: it } : it);
const LABELLED = new Set(["input", "select", "textarea", "date-picker", "tag-input"]);

/** The mouse pointer, tip at (x, y): shows a hover. */
export function Cursor({ x, y, k = 1.25 }: { x: number; y: number; k?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${k})`} d="M0 0 L0 17 L4.5 13 L7.6 20 L10.8 18.6 L7.7 12 L13.2 12 Z" fill={ink} stroke={paper} strokeWidth={1.4} strokeLinejoin="round" />;
}

/** A small spinner centered at (cx, cy). */
export const Spin = ({ cx, cy, r = 9, color = ink }: { cx: number; cy: number; r?: number; color?: string }) => (
  <g><circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={3} /><path d={`M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" /></g>
);

/** The part of a box the state ring hugs: a field's input, not its label. */
function stateBox(b: Box): { x: number; y: number; w: number; h: number; rx: number } {
  const n = b.node, t = typeOf(n);
  if (LABELLED.has(t)) {
    const lab = n.label ? 26 : 0;
    const h = t === "textarea" ? b.h - lab - (n.error || n.help ? 22 : 0) : 46;
    return { x: b.x, y: b.y + lab, w: b.w, h, rx: 8 };
  }
  if (t === "checkbox") return { x: b.x + 1, y: b.y + 3, w: 22, h: 22, rx: 5 };
  if (t === "toggle") return { x: b.x + b.w - 52, y: b.y + b.h / 2 - 15, w: 52, h: 30, rx: 15 };
  if (t === "radio") return { x: b.x + 1, y: b.y + 8, w: 20, h: 20, rx: 10 };
  const round = t === "search" || t === "chips" || t === "stepper" || t === "badge" || t === "fab";
  const rx = round ? Math.min(b.h / 2, 28) : t === "icon-button" || t === "avatar" ? Math.min(b.w, b.h) / 2 : t === "card" ? 12 : 10;
  return { x: b.x, y: b.y, w: b.w, h: b.h, rx };
}

/** Where a hover cursor sits: toward the lower right of the thing, pointing at it. */
function hoverPoint(b: Box): [number, number] {
  const sb = stateBox(b);
  return [sb.x + Math.min(sb.w * 0.62, sb.w - 8), sb.y + Math.min(sb.h * 0.6, sb.h - 4)];
}

/** Show a node's `state` on top of its art. Component-specific looks (loading, error, open) are drawn by the component. */
export function withState(b: Box, d: Drawn): Drawn {
  const state = s(b.node.state);
  if (!state || state === "normal") return d;
  const sb = stateBox(b);
  const g = (o: number, node: ReactNode) => (node ? <g opacity={o}>{node}</g> : node);
  switch (state) {
    case "disabled": return { ...d, shape: g(0.4, d.shape), words: g(0.4, d.words) };
    case "hover": { const [cx, cy] = hoverPoint(b); return { ...d, words: <g>{d.words}<Cursor x={cx} y={cy} /></g> }; }
    case "focus": return { ...d, shape: <g>{d.shape}{R(sb.x - 5, sb.y - 5, sb.w + 10, sb.h + 10, { rx: sb.rx + 5, stroke: C.g7, sw: 2, dash: "6 4" })}</g> };
    // pressed: a translucent ink sheet over the shape, as if pushed in
    case "pressed": return { ...d, shape: <g>{d.shape}<g opacity={0.2}>{R(sb.x + 2, sb.y + 2, sb.w - 4, sb.h - 4, { rx: Math.max(0, sb.rx - 2), fill: ink, stroke: "none" })}</g></g> };
    case "selected": return { ...d, shape: <g>{d.shape}{R(sb.x - 4, sb.y - 4, sb.w + 8, sb.h + 8, { rx: sb.rx + 4, sw: 3.5 })}</g> };
  }
  return d;
}
/** A dropdown panel: rows of items with icons, shortcuts, ticks, dividers and item states. */
export function menuPanel(x: number, y: number, w: number, items: Item[], value?: string): { shape: ReactNode; words: ReactNode; h: number } {
  const rows = menuRows(items, w), h = menuH(items);
  const anyIcon = items.some((it) => typeof it === "object" && it.icon);
  const shape = <g>
    {R(x + 4, y + 5, w, h, { rx: 10, fill: C.g2, stroke: "none" })}
    {R(x, y, w, h, { rx: 10, fill: white })}
    {rows.map((r, i) => {
      if (r.divider) return <g key={i}>{Ln(x + 10, y + r.y + r.h / 2, x + w - 10, y + r.y + r.h / 2, mid, THIN)}</g>;
      const o = obj(r.item), st = s(o.state);
      return st === "hover" || st === "selected" ? <g key={i}>{R(x + r.x, y + r.y + 2, r.w, r.h - 4, { rx: 7, fill: st === "selected" ? mid : soft, stroke: "none" })}</g> : null;
    })}
  </g>;
  const words = <g>{rows.map((r, i) => {
    if (r.divider) return null;
    const o = obj(r.item), st = s(o.state), text = itemText(r.item);
    const off = st === "disabled";
    const fill = off ? hint : ink;
    const ticked = o.checked === true || (value !== undefined && text === value);
    // the marker fonts have no ⌘ ⇧ ⌥ glyphs: spell them out
    const sc = s(o.shortcut).replace(/⌘/g, "Cmd+").replace(/⇧/g, "Shift+").replace(/⌥/g, "Alt+").replace(/\+\+/g, "+");
    const tx = x + r.x + 12 + (anyIcon ? 30 : 0);
    const right = x + r.x + r.w - 10 - (ticked ? 24 : 0);
    return <g key={i} opacity={off ? 0.55 : 1}>
      {o.icon ? <Icon name={s(o.icon)} x={x + r.x + 10} y={y + r.y + 9} size={22} color={o.danger ? ink : off ? hint : dark} /> : null}
      <T x={tx} y={mid1(y + r.y, r.h, 16)} text={fit(text, "hand", 16, right - tx - (sc ? textWidth(sc, "hand", 14) + 12 : 0))} size={16} fill={fill} />
      {sc ? <T x={right} y={mid1(y + r.y, r.h, 14)} text={sc} size={14} fill={muted} anchor="end" /> : null}
      {ticked ? <Icon name="check" x={x + r.x + r.w - 30} y={y + r.y + 9} size={22} /> : null}
      {st === "hover" ? <Cursor x={x + r.x + r.w * 0.7} y={y + r.y + r.h * 0.55} /> : null}
    </g>;
  })}</g>;
  return { shape, words, h };
}

/** A month: header with ‹ ›, weekday letters, and six weeks of days. */
export function calendar(x: number, y: number, w: number, o: { month?: string; day?: number; today?: number; start?: number }, panel: boolean): { shape: ReactNode; words: ReactNode } {
  const cw = (w - 16) / 7, gy = y + 44 + 26;
  const start = typeof o.start === "number" ? o.start : 4, days = 31;
  const cells: { d: number; cx: number; cy: number }[] = [];
  for (let d = 1; d <= days; d++) { const k = start + d - 1; cells.push({ d, cx: x + 8 + (k % 7) * cw + cw / 2, cy: gy + Math.floor(k / 7) * 36 + 18 }); }
  const sel = cells.find((c) => c.d === o.day), today = cells.find((c) => c.d === o.today);
  return {
    shape: <g>
      {panel ? R(x + 4, y + 5, w, CAL_H, { rx: 12, fill: C.g2, stroke: "none" }) : null}
      {R(x, y, w, CAL_H, { rx: 12, fill: white, sw: panel ? SW : THIN + 0.3 })}
      {today && today !== sel ? <circle cx={today.cx} cy={today.cy} r={15} fill="none" stroke={ink} strokeWidth={THIN} /> : null}
      {sel ? <circle cx={sel.cx} cy={sel.cy} r={16} fill={ink} /> : null}
    </g>,
    words: <g>
      <T x={x + 18} y={y + 29} text={fit(o.month || "October 2026", "title", 17, w - 90)} size={17} face="title" />
      <Icon name="chevron-left" x={x + w - 66} y={y + 12} size={22} /><Icon name="chevron-right" x={x + w - 36} y={y + 12} size={22} />
      {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => <T key={i} x={x + 8 + i * cw + cw / 2} y={y + 44 + 18} text={l} size={13} fill={muted} anchor="middle" />)}
      {cells.map((c) => <T key={c.d} x={c.cx} y={c.cy + 5} text={String(c.d)} size={15} anchor="middle" fill={c === sel ? paper : ink} />)}
    </g>,
  };
}

/** Browser tabs and address bar, `bh` tall, across (x, y, w). Shared by the browser component and screens with a url. */
export function BrowserBar({ x, y, w, url, title, tabs = [], top = true }: { x: number; y: number; w: number; url: string; title?: string; tabs?: string[]; top?: boolean }) {
  const all = [title || url.replace(/^https?:\/\//, "").split("/")[0] || "New tab", ...tabs];
  const tw = Math.min(220, (w - 120) / Math.max(1, all.length));
  const ay = y + 40, ah = BROWSER_BAR - 40;
  const pill = { x: x + 112, y: ay + 7, w: w - 112 - 52, h: ah - 14 };
  return (
    <g>
      <g filter="none">
        {R(x, y, w, BROWSER_BAR, { fill: soft, stroke: "none" })}
        {Ln(x, y + BROWSER_BAR, x + w, y + BROWSER_BAR, line, THIN)}
        {top ? [0, 1, 2].map((i) => <circle key={i} cx={x + 18 + i * 18} cy={y + 20} r={5.5} fill={i === 0 ? C.g5 : paper} stroke={ink} strokeWidth={1.4} />) : null}
        {all.map((_, i) => {
          const tx = x + 76 + i * (tw + 4);
          return i === 0 ? <path key={i} d={`M${tx} ${y + 40} V${y + 14} Q${tx} ${y + 8} ${tx + 6} ${y + 8} H${tx + tw - 6} Q${tx + tw} ${y + 8} ${tx + tw} ${y + 14} V${y + 40}`} fill={paper} stroke={ink} strokeWidth={THIN} />
            : <g key={i}>{Ln(tx + tw, y + 14, tx + tw, y + 34, line, THIN)}</g>;
        })}
        {R(x, ay, w, ah, { fill: paper, stroke: "none" })}
        {R(pill.x, pill.y, pill.w, pill.h, { rx: pill.h / 2, fill: soft, sw: THIN })}
      </g>
      {all.map((t, i) => {
        const tx = x + 76 + i * (tw + 4);
        return <g key={i}><T x={tx + 12} y={y + 30} text={fit(t, "hand", 14, tw - 40)} size={14} fill={i === 0 ? ink : muted} /><T x={tx + tw - 14} y={y + 30} text="×" size={15} fill={muted} anchor="middle" /></g>;
      })}
      <T x={x + 76 + all.length * (tw + 4) + 12} y={y + 30} text="+" size={18} fill={muted} />
      <Icon name="arrow-left" x={x + 12} y={ay + 10} size={22} /><Icon name="arrow-right" x={x + 44} y={ay + 10} size={22} color={hint} /><Icon name="refresh" x={x + 76} y={ay + 10} size={22} />
      <Icon name="lock" x={pill.x + 12} y={pill.y + pill.h / 2 - 8} size={16} color={muted} />
      <text x={pill.x + 36} y={pill.y + pill.h / 2 + 5} fontFamily="IBM Plex Mono" fontSize={13} fill={ink}>{url.length * 7.8 > pill.w - 50 ? `${url.slice(0, Math.max(4, Math.floor((pill.w - 60) / 7.8)))}…` : url}</text>
      <Icon name="more" x={x + w - 40} y={ay + 10} size={22} />
    </g>
  );
}

export function drawMore(b: Box, ctx: DrawCtx): Drawn {
  const n = b.node, { x, y, w, h } = b;
  const text = s(n.text);
  const uid = `${ctx.uid}-${b.key.replace(/[^a-z0-9]/gi, "_") || "root"}`;
  const state = s(n.state);
  switch (typeOf(n)) {
    // ---------- feedback ----------
    case "banner": {
      const kind = s(n.kind) || "info";
      const ic = kind === "success" ? "check" : kind === "warning" || kind === "error" ? "alert" : "info";
      const aw = n.action ? textWidth(s(n.action), "hand", 16) + 20 : 0, cw = n.close ? 34 : 0;
      return {
        shape: <g>{R(x, y, w, h, { fill: kind === "error" || kind === "warning" ? mid : soft, stroke: "none" })}{Ln(x, y + h, x + w, y + h, kind === "error" ? ink : line, kind === "error" ? SW : THIN)}</g>,
        words: <g>
          <Icon name={ic} x={x + 16} y={y + h / 2 - 11} size={22} />
          <T x={x + 48} y={mid1(y, h, 16)} text={fit(text, "hand", 16, w - 64 - aw - cw)} size={16} />
          {n.action ? <T x={x + w - 16 - cw} y={mid1(y, h, 16)} text={s(n.action)} size={16} anchor="end" underline /> : null}
          {n.close ? <Icon name="close" x={x + w - 34} y={y + h / 2 - 10} size={20} color={muted} /> : null}
        </g>,
      };
    }
    case "empty-state": {
      const cx = x + w / 2;
      let cy = y + 64 + 14;
      const tl = n.title ? wrap(s(n.title), "title", 20, w - 32) : [];
      const tH = tl.length * lineH(20, "title") + (tl.length ? 6 : 0);
      const tw2 = Math.min(w, 340) - 16;
      const bl = text ? wrap(text, "hand", 16, tw2) : [];
      const bH = bl.length * lineH(16) + (bl.length ? 6 : 0);
      const bw = n.button ? textWidth(s(n.button), "hand", 18) + 48 : 0;
      const by = cy + tH + bH + 8;
      cy += 0;
      return {
        shape: <g><circle cx={cx} cy={y + 32} r={32} fill={soft} stroke="none" />{n.button ? R(cx - bw / 2, by, bw, 48, { rx: 12, fill: ink }) : null}</g>,
        words: <g>
          <Icon name={s(n.icon) || "inbox"} x={cx - 16} y={y + 16} size={32} color={dark} />
          {tl.length ? <Para x={x + 16} y={cy} w={w - 32} text={s(n.title)} size={20} face="title" align="center" /> : null}
          {bl.length ? <Para x={cx - tw2 / 2} y={cy + tH} w={tw2} text={text} size={16} fill={muted} align="center" /> : null}
          {n.button ? <T x={cx} y={mid1(by, 48, 18)} text={s(n.button)} size={18} fill={paper} anchor="middle" /> : null}
        </g>,
      };
    }
    case "skeleton": {
      const parts: ReactNode[] = [];
      let yy = y;
      if (n.image) { const ih = Math.round(w * 0.42); parts.push(<g key="img">{R(x, yy, w, ih, { rx: 10, fill: mid, stroke: "none" })}</g>); yy += ih + 14; }
      const lx = n.avatar ? x + 56 : x;
      if (n.avatar) parts.push(<circle key="av" cx={x + 20} cy={yy + 20} r={20} fill={mid} />);
      const k = typeof n.lines === "number" ? n.lines : 3;
      for (let i = 0; i < k; i++) parts.push(<g key={i}>{R(lx, yy + 4 + i * 22, (x + w - lx) * (i === k - 1 && k > 1 ? 0.6 : i === 0 ? 0.85 : 1), 12, { rx: 6, fill: mid, stroke: "none" })}</g>);
      return { shape: <g>{parts}</g> };
    }

    // ---------- controls ----------
    case "split-button": {
      const v = s(n.variant) || "secondary";
      const fg = v === "primary" ? paper : ink, fill = v === "primary" ? ink : v === "outline" ? white : mid;
      const open = state === "open";
      const its = itemsOf(n).length ? itemsOf(n) : ["Another action"];
      const pop = open ? menuPanel(x + w - Math.max(200, w), y + h + 6, Math.max(200, w), its) : undefined;
      return {
        shape: <g>{R(x, y, w, h, { rx: 12, fill })}{Ln(x + w - 44, y + 8, x + w - 44, y + h - 8, v === "primary" ? paper : ink, THIN)}</g>,
        words: <g><T x={x + (w - 44) / 2} y={mid1(y, h, 18)} text={fit(text, "hand", 18, w - 60)} size={18} fill={fg} anchor="middle" /><Icon name={open ? "chevron-up" : "chevron-down"} x={x + w - 33} y={y + h / 2 - 11} size={22} color={fg} /></g>,
        popShape: pop?.shape, popWords: pop?.words,
      };
    }
    case "fab": {
      const loading = state === "loading";
      const ic = s(n.icon) || "plus";
      return {
        shape: <g>{R(x + 3, y + 5, w, h, { rx: h / 2, fill: C.g4, stroke: "none" })}{R(x, y, w, h, { rx: h / 2, fill: ink })}</g>,
        words: loading ? <Spin cx={x + w / 2} cy={y + h / 2} color={paper} /> : <g>
          <Icon name={ic} x={n.text ? x + 18 : x + w / 2 - 13} y={y + h / 2 - 13} size={26} color={paper} />
          {n.text ? <T x={x + 52} y={mid1(y, h, 17)} text={fit(text, "hand", 17, w - 68)} size={17} fill={paper} /> : null}
        </g>,
      };
    }
    case "date-picker": case "tag-input": {
      const t = typeOf(n);
      const lab = n.label ? 26 : 0, by = y + lab, bh = 46;
      const err = state === "error" || !!n.error;
      const tags = t === "tag-input" && Array.isArray(n.items) ? n.items.map(String) : [];
      let tx = x + 10;
      const tagR = tags.map((tg) => { const tw2 = textWidth(tg, "hand", 15) + 38; const r = { x: tx, w: tw2 }; tx += tw2 + 6; return r; });
      const open = t === "date-picker" && state === "open";
      const cal = open ? calendar(x, by + bh + 6, Math.min(w, 300), { month: s(n.month), day: typeof n.day === "number" ? n.day : undefined, today: typeof n.today === "number" ? n.today : undefined }, true) : undefined;
      const val = s(n.value), ph = s(n.hint);
      return {
        shape: <g>
          {R(x, by, w, bh, { rx: 8, fill: state === "disabled" ? soft : white, sw: err || state === "focus" || open ? 3 : SW })}
          {tagR.map((r, i) => <g key={i}>{R(r.x, by + 8, r.w, 30, { rx: 15, fill: mid, sw: THIN })}</g>)}
        </g>,
        words: <g>
          {n.label ? <T x={x + 2} y={y + 18} text={fit(s(n.label) + (n.required ? " *" : ""), "hand", 15, w)} size={15} fill={dark} /> : null}
          {t === "date-picker"
            ? <g><T x={x + 14} y={mid1(by, bh, 17)} text={fit(val || ph || "MM / DD / YYYY", "hand", 17, w - 60)} size={17} fill={val ? ink : hint} /><Icon name="calendar" x={x + w - 36} y={by + bh / 2 - 11} size={22} /></g>
            : <g>
              {tags.map((tg, i) => <g key={i}><T x={tagR[i].x + 12} y={mid1(by + 8, 30, 15)} text={tg} size={15} /><T x={tagR[i].x + tagR[i].w - 13} y={mid1(by + 8, 30, 15)} text="×" size={16} fill={muted} anchor="middle" /></g>)}
              {ph && tx < x + w - 40 ? <T x={tx + 6} y={mid1(by, bh, 16)} text={fit(ph, "hand", 16, x + w - tx - 16)} size={16} fill={hint} /> : null}
            </g>}
          {n.error ? <g><Icon name="alert" x={x} y={by + bh + 3} size={16} /><T x={x + 22} y={by + bh + 17} text={fit(s(n.error), "hand", 15, w - 24)} size={15} /></g> : null}
        </g>,
        popShape: cal?.shape, popWords: cal?.words,
      };
    }
    case "file-upload": {
      const lab = n.label ? 26 : 0, zy = y + lab, zh = 110;
      const files = Array.isArray(n.files) ? n.files.map(String) : [];
      const over = state === "hover";
      return {
        shape: <g>
          {R(x, zy, w, zh, { rx: 12, fill: over ? soft : white, stroke: state === "error" ? ink : C.g5, sw: state === "error" ? 3 : 2, dash: "9 7" })}
          {files.map((_, i) => <g key={i}>{R(x, zy + zh + 6 + i * 40, w, 34, { rx: 8, fill: soft, stroke: "none" })}</g>)}
        </g>,
        words: <g>
          {n.label ? <T x={x + 2} y={y + 18} text={s(n.label)} size={15} fill={dark} /> : null}
          <Icon name="upload" x={x + w / 2 - 14} y={zy + 20} size={28} color={dark} />
          <T x={x + w / 2} y={zy + 74} text={fit(text || "Drag a file here or browse", "hand", 16, w - 24)} size={16} anchor="middle" fill={dark} />
          {!text ? Ln(x + w / 2 + textWidth("Drag a file here or ", "hand", 16) / 2 - textWidth("browse", "hand", 16) / 2 + 6, zy + 78, x + w / 2 + textWidth("Drag a file here or browse", "hand", 16) / 2, zy + 78, ink, 1.2) : null}
          <T x={x + w / 2} y={zy + 96} text="PDF, PNG or JPG" size={13} anchor="middle" fill={muted} />
          {files.map((f, i) => <g key={i}><Icon name="doc" x={x + 10} y={zy + zh + 12 + i * 40} size={20} color={dark} /><T x={x + 38} y={zy + zh + 29 + i * 40} text={fit(f, "hand", 15, w - 80)} size={15} /><Icon name="close" x={x + w - 30} y={zy + zh + 13 + i * 40} size={18} color={muted} /></g>)}
        </g>,
      };
    }

    // ---------- content ----------
    case "calendar": return calendar(x, y, w, { month: s(n.month), day: typeof n.day === "number" ? n.day : undefined, today: typeof n.today === "number" ? n.today : undefined, start: typeof n.start === "number" ? n.start : undefined }, false);
    case "details": {
      const rows = detailRows(n), k = Math.max(1, typeof n.columns === "number" ? n.columns : 1), cw = w / k;
      return {
        shape: <g>{Array.from({ length: Math.ceil(rows.length / k) - 1 }, (_, i) => Ln(x, y + (i + 1) * 52, x + w, y + (i + 1) * 52, mid, THIN))}</g>,
        words: <g>{rows.map((r, i) => {
          const cx = x + (i % k) * cw, cy = y + Math.floor(i / k) * 52;
          return k === 1 && w > 300
            ? <g key={i}><T x={cx} y={mid1(cy, 52, 15)} text={fit(r.label, "hand", 15, cw * 0.38)} size={15} fill={muted} /><T x={cx + cw * 0.4} y={mid1(cy, 52, 17)} text={fit(r.value, "hand", 17, cw * 0.6)} size={17} /></g>
            : <g key={i}><T x={cx} y={cy + 20} text={fit(r.label, "hand", 14, cw - 12)} size={14} fill={muted} /><T x={cx} y={cy + 41} text={fit(r.value, "hand", 17, cw - 12)} size={17} /></g>;
        })}</g>,
      };
    }
    case "stat": {
      const trend = s(n.trend);
      return {
        shape: R(x, y, w, h, { rx: 12, fill: white }),
        words: <g>
          <T x={x + 16} y={y + 28} text={fit(s(n.label) || "Label", "hand", 15, w - 32)} size={15} fill={muted} />
          <T x={x + 16} y={y + 66} text={fit(s(n.value) || "0", "title", 30, w - 32)} size={30} face="title" />
          {n.delta ? <g>{trend === "up" || trend === "down" ? <Icon name={trend === "up" ? "arrow-up" : "arrow-down"} x={x + 14} y={y + 76} size={18} color={dark} /> : null}<T x={x + (trend === "up" || trend === "down" ? 36 : 16)} y={y + 91} text={s(n.delta)} size={15} fill={dark} /></g> : null}
        </g>,
      };
    }
    case "avatar-group": {
      const its = Array.isArray(n.items) ? n.items.map(String) : ["", "", ""];
      const more = typeof n.more === "number" ? n.more : 0;
      const all = more ? [...its, `+${more}`] : its;
      return {
        shape: <g>{all.map((t, i) => <circle key={i} cx={x + 20 + i * 28} cy={y + 20} r={19} fill={i === its.length ? soft : mid} stroke={paper} strokeWidth={3} />)}{all.map((_, i) => <circle key={`o${i}`} cx={x + 20 + i * 28} cy={y + 20} r={19} fill="none" stroke={ink} strokeWidth={THIN} />)}</g>,
        words: <g>{all.map((t, i) => t ? <T key={i} x={x + 20 + i * 28} y={y + 26} text={t.slice(0, 3).toUpperCase()} size={15} anchor="middle" fill={i === its.length ? dark : ink} />
          : <g key={i}><circle cx={x + 20 + i * 28} cy={y + 15} r={6} fill={line} /><path d={`M${x + 9 + i * 28} ${y + 33} q11 -14 22 0`} fill={line} /></g>)}</g>,
      };
    }
    case "tree": {
      const rows = treeRows(itemsOf(n)), sel = s(n.selected);
      return {
        shape: <g>{rows.map((r, i) => {
          const o = obj(r.item), st = s(o.state), on = itemText(r.item) === sel || st === "selected";
          return on || st === "hover" ? <g key={i}>{R(x, y + i * 36 + 2, w, 32, { rx: 7, fill: on ? mid : soft, stroke: "none" })}</g> : null;
        })}</g>,
        words: <g>{rows.map((r, i) => {
          const o = obj(r.item), ix = x + 6 + r.depth * 24, st = s(o.state);
          return <g key={i} opacity={st === "disabled" ? 0.45 : 1}>
            {r.kids ? <Icon name={o.open ? "chevron-down" : "chevron-right"} x={ix} y={y + i * 36 + 8} size={18} color={muted} /> : null}
            <Icon name={s(o.icon) || (r.kids ? "folder" : "doc")} x={ix + 22} y={y + i * 36 + 7} size={20} color={dark} />
            <T x={ix + 50} y={mid1(y + i * 36, 36, 16)} text={fit(itemText(r.item), "hand", 16, w - (ix - x) - 56)} size={16} />
            {st === "hover" ? <Cursor x={ix + 50 + Math.min(80, textWidth(itemText(r.item), "hand", 16))} y={y + i * 36 + 20} /> : null}
          </g>;
        })}</g>,
      };
    }
    case "timeline": {
      const rows = timelineRows(n, w), cur = typeof n.current === "number" ? n.current : rows.length;
      return {
        shape: <g>
          {rows.slice(1).map((r, i) => Ln(x + 11, y + rows[i].y + 22, x + 11, y + r.y + 4, i + 1 < cur ? ink : line, i + 1 < cur ? SW : THIN))}
          {rows.map((r, i) => <circle key={i} cx={x + 11} cy={y + r.y + 13} r={8} fill={i < cur ? ink : white} stroke={ink} strokeWidth={THIN + 0.3} />)}
        </g>,
        words: <g>{rows.map((r, i) => {
          const o = typeof r.item === "string" ? { title: r.item } : r.item;
          return <g key={i}>
            <T x={x + 32} y={y + r.y + 19} text={fit(itemTitle(o as Item), "hand", 17, w - 120)} size={17} fill={i < cur ? ink : muted} />
            {o.meta ? <T x={x + w} y={y + r.y + 19} text={s(o.meta)} size={14} fill={muted} anchor="end" /> : null}
            {o.text ? <Para x={x + 32} y={y + r.y + 26} w={w - 40} text={s(o.text)} size={15} fill={muted} /> : null}
          </g>;
        })}</g>,
      };
    }
    case "code": {
      const ls = text ? text.split("\n") : [];
      const k = ls.length || (typeof n.lines === "number" ? n.lines : 4);
      const gx = n.numbers ? 34 : 0;
      return {
        shape: <g>
          {R(x, y, w, h, { rx: 10, fill: soft })}
          {!ls.length ? Array.from({ length: k }, (_, i) => <g key={i}>{squiggle(x + 14 + gx + (i % 3 === 1 ? 20 : 0), y + 22 + i * 21, (w - 28 - gx - (i % 3 === 1 ? 20 : 0)) * [0.5, 0.7, 0.4, 0.62][i % 4])}</g>) : null}
          {n.copy ? R(x + w - 40, y + 8, 30, 30, { rx: 7, fill: white, sw: THIN }) : null}
        </g>,
        words: <g>
          {n.numbers ? Array.from({ length: k }, (_, i) => <text key={i} x={x + 24} y={y + 26 + i * 21} fontFamily="IBM Plex Mono" fontSize={13} fill={hint} textAnchor="end">{i + 1}</text>) : null}
          {ls.map((l, i) => <text key={i} x={x + 14 + gx} y={y + 26 + i * 21} fontFamily="IBM Plex Mono" fontSize={13.5} fill={ink} xmlSpace="preserve">{l.length * 8.1 > w - 28 - gx - (n.copy ? 34 : 0) ? `${l.slice(0, Math.max(3, Math.floor((w - 40 - gx - (n.copy ? 34 : 0)) / 8.1)))}…` : l}</text>)}
          {n.copy ? <Icon name="copy" x={x + w - 35} y={y + 13} size={20} color={dark} /> : null}
        </g>,
      };
    }

    // ---------- layout ----------
    case "accordion": {
      const rows = accordionRows(n, w);
      return {
        shape: <g>{R(x, y, w, h, { rx: 10, fill: white, sw: THIN + 0.3 })}{rows.slice(1).map((r, i) => <g key={i}>{Ln(x, y + r.y, x + w, y + r.y, mid, THIN)}</g>)}
          {rows.map((r, i) => s(obj(r.item).state) === "hover" ? <g key={`h${i}`}>{R(x + 3, y + r.y + 3, w - 6, 46, { rx: 7, fill: soft, stroke: "none" })}</g> : null)}</g>,
        words: <g>{rows.map((r, i) => {
          const o = typeof r.item === "string" ? { title: r.item } : r.item;
          const st = s(o.state);
          return <g key={i} opacity={st === "disabled" ? 0.45 : 1}>
            <T x={x + 16} y={mid1(y + r.y, 52, 17)} text={fit(itemTitle(o as Item), "hand", 17, w - 60)} size={17} />
            <Icon name={r.open ? "chevron-up" : "chevron-down"} x={x + w - 36} y={y + r.y + 15} size={22} color={dark} />
            {r.open ? (o.text ? <Para x={x + 16} y={y + r.y + 48} w={w - 32} text={s(o.text)} size={16} fill={dark} /> : <g>{squiggle(x + 18, y + r.y + 60, w - 50)}{squiggle(x + 18, y + r.y + 81, (w - 50) * 0.6)}</g>) : null}
            {st === "hover" ? <Cursor x={x + w * 0.6} y={y + r.y + 30} /> : null}
          </g>;
        })}</g>,
      };
    }
    case "browser": return {
      shape: <g>{R(x, y, w, h, { rx: 10, fill: paper })}</g>,
      words: <g>
        <clipPath id={`${uid}-bc`}><rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={BROWSER_BAR} rx={9} /></clipPath>
        <g clipPath={`url(#${uid}-bc)`}><BrowserBar x={x} y={y} w={w} url={s(n.url) || "example.com"} title={s(n.title)} tabs={Array.isArray(n.tabs) ? n.tabs.map(String) : []} /></g>
        {R(x, y, w, h, { rx: 10, sw: SW })}
      </g>,
    };
    case "window": return {
      shape: <g>{R(x, y, w, h, { rx: 10, fill: paper })}{R(x, y, w, WINDOW_BAR, { rx: 10, fill: soft, stroke: "none" })}{R(x, y + 20, w, WINDOW_BAR - 20, { fill: soft, stroke: "none" })}{Ln(x, y + WINDOW_BAR, x + w, y + WINDOW_BAR, line, THIN)}{R(x, y, w, h, { rx: 10 })}</g>,
      words: <g>
        {[0, 1, 2].map((i) => <circle key={i} cx={x + 20 + i * 18} cy={y + 20} r={5.5} fill={i === 0 ? C.g5 : paper} stroke={ink} strokeWidth={1.4} />)}
        {n.title ? <T x={x + w / 2} y={y + 26} text={fit(s(n.title), "hand", 16, w - 140)} size={16} anchor="middle" /> : null}
      </g>,
    };

    // ---------- navigation ----------
    case "toolbar": {
      const its = itemsOf(n), rs = itemRects(n, w, h);
      const bw = n.button ? textWidth(s(n.button), "hand", 16) + 36 : 0;
      const sw2 = n.search ? Math.min(260, Math.max(140, w * 0.3)) : 0;
      const sx = x + w - bw - (bw ? 10 : 0) - sw2;
      return {
        shape: <g>
          {its.map((it, i) => isIconItem(it) ? null : <g key={i}>{R(x + rs[i].x, y + rs[i].y, rs[i].w, rs[i].h, { rx: 10, fill: white, sw: THIN + 0.3 })}</g>)}
          {n.search ? R(sx, y + (h - 40) / 2, sw2, 40, { rx: 20, fill: soft, sw: THIN + 0.3 }) : null}
          {n.button ? R(x + w - bw, y + (h - 40) / 2, bw, 40, { rx: 10, fill: ink }) : null}
        </g>,
        words: <g>
          {its.map((it, i) => {
            const o = obj(it);
            if (isIconItem(it)) return <Icon key={i} name={typeof it === "string" ? it : s(o.icon)} x={x + rs[i].x + 8} y={y + rs[i].y + 8} size={24} color={dark} />;
            return <g key={i}>{o.icon ? <Icon name={s(o.icon)} x={x + rs[i].x + 12} y={y + rs[i].y + 10} size={20} /> : null}<T x={x + rs[i].x + (o.icon ? 38 : 16)} y={mid1(y + rs[i].y, 40, 16)} text={itemText(it)} size={16} /></g>;
          })}
          {n.search ? <g><Icon name="search" x={sx + 12} y={y + h / 2 - 10} size={20} color={muted} /><T x={sx + 40} y={mid1(y + (h - 40) / 2, 40, 16)} text={fit(s(n.search), "hand", 16, sw2 - 52)} size={16} fill={hint} /></g> : null}
          {n.button ? <T x={x + w - bw / 2} y={mid1(y + (h - 40) / 2, 40, 16)} text={s(n.button)} size={16} fill={paper} anchor="middle" /> : null}
        </g>,
      };
    }

    // ---------- overlays ----------
    case "menu": { const m = menuPanel(x, y, w, itemsOf(n), n.value === undefined ? undefined : s(n.value)); return { shape: m.shape, words: m.words }; }
    case "drawer": {
      const left = n.side === "left";
      return {
        shape: <g>{R(x, y, w, h, { fill: paper, stroke: "none" })}{Ln(left ? x + w : x, y, left ? x + w : x, y + h, ink, SW)}</g>,
        words: n.title ? <g><T x={x + 20} y={y + 34} text={fit(s(n.title), "title", 20, w - 70)} size={20} face="title" /><Icon name="close" x={x + w - 40} y={y + 14} size={22} /></g> : undefined,
      };
    }
    case "popover": {
      const a = s(n.arrow) || "top";
      const tri = a === "top" ? `M${x + 28} ${y + 1} L${x + 38} ${y - 11} L${x + 48} ${y + 1}` : a === "bottom" ? `M${x + 28} ${y + h - 1} L${x + 38} ${y + h + 11} L${x + 48} ${y + h - 1}`
        : a === "left" ? `M${x + 1} ${y + 18} L${x - 11} ${y + 28} L${x + 1} ${y + 38}` : `M${x + w - 1} ${y + 18} L${x + w + 11} ${y + 28} L${x + w - 1} ${y + 38}`;
      return {
        shape: <g>{R(x + 4, y + 5, w, h, { rx: 12, fill: C.g2, stroke: "none" })}{R(x, y, w, h, { rx: 12, fill: white })}<path d={tri} fill={white} stroke={ink} strokeWidth={SW} strokeLinejoin="round" /></g>,
        words: n.title ? <T x={x + 14} y={y + 30} text={fit(s(n.title), "hand", 18, w - 28)} size={18} /> : undefined,
      };
    }
    case "tooltip": {
      const a = s(n.arrow) || "bottom";
      const bh = 36, by = a === "top" ? y + 8 : y, bx = a === "left" ? x + 8 : x, bw = a === "left" || a === "right" ? w - 8 : w;
      const cx = bx + bw / 2;
      const tri = a === "bottom" ? `M${cx - 8} ${by + bh - 1} L${cx} ${by + bh + 8} L${cx + 8} ${by + bh - 1} Z` : a === "top" ? `M${cx - 8} ${by + 1} L${cx} ${by - 8} L${cx + 8} ${by + 1} Z`
        : a === "left" ? `M${bx + 1} ${by + 10} L${bx - 8} ${by + 18} L${bx + 1} ${by + 26} Z` : `M${bx + bw - 1} ${by + 10} L${bx + bw + 8} ${by + 18} L${bx + bw - 1} ${by + 26} Z`;
      return {
        shape: <g>{R(bx, by, bw, bh, { rx: 8, fill: ink, stroke: "none" })}<path d={tri} fill={ink} /></g>,
        words: <T x={cx} y={mid1(by, bh, 15)} text={fit(text, "hand", 15, bw - 16)} size={15} fill={paper} anchor="middle" />,
      };
    }
  }
  return {};
}

export { BROWSER_BAR, MENU_PAD };

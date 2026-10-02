import { useEffect, useState } from "react";
import type { Result } from "../../vendor/sketch/suggest";
import type { ItemBox, Layout } from "../layout";
import { resolveNode, startScreen, type Item, type WireframeFile, type WNode } from "../types";
import { CATEGORIES, COMMON, COMPONENTS, DEVICES, ICONS, PINS, type PropDef } from "../vocab";
import { getAt, keyOf, pathOf, type Sel } from "./model";

export interface InspectorActions {
  edit: (next: WireframeFile, coalesce?: string) => void;
  setProp: (path: (string | number)[], prop: string, value: unknown, coalesce?: string) => void;
  select: (s: Sel) => void;
  remove: () => void;
  move: (delta: number) => void;
  duplicate: () => void;
  resetNudge: () => void;
  copyPointer: () => void;
  renameScreen: (from: string, to: string) => void;
  addScreen: () => void;
  duplicateScreen: () => void;
  deleteScreen: () => void;
  copyScreenImage: () => void;
  play: (screen?: string) => void;
  focusScreen: (id: string) => void;
}

interface Props { doc: WireframeFile; layouts: Record<string, Layout>; sel: Sel; result?: Result; a: InspectorActions; focusText: number }

const humanize = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/** A text input that keeps its own draft while focused, so typing never fights the save round-trip. */
function TextIn({ value, onChange, multiline, placeholder, autoFocusKey, id }: { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; autoFocusKey?: number; id?: string }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setDraft(value); }, [value, focused]);
  const props = {
    id, value: draft, placeholder,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: { target: { value: string } }) => { setDraft(e.target.value); onChange(e.target.value); },
  };
  useEffect(() => { if (autoFocusKey && id) (document.getElementById(id) as HTMLInputElement | null)?.select(); }, [autoFocusKey, id]);
  return multiline ? <textarea rows={3} {...props} /> : <input type="text" {...props} />;
}

function NumIn({ value, onChange, min, max, step }: { value: unknown; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number }) {
  return <input type="number" value={typeof value === "number" ? value : ""} min={min} max={max} step={step ?? (max !== undefined && max <= 1 ? 0.05 : 1)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
}

const ITEM_FIELDS: Record<string, string[]> = { list: ["title", "subtitle", "meta"], tabbar: ["text", "icon"], sidebar: ["text", "icon"], navbar: ["icon"] };

function ItemsEditor({ type, items, screens, onChange }: { type: string; items: Item[]; screens: string[]; onChange: (v: Item[]) => void }) {
  const fields = ITEM_FIELDS[type] ?? ["text"];
  const links = !!COMPONENTS[type]?.linkItems || type === "navbar";
  const asObj = (it: Item): Record<string, unknown> => (typeof it === "string" ? { [fields[0]]: it } : typeof it === "number" ? { [fields[0]]: String(it) } : { ...it, ...(fields[0] === "title" && it.text && !it.title ? { title: it.text } : {}) });
  const pack = (o: Record<string, unknown>): Item => {
    const clean = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));
    const keys = Object.keys(clean);
    if (keys.length === 1 && keys[0] === fields[0]) return String(clean[fields[0]]);
    return clean as Item;
  };
  const set = (i: number, k: string, v: unknown) => onChange(items.map((it, j) => (j === i ? pack({ ...asObj(it), [k]: v }) : it)));
  return (
    <div className="items">
      {items.map((it, i) => {
        const o = asObj(it);
        return (
          <div className="item-row" key={i}>
            {fields.map((f) => f === "icon"
              ? <select key={f} value={String(o.icon ?? "")} onChange={(e) => set(i, "icon", e.target.value || undefined)} title="Icon"><option value="">{type === "navbar" ? "icon…" : "auto icon"}</option>{ICONS.map((ic) => <option key={ic}>{ic}</option>)}</select>
              : <TextIn key={f} value={String(o[f] ?? "")} placeholder={f} onChange={(v) => set(i, f, v)} />)}
            {links ? <select value={String(o.goes ?? "")} onChange={(e) => set(i, "goes", e.target.value || undefined)} title="Goes to"><option value="">no link</option>{screens.map((s) => <option key={s} value={s}>→ {s}</option>)}<option value="back">← back</option></select> : null}
            <button className="x" title="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </div>
        );
      })}
      <button className="btn small" onClick={() => onChange([...items, type === "navbar" ? "more" : "New"])}>+ Add item</button>
    </div>
  );
}

function Field({ k, d, node, path, screens, a, focusText }: { k: string; d: PropDef; node: WNode; path: (string | number)[]; screens: string[]; a: InspectorActions; focusText: number }) {
  const v = node[k];
  const t = d.type;
  const set = (val: unknown) => a.setProp(path, k, val, `${path.join(".")}.${k}`);
  const primary = k === "text" || k === "title" || k === "label";
  let input;
  switch (t.kind) {
    case "text": input = <TextIn id={primary ? "insp-text" : undefined} autoFocusKey={primary ? focusText : undefined} value={v == null ? "" : String(v)} multiline={k === "note" || (k === "text" && (node.type === "text" || node.type === "alert"))} onChange={set} />; break;
    case "number": input = <NumIn value={v} min={t.min} max={t.max} onChange={set} />; break;
    case "bool": input = <input type="checkbox" checked={v === true} onChange={(e) => set(e.target.checked ? true : undefined)} />; break;
    case "enum": input = <select value={v == null ? "" : String(v)} onChange={(e) => set(e.target.value || undefined)}><option value="">default</option>{t.values.map((x) => <option key={x}>{x}</option>)}</select>; break;
    case "icon": input = <select value={v == null ? "" : String(v)} onChange={(e) => set(e.target.value || undefined)}><option value="">none</option>{ICONS.map((x) => <option key={x}>{x}</option>)}</select>; break;
    case "screen": input = <select value={v == null ? "" : String(v)} onChange={(e) => set(e.target.value || undefined)}><option value="">no link</option>{screens.map((s) => <option key={s} value={s}>→ {s}</option>)}<option value="back">← back</option></select>; break;
    case "strings": input = <textarea rows={Math.max(2, Array.isArray(v) ? v.length : 1)} value={Array.isArray(v) ? v.join("\n") : v == null ? "" : String(v)} onChange={(e) => set(e.target.value.split("\n").filter((x, i, arr) => x || i < arr.length - 1))} placeholder="one per line" />; break;
    case "rows": input = <textarea rows={4} value={Array.isArray(v) ? (v as unknown[][]).map((r) => (Array.isArray(r) ? r.join(" | ") : String(r))).join("\n") : ""} onChange={(e) => set(e.target.value.split("\n").filter(Boolean).map((r) => r.split("|").map((c) => c.trim())))} placeholder="cell | cell | cell" />; break;
    case "items": input = <ItemsEditor type={String(node.type)} items={Array.isArray(v) ? (v as Item[]) : []} screens={screens} onChange={set} />; break;
    default: return null;
  }
  return (
    <label className={`field${t.kind === "bool" ? " inline" : ""}${t.kind === "items" ? " wide" : ""}`} title={d.doc}>
      <span>{humanize(k)}</span>{input}
    </label>
  );
}

function Issues({ result, prefix }: { result?: Result; prefix: string }) {
  if (!result) return null;
  const mine = [...result.errors.map((x) => ({ ...x, err: true })), ...result.warnings.map((x) => ({ ...x, err: false }))].filter((x) => x.path === prefix || x.path.startsWith(prefix + ".") || x.path.startsWith(prefix + "[") || x.path.startsWith(prefix + " ("));
  if (!mine.length) return null;
  return <ul className="issues">{mine.map((x, i) => <li key={i} className={x.err ? "err" : "warn"}>{x.message}{x.hint ? <span className="fix"> {x.hint}</span> : null}</li>)}</ul>;
}

const dotted = (path: (string | number)[]) => "$" + path.map((p) => (typeof p === "number" ? `[${p}]` : `.${p}`)).join("");

export function Inspector({ doc, layouts, sel, result, a, focusText }: Props) {
  const screens = Object.keys(doc.screens);

  if (!sel) {
    const total = (result?.errors.length ?? 0) + (result?.warnings.length ?? 0);
    return (
      <aside className="inspector">
        <h3>Flow</h3>
        <label className="field"><span>Title</span><TextIn value={doc.title ?? ""} onChange={(v) => a.edit({ ...doc, title: v }, "title")} /></label>
        <label className="field"><span>Device</span>
          <select value={typeof doc.device === "string" ? doc.device : doc.device ? "custom" : "phone"} onChange={(e) => a.edit({ ...doc, device: e.target.value as WireframeFile["device"] }, "device")}>
            {Object.entries(DEVICES).map(([k, v]) => <option key={k} value={k}>{k} ({v.w}×{v.h})</option>)}
            {typeof doc.device === "object" ? <option value="custom">custom ({doc.device.w}×{doc.device.h})</option> : null}
          </select>
        </label>
        <h4>Screens</h4>
        <ul className="screen-list">
          {screens.map((s) => <li key={s}><button onClick={() => a.focusScreen(s)}>{doc.screens[s].title ?? s}<small>{s}{startScreen(doc) === s ? " · start" : ""}</small></button></li>)}
        </ul>
        <button className="btn" onClick={a.addScreen}>+ Add screen</button>
        <h4>Checks</h4>
        {result && total === 0 ? <p className="ok-note">All good. No errors or suggestions.</p> : null}
        {result ? <ul className="issues">{[...result.errors.map((x) => ({ ...x, err: true })), ...result.warnings.map((x) => ({ ...x, err: false }))].map((x, i) => <li key={i} className={x.err ? "err" : "warn"}><code>{x.path.replace(/^\$\./, "")}</code> {x.message}{x.hint ? <span className="fix"> {x.hint}</span> : null}</li>)}</ul> : null}
        <p className="hint">Click a screen or anything on it to edit. Drag to nudge. Space+drag or scroll to pan, pinch or ⌘+scroll to zoom.</p>
      </aside>
    );
  }

  const sc = doc.screens[sel.screen];
  if (!sc) return <aside className="inspector" />;

  if (!sel.key) {
    return (
      <aside className="inspector">
        <h3>Screen</h3>
        <Issues result={result} prefix={`$.screens.${sel.screen}`} />
        <label className="field"><span>Title</span><TextIn id="insp-text" autoFocusKey={focusText} value={sc.title ?? ""} onChange={(v) => a.setProp(["screens", sel.screen], "title", v, `${sel.screen}.title`)} /></label>
        <label className="field" title="Links and storyboards use this (file#id). Renaming updates every link."><span>Id</span><ScreenId id={sel.screen} onRename={(to) => a.renameScreen(sel.screen, to)} /></label>
        <label className="field inline"><span>Start screen</span><input type="checkbox" checked={startScreen(doc) === sel.screen} onChange={() => a.edit({ ...doc, start: sel.screen })} /></label>
        <label className="field"><span>Device</span>
          <select value={typeof sc.device === "string" ? sc.device : ""} onChange={(e) => a.setProp(["screens", sel.screen], "device", e.target.value || undefined)}>
            <option value="">same as the flow</option>{Object.keys(DEVICES).map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="field inline" title="Long pages grow to fit instead of clipping"><span>Scrolls (long page)</span><input type="checkbox" checked={sc.scroll === true} onChange={(e) => a.setProp(["screens", sel.screen], "scroll", e.target.checked || undefined)} /></label>
        <label className="field inline"><span>Side by side (sidebar layout)</span><input type="checkbox" checked={sc.dir === "right"} onChange={(e) => a.setProp(["screens", sel.screen], "dir", e.target.checked ? "right" : undefined)} /></label>
        <label className="field"><span>Note</span><TextIn multiline value={sc.note ?? ""} onChange={(v) => a.setProp(["screens", sel.screen], "note", v, `${sel.screen}.note`)} /></label>
        <div className="actions">
          <button className="btn dark" onClick={() => a.play(sel.screen)}>Play from here</button>
          <button className="btn" onClick={a.copyScreenImage}>Copy as image</button>
          <button className="btn" onClick={a.copyPointer}>Copy screen pointer</button>
          <button className="btn" onClick={a.duplicateScreen}>Duplicate screen</button>
          <button className="btn danger" disabled={screens.length <= 1} onClick={a.deleteScreen}>Delete screen</button>
        </div>
      </aside>
    );
  }

  const l = layouts[sel.screen];
  const isItem = sel.key.includes("#");
  const itemBox: ItemBox | undefined = isItem ? l?.items.find((it) => it.key === sel.key) : undefined;
  const nodeKey = sel.key.split("#")[0];
  const path = pathOf(sel.screen, nodeKey);
  const raw = getAt(doc, path) as WNode | undefined;
  if (!raw) return <aside className="inspector" />;
  const node = resolveNode(doc, raw);
  const type = String(node.type ?? "sketch");
  const def = COMPONENTS[type];
  const cat = CATEGORIES.find((c) => c.id === def?.category);
  const crumbs: { key: string; label: string }[] = [];
  const parts = nodeKey.split("/");
  for (let i = 2; i < parts.length; i += 2) {
    const k = parts.slice(0, i).join("/");
    const pn = getAt(doc, pathOf(sel.screen, k)) as WNode | undefined;
    if (pn) crumbs.push({ key: k, label: String(pn.type ?? pn.use) });
  }
  const nudged = typeof raw.id === "string" && doc.layout?.[sel.screen]?.[raw.id];
  const own = Object.entries(def?.props ?? {}).filter(([k]) => k !== "children");
  const commonKeys = ["goes", "pin", "width", "height", "grow", "id", "note"];

  return (
    <aside className="inspector">
      <div className="crumbs">
        <button onClick={() => a.select({ screen: sel.screen, key: "" })}>{sc.title ?? sel.screen}</button>
        {crumbs.map((c) => <button key={c.key} onClick={() => a.select({ screen: sel.screen, key: c.key })}>{c.label}</button>)}
        {isItem ? <button onClick={() => a.select({ screen: sel.screen, key: nodeKey })}>{type}</button> : null}
      </div>
      <h3>{isItem ? `${humanize(type)} item` : humanize(type)}{raw.use ? <small> shared “{raw.use}”</small> : cat ? <small> {cat.label}</small> : null}</h3>
      {def ? <p className="doc">{def.doc}</p> : null}
      <Issues result={result} prefix={dotted(path)} />
      {isItem && itemBox ? (
        <ItemFields type={type} node={raw.use ? { ...node, ...raw } : raw} path={path} index={itemBox.index} navbar={type === "navbar"} screens={screens} a={a} />
      ) : (
        <>
          {own.map(([k, d]) => <Field key={k} k={k} d={d} node={raw.use ? { ...node, ...raw } : raw} path={path} screens={screens} a={a} focusText={focusText} />)}
          <h4>Link and layout</h4>
          {commonKeys.map((k) => <Field key={k} k={k} d={k === "width" ? { type: { kind: "enum", values: ["fill", "hug"] }, doc: COMMON.width.doc } : k === "pin" ? { type: { kind: "enum", values: PINS }, doc: COMMON.pin.doc } : COMMON[k]} node={raw} path={path} screens={screens} a={a} focusText={focusText} />)}
          {typeof raw.width === "number" ? <p className="hint">Width is {raw.width}px.</p> : null}
        </>
      )}
      <div className="actions">
        <button className="btn" title="Move up (⌥↑)" onClick={() => a.move(-1)}>↑</button>
        <button className="btn" title="Move down (⌥↓)" onClick={() => a.move(1)}>↓</button>
        <button className="btn" title="Duplicate (⌘D)" onClick={a.duplicate}>Duplicate</button>
        <button className="btn danger" title="Delete (⌫)" onClick={a.remove}>Delete</button>
        {nudged ? <button className="btn" onClick={a.resetNudge}>Reset nudge</button> : null}
        <button className="btn" title="A pointer to paste to your agent" onClick={a.copyPointer}>Copy for agent</button>
      </div>
      <p className="hint mono">{keyOf(path)}</p>
    </aside>
  );
}

function ItemFields({ type, node, path, index, navbar, screens, a }: { type: string; node: WNode; path: (string | number)[]; index: number; navbar: boolean; screens: string[]; a: InspectorActions }) {
  const prop = navbar ? "actions" : "items";
  const items = (Array.isArray(node[prop]) ? node[prop] : []) as Item[];
  const one = items[index];
  if (one === undefined) return null;
  return (
    <>
      <ItemsEditor type={type} items={[one]} screens={screens} onChange={(v) => a.setProp(path, prop, items.map((it, i) => (i === index ? v[0] : it)).filter((x) => x !== undefined), `${path.join(".")}.${prop}.${index}`)} />
      <p className="hint">Item {index + 1} of {items.length}. Select the {type} itself to add or remove items.</p>
    </>
  );
}

function ScreenId({ id, onRename }: { id: string; onRename: (to: string) => void }) {
  const [v, setV] = useState(id);
  useEffect(() => setV(id), [id]);
  const done = () => { const to = v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""); if (to && to !== id) onRename(to); else setV(id); };
  return <input type="text" value={v} onChange={(e) => setV(e.target.value)} onBlur={done} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />;
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Result } from "../../vendor/sketch/suggest";
import { arrows as arrowsOf, bounds, laneSpace, layoutAll, positions } from "../render/flow";
import { startScreen, type Item, type WireframeFile, type WNode } from "../types";
import { validate } from "../validate";
import { COMPONENTS } from "../vocab";
import { api, bakedUrl } from "./api";
import { Canvas, type View } from "./Canvas";
import { Inspector, type InspectorActions } from "./Inspector";
import * as M from "./model";
import { Palette } from "./Palette";
import { Play } from "./Play";

const CLIP = "wireframe-kit/node";

export function App() {
  const [doc, setDoc] = useState<WireframeFile | null>(null);
  const [draft, setDraft] = useState<WireframeFile | null>(null);
  const [result, setResult] = useState<Result>();
  const [file, setFile] = useState("");
  const [bust, setBust] = useState(0);
  const [sel, setSel] = useState<M.Sel>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 0.5 });
  const [dragging, setDragging] = useState(false);
  const [play, setPlay] = useState<string | null>(null);
  const [palette, setPalette] = useState(true);
  const [focusText, setFocusText] = useState(0);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
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
  const edit = (next: WireframeFile, coalesce?: string) => {
    if (!doc) return;
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

  const a: InspectorActions = {
    edit,
    setProp: (path, prop, value, co) => doc && edit(M.setProp(doc, path, prop, value), co),
    select: setSel,
    remove: () => {
      if (!doc || !sel) return;
      if (!sel.key) { a.deleteScreen(); return; }
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
    move: (delta) => {
      if (!doc || !sel?.key || sel.key.includes("#")) return;
      const r = M.move(doc, M.pathOf(sel.screen, sel.key), delta);
      if (r.doc !== doc) { edit(r.doc); setSel({ screen: sel.screen, key: M.keyOf(r.path) }); }
    },
    duplicate: () => {
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
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        flash("Screen copied as an image. Paste it into Slack, Miro, Figma…");
      } catch { flash("This browser won't copy images. Use Export instead."); }
    },
    play: (screen) => setPlay(screen ?? (doc ? startScreen(doc) : null)),
    focusScreen: (id) => {
      const l = layouts[id], p = pos[id], el = canvasEl.current;
      if (!l || !p || !el) return;
      const r = el.getBoundingClientRect();
      const k = Math.min(1, (r.height - 120) / l.h);
      setView({ k, x: r.width / 2 - (p[0] + l.w / 2) * k, y: r.height / 2 - (p[1] + l.h / 2) * k });
      setSel({ screen: id, key: "" });
    },
  };

  const onNudge = (screen: string, key: string, dx: number, dy: number, commit: boolean) => {
    if (!doc) return;
    const path = M.pathOf(screen, key);
    const { doc: withId, id } = M.ensureId(doc, screen, path);
    const cur = doc.layout?.[screen]?.[id] ?? {};
    const nx = (cur.dx ?? 0) + dx, ny = (cur.dy ?? 0) + dy;
    const nudge = { ...cur, dx: nx || undefined, dy: ny || undefined };
    const clean = Object.fromEntries(Object.entries(nudge).filter(([, v]) => v !== undefined));
    const next = M.setAt(withId, ["layout", screen, id], Object.keys(clean).length ? clean : undefined);
    if (commit) { setDraft(null); if (dx || dy) edit(next); } else setDraft(next);
  };
  const onMoveScreen = (screen: string, x: number, y: number, commit: boolean) => {
    if (!doc) return;
    // first move freezes every screen where it is, so moving one doesn't shuffle the rest
    const canvas: Record<string, [number, number]> = { ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, [v[0], v[1]] as [number, number]])), ...(doc.canvas ?? {}), [screen]: [x, y] };
    const next = { ...doc, canvas };
    if (commit) { setDraft(null); edit(next); } else setDraft(next);
  };

  const onInsert = (type: string) => {
    const ex = M.clone(COMPONENTS[type].example) as WNode;
    insertNode(ex);
  };

  // keyboard
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (play) return;
      const typing = (e.target as HTMLElement).closest("input,textarea,select,[contenteditable]");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) step(redo, undo); else step(undo, redo); return; }
      if (typing) return;
      if (e.key === "Escape") { setSel(null); setMenu(false); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); a.remove(); return; }
      if (mod && e.key.toLowerCase() === "d" && sel) { e.preventDefault(); a.duplicate(); return; }
      if (mod && e.key.toLowerCase() === "c" && sel?.key && doc) {
        const n = M.getAt(doc, M.pathOf(sel.screen, sel.key.split("#")[0]));
        e.preventDefault();
        await navigator.clipboard.writeText(JSON.stringify({ [CLIP]: n }, null, 2)).catch(() => undefined);
        flash("Copied. Paste into any wireframe, or to your agent as JSON.");
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && doc) {
        const text = await navigator.clipboard.readText().catch(() => "");
        try {
          const o = JSON.parse(text);
          const n = o?.[CLIP] ?? (o?.type || o?.use ? o : undefined);
          if (n) { e.preventDefault(); insertNode(n); }
        } catch { /* not ours */ }
        return;
      }
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); a.move(e.key === "ArrowUp" ? -1 : 1); return; }
      if (sel?.key && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? 8 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0, dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        onNudge(sel.screen, sel.key.split("#")[0], dx, dy, true);
        return;
      }
      if (e.key === "Enter" && sel) { e.preventDefault(); setFocusText((n) => n + 1); return; }
      if (e.key.toLowerCase() === "p" && !mod) { a.play(sel?.screen); return; }
      if (e.key === "0" && mod) { e.preventDefault(); fit(); return; }
      if (e.key === "1" && e.shiftKey) { fit(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => { if (sel) lastScreen.current = sel.screen; }, [sel]);
  // read-only hook for the end-to-end tests: where things are on the canvas
  useEffect(() => { (window as unknown as { __wf: unknown }).__wf = { layouts, pos, view, sel }; }, [layouts, pos, view, sel]);

  // drop a picture: it becomes an image (sketchified), or the selected image's picture
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
    if (!f || !doc) return;
    const { path } = await api.upload(f);
    setBust((b) => b + 1);
    const selNode = sel?.key && !sel.key.includes("#") ? (M.getAt(doc, M.pathOf(sel.screen, sel.key)) as WNode) : undefined;
    if (selNode?.type === "image") edit(M.setProp(doc, M.pathOf(sel!.screen, sel!.key), "src", path));
    else insertNode({ type: "image", src: path, label: f.name.replace(/\.[^.]+$/, "") });
  };

  if (error && !doc) return <div className="boot">Couldn't load the wireframe: {error}</div>;
  if (!doc || !shown) return <div className="boot">Loading…</div>;

  const errs = result?.errors.length ?? 0, warns = result?.warnings.length ?? 0;
  return (
    <div className="app">
      <header className="top">
        <span className="brand">Wireframe Kit</span>
        <span className="file" title={file}>{file}</span>
        <button className={`btn${palette ? " on" : ""}`} onClick={() => setPalette(!palette)}>Components</button>
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
          </div> : null}
        </div>
        <button className="btn dark" onClick={() => a.play(sel?.screen)} title="Click through the flow (P)">Play</button>
      </header>
      <div className={`main${palette ? " with-palette" : ""}`}>
        {palette ? <Palette onInsert={onInsert} onClose={() => setPalette(false)} /> : null}
        <div className="canvas-wrap" ref={canvasEl} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <Canvas doc={shown} layouts={layouts} pos={pos} arrows={arr} below={laneSpace(arr)} view={view} setView={setView}
            sel={sel} onSelect={setSel} onNudge={onNudge} onMoveScreen={onMoveScreen} onEdit={() => setFocusText((n) => n + 1)}
            asset={asset} dragging={dragging} setDragging={setDragging} />
          {error ? <div className="banner">{error}</div> : null}
        </div>
        <Inspector doc={doc} layouts={layouts} sel={sel} result={result} a={a} focusText={focusText} />
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
      {play ? <Play doc={doc} start={play} asset={asset} onExit={(last) => { setPlay(null); setSel({ screen: last, key: "" }); }} /> : null}
    </div>
  );
}

export type { Item };

import { useState } from "react";
import { Icon } from "../render/icons";
import { CATEGORIES, COMPONENTS, ICONS, starterOf } from "../vocab";
import { NodePreview } from "./Preview";

export const NODE_MIME = "application/x-wireframe-node";

/** Every component (and icon) as a real thumbnail. Click to add it to the layout; drag it onto a screen to place it freely. */
export function Palette({ onInsert, onClose, onUpload }: { onInsert: (node: Record<string, unknown>) => void; onClose: () => void; onUpload: (f: File) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"components" | "icons">("components");
  const g = q.trim().toLowerCase();
  const drag = (node: Record<string, unknown>) => (e: React.DragEvent) => {
    e.dataTransfer.setData(NODE_MIME, JSON.stringify(node));
    e.dataTransfer.effectAllowed = "copy";
  };
  return (
    <aside className="palette">
      <div className="palette-top">
        <div className="seg">
          <button className={tab === "components" ? "on" : ""} onClick={() => setTab("components")}>Components</button>
          <button className={tab === "icons" ? "on" : ""} onClick={() => setTab("icons")}>Icons</button>
        </div>
        <button className="btn ghost" title="Close" onClick={onClose}>×</button>
      </div>
      <input type="search" className="palette-find" placeholder={tab === "icons" ? "Find an icon" : "Find a component"} value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="palette-hint">Click to add to the layout. Drag onto a screen to place it anywhere.</p>
      <label className="btn small upload-btn" title="A photo, a screenshot or a sketch. It's sketchified in grays to match (switch that off in the inspector). You can also drop or paste images onto a screen.">
        Add an image…
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      </label>
      {tab === "icons" ? (
        <div className="icon-grid">
          {ICONS.filter((i) => !g || i.includes(g)).map((i) => {
            const node = { type: "icon", icon: i };
            return (
              <button key={i} className="icon-tile" title={i} draggable onDragStart={drag(node)} onClick={() => onInsert(node)}>
                <svg viewBox="0 0 24 24" width={26} height={26}><Icon name={i} x={0} y={0} /></svg>
                <span>{i}</span>
              </button>
            );
          })}
        </div>
      ) : CATEGORIES.map((c) => {
        const list = Object.values(COMPONENTS).filter((d) => d.category === c.id && (!g || `${d.type} ${d.doc}`.toLowerCase().includes(g)));
        if (!list.length) return null;
        return (
          <section key={c.id}>
            <h4>{c.label}</h4>
            <div className="tiles">
              {list.map((d) => {
                const node = starterOf(d.type);
                return (
                  <button key={d.type} className="tile" title={d.doc} draggable onDragStart={drag(node)} onClick={() => onInsert(node)}>
                    <NodePreview node={node} type={d.type} />
                    <span className="name">{d.type}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

import { useState } from "react";
import { CATEGORIES, COMPONENTS } from "../vocab";

/** Every component, by category. Click to add it after the selection (or into a selected container). */
export function Palette({ onInsert, onClose }: { onInsert: (type: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const g = q.trim().toLowerCase();
  return (
    <aside className="palette">
      <div className="palette-top">
        <input type="search" placeholder="Find a component" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" title="Close" onClick={onClose}>×</button>
      </div>
      {CATEGORIES.map((c) => {
        const list = Object.values(COMPONENTS).filter((d) => d.category === c.id && (!g || `${d.type} ${d.doc}`.toLowerCase().includes(g)));
        if (!list.length) return null;
        return (
          <section key={c.id}>
            <h4>{c.label}</h4>
            <div className="tiles">
              {list.map((d) => <button key={d.type} className="tile" title={d.doc} onClick={() => onInsert(d.type)}>{d.type}</button>)}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

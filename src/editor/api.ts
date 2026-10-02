import type { Op } from "../../vendor/sketch/json";
import type { Result } from "../../vendor/sketch/suggest";
import type { WireframeFile } from "../types";

export interface Loaded { doc: WireframeFile; version: number; file?: string; result: Result }

const H = { "content-type": "application/json", "x-wireframe": "1" };

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || r.statusText);
  return r.json() as Promise<T>;
}

export const api = {
  load: () => fetch("/api/file").then((r) => ok<Loaded>(r)),
  patch: (ops: Op[]) => fetch("/api/file", { method: "PATCH", headers: H, body: JSON.stringify({ ops }) }).then((r) => ok<Loaded>(r)),
  put: (doc: WireframeFile) => fetch("/api/file", { method: "PUT", headers: H, body: JSON.stringify(doc) }).then((r) => ok<Loaded>(r)),
  upload: (file: File) =>
    fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "x-wireframe": "1" }, body: file }).then((r) => ok<{ path: string }>(r)),
};

/** Image `src` paths, sketchified in greys by the dev server. */
export const bakedUrl = (bust: number) => (p: string) => `/baked/${p.replace(/^\.\//, "").split("/").map(encodeURIComponent).join("/")}?v=${bust}`;

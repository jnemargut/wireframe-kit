import { toPrototypeHTML } from "../prototype";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { bakeImage, croppedImage, isCrop, type Crop } from "../../vendor/sketch/bake";
import { applyOps, formatJSON, type Op } from "../../vendor/sketch/json";
import { eventHub, listenFree, openBrowser, readBody, safePathUnder, sendJSON, serveStatic, TYPES } from "../../vendor/sketch/server";
import { cacheDirFor, cropPNG, flowPNG, flowSVGFile, screenPNG, stemOf, toPDF } from "../export";
import type { WireframeFile } from "../types";
import { validate } from "../validate";

const EDITOR_DIR = fileURLToPath(new URL("./editor/", import.meta.url));

export interface DevOptions { port: number; open: boolean }

export async function dev(file: string, o: DevOptions) {
  const abs = resolve(file);
  const base = dirname(abs);
  if (!existsSync(abs)) throw new Error(`No such file: ${file}. Create it first (wf new ${file}).`);
  if (!existsSync(join(EDITOR_DIR, "index.html"))) throw new Error("Editor build missing. Run `npm run build` in the wireframekit package.");

  let lastWritten = "";
  let version = 0;
  const events = eventHub();
  const read = (): WireframeFile => JSON.parse(readFileSync(abs, "utf8"));
  const write = (d: WireframeFile) => { lastWritten = formatJSON(d); writeFileSync(abs, lastWritten); version++; };
  const reply = (d: WireframeFile) => ({ doc: d, version, file: basename(abs), result: validate(d) });

  let t: NodeJS.Timeout | undefined;
  watch(abs, () => {
    clearTimeout(t);
    t = setTimeout(() => {
      let text = "";
      try { text = readFileSync(abs, "utf8"); } catch { return; }
      if (text === lastWritten) return;
      try { JSON.parse(text); } catch { events.broadcast({ type: "invalid", message: "The file isn't valid JSON right now (still being written?)." }); return; }
      version++;
      events.broadcast({ type: "change", version, source: "file" });
    }, 120);
  });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    // Writes need a custom header: browsers can't send it cross-site without a CORS preflight we never grant.
    if (req.method !== "GET" && req.headers["x-wireframe"] !== "1") { res.writeHead(403); return res.end("forbidden"); }
    try {
      if (url.pathname === "/api/file" && req.method === "GET") return sendJSON(res, 200, reply(read()));
      if (url.pathname === "/api/file" && req.method === "PATCH") {
        const { ops } = JSON.parse((await readBody(req)).toString()) as { ops: Op[] };
        const next = applyOps(read(), ops);
        write(next);
        events.broadcast({ type: "change", version, source: "editor" });
        return sendJSON(res, 200, reply(next));
      }
      if (url.pathname === "/api/file" && req.method === "PUT") {
        const next = JSON.parse((await readBody(req)).toString()) as WireframeFile;
        write(next);
        events.broadcast({ type: "change", version, source: "editor" });
        return sendJSON(res, 200, reply(next));
      }
      if (url.pathname === "/api/events") return events.attach(req, res, { type: "hello", version });
      if (url.pathname.startsWith("/baked/")) {
        const p = safePathUnder(base, url.pathname.slice("/baked/".length));
        if (!p || !existsSync(p)) { res.writeHead(404); return res.end(); }
        const crop = url.searchParams.get("crop")?.split(",").map(Number) as Crop | undefined;
        const c = isCrop(crop) ? crop : undefined;
        const o = { mirror: url.searchParams.get("mirror") === "1", turn: Number(url.searchParams.get("turn") ?? 0) };
        if (url.searchParams.get("raw")) { const pic = croppedImage(p, cacheDirFor(abs), c, o); res.writeHead(200, { "content-type": pic.mime, "cache-control": "no-cache" }); return res.end(pic.buf); }
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache" });
        return res.end(bakeImage(p, cacheDirFor(abs), 1, "grey", c, o));
      }
      if (url.pathname === "/api/upload" && req.method === "POST") {
        const raw = (url.searchParams.get("name") ?? "image.png").toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
        const ext = [".png", ".jpg", ".jpeg", ".webp"].includes(extname(raw)) ? "" : ".png";
        const dir = join(base, "images");
        mkdirSync(dir, { recursive: true });
        let name = raw + ext, i = 2;
        while (existsSync(join(dir, name))) name = `${basename(raw, extname(raw))}-${i++}${extname(raw) || ext}`;
        writeFileSync(join(dir, name), await readBody(req));
        return sendJSON(res, 200, { path: "./" + relative(base, join(dir, name)).split(sep).join("/") });
      }
      if (url.pathname === "/api/screen.png") {
        const d = read();
        const id = url.searchParams.get("id") ?? "";
        if (!d.screens[id]) { res.writeHead(404); return res.end(); }
        const scale = Math.min(4, Math.max(1, Number(url.searchParams.get("scale") ?? 2)));
        const full = screenPNG(d, abs, id, scale);
        res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache" });
        // a part of the screen (one copied element): crop the whole screen's picture
        const q = (k: string) => Number(url.searchParams.get(k));
        if (url.searchParams.has("w") && [q("x"), q("y"), q("w"), q("h")].every(Number.isFinite)) return res.end(cropPNG(full, q("x"), q("y"), Math.max(1, q("w")), Math.max(1, q("h")), scale));
        return res.end(full);
      }
      if (url.pathname === "/api/export") {
        const d = read();
        const fmt = url.searchParams.get("format") ?? "png";
        const stem = stemOf(abs);
        if (fmt === "pdf") {
          res.writeHead(200, { "content-type": "application/pdf", "content-disposition": `attachment; filename="${stem}.pdf"` });
          return res.end(Buffer.from(await toPDF(d, abs)));
        }
        if (fmt === "html") {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-disposition": `attachment; filename="${stem}.html"` });
          return res.end(toPrototypeHTML(d, abs));
        }
        if (fmt === "svg") {
          res.writeHead(200, { "content-type": "image/svg+xml", "content-disposition": `attachment; filename="${stem}.svg"` });
          return res.end(flowSVGFile(d, abs));
        }
        res.writeHead(200, { "content-type": "image/png", "content-disposition": `attachment; filename="${stem}.png"` });
        return res.end(flowPNG(d, abs, Number(url.searchParams.get("scale") ?? 1.5)));
      }
      if (serveStatic(EDITOR_DIR, url.pathname, res)) return;
      res.writeHead(404); res.end("not found");
    } catch (e) {
      sendJSON(res, 500, { error: (e as Error).message });
    }
  });

  const port = await listenFree(server, o.port);
  const link = `http://localhost:${port}/`;
  console.log(`wireframe editor → ${link}\n  editing ${relative(process.cwd(), abs)} (changes save to the file; agent edits reload live)\n  Ctrl+C to stop`);
  if (o.open) openBrowser(link);
}

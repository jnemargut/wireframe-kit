import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { bakeImage, croppedImage, isCrop } from "../vendor/sketch/bake";
import { drawingFonts, fontFaceCss } from "../vendor/sketch/fonts";
import { initRenderer, renderPNG } from "../vendor/sketch/resvg";
import { layoutScreen } from "./layout";
import { embedSource } from "./png";
import { flowSVG } from "./render/flow";
import { screenSVG } from "./render/screen";
import type { WireframeFile } from "./types";

export { initRenderer };

export const cacheDirFor = (file: string) => join(dirname(resolve(file)), ".wireframe-cache");
export const stemOf = (file: string) => basename(file).replace(/\.wireframe\.json$|\.json$/, "");
/** Where a screen's PNG goes: next to the file, "<name>.<screen>.png" (what Storyboard Kit looks for). */
export const screenPNGPath = (file: string, screen: string) => join(dirname(resolve(file)), `${stemOf(file)}.${screen}.png`);

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** Image `src` paths become sketchified (gray) data URIs, or the picture as it is with `raw`. */
export function assetResolver(file: string) {
  const base = dirname(resolve(file));
  const memo = new Map<string, string | undefined>();
  return (p: string, raw?: boolean, crop?: number[]) => {
    const c = isCrop(crop) ? crop : undefined;
    const k = `${p}:${!!raw}:${c?.join(",") ?? ""}`;
    if (memo.has(k)) return memo.get(k);
    const abs = resolve(base, p);
    let uri: string | undefined;
    if (existsSync(abs)) {
      try {
        if (raw) { const pic = croppedImage(abs, cacheDirFor(file), c); uri = `data:${pic.mime};base64,${pic.buf.toString("base64")}`; }
        else uri = `data:image/png;base64,${bakeImage(abs, cacheDirFor(file), 1, "grey", c).toString("base64")}`;
      }
      catch { uri = undefined; }
    }
    memo.set(k, uri);
    return uri;
  };
}

export function screenPNG(doc: WireframeFile, file: string, screen: string, scale = 2): Buffer {
  const png = renderPNG(screenSVG(doc, screen, { asset: assetResolver(file) }), { scale, fonts: drawingFonts() });
  return embedSource(png, { file: basename(file), screen, source: doc });
}

/** Render one screen (or all) to PNGs next to the file. Returns the paths written. */
export function renderScreens(doc: WireframeFile, file: string, screens: string[], scale = 2, size?: { w: number; h: number }): string[] {
  const out: string[] = [];
  for (const id of screens) {
    const d = size ? { ...doc, device: size } : doc;
    const p = screenPNGPath(file, id);
    writeFileSync(p, screenPNG(d, file, id, scale));
    out.push(p);
  }
  return out;
}

export const flowPNG = (doc: WireframeFile, file: string, scale = 1.5) => renderPNG(flowSVG(doc, { asset: assetResolver(file) }), { scale, fonts: drawingFonts() });
export const flowSVGFile = (doc: WireframeFile, file: string) => flowSVG(doc, { asset: assetResolver(file), fontCss: fontFaceCss() });

/** A PDF with the flow sheet first, then one page per screen. */
export async function toPDF(doc: WireframeFile, file: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.title);
  const add = async (png: Buffer, w: number, h: number) => {
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([w * 0.75, h * 0.75]);
    page.drawImage(img, { x: 0, y: 0, width: w * 0.75, height: h * 0.75 });
  };
  const flow = flowPNG(doc, file, 1.5);
  await add(flow, flow.readUInt32BE(16) / 1.5, flow.readUInt32BE(20) / 1.5);
  for (const id of Object.keys(doc.screens)) {
    const l = layoutScreen(doc, id);
    await add(renderPNG(screenSVG(doc, id, { asset: assetResolver(file) }), { scale: 2, fonts: drawingFonts() }), l.w, l.h);
  }
  return pdf.save();
}

/** Cut a region (in screen px) out of a rendered PNG. Done by placing the picture, so no filter runs off the edge. */
export function cropPNG(png: Buffer, x: number, y: number, w: number, h: number, scale: number): Buffer {
  const W = png.readUInt32BE(16), H = png.readUInt32BE(20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"><rect width="100%" height="100%" fill="#fbfaf7"/><image href="data:image/png;base64,${png.toString("base64")}" x="${-x * scale}" y="${-y * scale}" width="${W}" height="${H}"/></svg>`;
  return renderPNG(svg);
}

export function ensureDir(p: string) { mkdirSync(p, { recursive: true }); return p; }

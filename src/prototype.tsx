/**
 * A clickable prototype in one HTML file: every screen in its device, the links you set with `goes`, back
 * navigation, and a "show what's clickable" toggle. No install, no server: send it, open it, click through.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceChrome } from "../vendor/sketch/device-chrome";
import { fontFaceCss } from "../vendor/sketch/fonts";
import { layoutScreen } from "./layout";
import { assetResolver } from "./export";
import { bezelOf } from "./render/flow";
import { ScreenArt } from "./render/screen";
import { startScreen, type WireframeFile } from "./types";

interface Hot { x: number; y: number; w: number; h: number; goes: string }
interface ScreenOut { id: string; title: string; w: number; h: number; svg: string; hots: Hot[] }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function toPrototypeHTML(doc: WireframeFile, file: string): string {
  const asset = assetResolver(file);
  const screens: ScreenOut[] = Object.keys(doc.screens).map((id) => {
    const l = layoutScreen(doc, id);
    const bz = bezelOf(l, doc);
    const fw = l.w + bz.l + bz.r, fh = l.h + bz.t + bz.b;
    const hots: Hot[] = [];
    for (const b of l.boxes) {
      if (b.hidden) continue;
      if (b.goes) hots.push({ x: b.x, y: b.y, w: b.w, h: b.h, goes: b.goes });
      if (b.type === "navbar" && b.node.back) hots.push({ x: b.x + 4, y: b.y + 4, w: 48, h: 48, goes: "back" });
    }
    for (const it of l.items) if (it.goes) hots.push({ x: it.x, y: it.y, w: it.w, h: it.h, goes: it.goes });
    // later boxes sit on top: test them first
    hots.reverse();
    const svg = renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-bz.l} ${-bz.t} ${fw} ${fh}`} width={fw} height={fh}>
        {bz.kind !== "none" ? <DeviceChrome kind={bz.kind} w={l.w} h={l.h} /> : null}
        <ScreenArt layout={l} shapes={doc.screens[id]?.shapes} opts={{ asset, uid: `p-${id.replace(/[^a-z0-9]/gi, "_")}`, rx: bz.screenRx }} />
      </svg>,
    );
    return { id, title: doc.screens[id]?.title ?? id, w: fw, h: fh, svg, hots: hots.map((h) => ({ ...h, x: h.x + bz.l, y: h.y + bz.t })) };
  });
  const start = startScreen(doc);
  const data = JSON.stringify({ start, screens: screens.map(({ svg: _s, ...rest }) => rest) });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.title)}: clickable prototype</title>
<style>
${fontFaceCss()}
:root { --ink: #1c1c1e; --paper: #fbfaf7; --g1: #e4e6e8; --g5: #959ba2; --g7: #6f777f; --act: #e8590c; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #ececea; color: var(--ink); font: 15px/1.4 "Patrick Hand", system-ui, sans-serif; }
header { position: fixed; inset: 0 0 auto 0; height: 52px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: var(--paper); border-bottom: 2px solid var(--ink); z-index: 2; }
header h1 { font: 22px "Permanent Marker", cursive; margin: 0 6px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
header .where { color: var(--g7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
button { font: 15px "Patrick Hand", system-ui, sans-serif; background: var(--paper); border: 2px solid var(--ink); padding: 3px 12px; cursor: pointer; }
button:hover { background: var(--g1); }
button.on { background: var(--ink); color: var(--paper); }
button:disabled { opacity: .4; cursor: default; }
main { position: fixed; inset: 52px 0 34px 0; display: grid; place-items: center; padding: 16px; }
.stage { position: relative; }
.stage svg { display: block; width: 100%; height: 100%; }
.hot { position: absolute; border-radius: 8px; cursor: pointer; }
.hot:hover, body.hints .hot { outline: 3px solid var(--act); background: rgba(232, 89, 12, .08); }
.tap { position: absolute; width: 44px; height: 44px; margin: -22px; border: 4px solid var(--act); border-radius: 50%; pointer-events: none; animation: tap .45s ease-out forwards; }
@keyframes tap { from { transform: scale(.4); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
footer { position: fixed; inset: auto 0 0 0; height: 34px; display: flex; align-items: center; justify-content: center; color: var(--g7); font-size: 14px; padding: 0 12px; text-align: center; }
@media (max-width: 560px) { header h1 { display: none; } }
</style></head>
<body>
<header>
  <h1>${esc(doc.title)}</h1>
  <span class="where" id="where"></span>
  <button id="back" title="Back (←)">← Back</button>
  <button id="hints" title="Show everything you can click (H)">Show links</button>
  <button id="restart" title="Start over (R)">Start over</button>
</header>
<main><div class="stage" id="stage"></div></main>
<footer id="foot">Click anything that looks clickable. Click empty space to see what is.</footer>
${screens.map((s) => `<template id="s-${esc(s.id)}">${s.svg}</template>`).join("\n")}
<script>
const D = ${data.replace(/</g, "\\u003c")};
const byId = Object.fromEntries(D.screens.map((s) => [s.id, s]));
let stack = [D.start];
const stage = document.getElementById("stage");
function fit() {
  const s = byId[stack[stack.length - 1]];
  const m = document.querySelector("main").getBoundingClientRect();
  const k = Math.min(1.6, (m.width - 32) / s.w, (m.height - 32) / s.h);
  stage.style.width = s.w * k + "px"; stage.style.height = s.h * k + "px";
  return k;
}
function show() {
  const s = byId[stack[stack.length - 1]];
  stage.innerHTML = document.getElementById("s-" + s.id).innerHTML;
  const k = fit();
  for (const h of s.hots) {
    const a = document.createElement("div");
    a.className = "hot";
    a.title = h.goes === "back" ? "Back" : "Go to " + (byId[h.goes]?.title ?? h.goes);
    Object.assign(a.style, { left: (h.x / s.w) * 100 + "%", top: (h.y / s.h) * 100 + "%", width: (h.w / s.w) * 100 + "%", height: (h.h / s.h) * 100 + "%" });
    a.onclick = (e) => { e.stopPropagation(); ripple(e); setTimeout(() => go(h.goes), 140); };
    stage.appendChild(a);
  }
  document.getElementById("where").textContent = s.title + (stack.length > 1 ? " · step " + stack.length : "");
  document.getElementById("back").disabled = stack.length < 2;
  document.getElementById("foot").textContent = s.hots.length ? s.hots.length + " link" + (s.hots.length === 1 ? "" : "s") + " here. Click empty space to see them." : "No links on this screen. Use Back.";
  document.title = s.title + " · ${esc(doc.title).replace(/`/g, "")}";
}
function ripple(e) {
  const r = stage.getBoundingClientRect(), t = document.createElement("div");
  t.className = "tap"; t.style.left = e.clientX - r.left + "px"; t.style.top = e.clientY - r.top + "px";
  stage.appendChild(t); setTimeout(() => t.remove(), 500);
}
function go(target) {
  if (target === "back") { if (stack.length > 1) { stack.pop(); show(); } return; }
  if (byId[target] && target !== stack[stack.length - 1]) { stack.push(target); show(); }
}
stage.addEventListener("click", (e) => { ripple(e); document.body.classList.add("hints"); setTimeout(() => { if (!hintsOn) document.body.classList.remove("hints"); }, 700); });
let hintsOn = false;
document.getElementById("hints").onclick = () => { hintsOn = !hintsOn; document.body.classList.toggle("hints", hintsOn); document.getElementById("hints").classList.toggle("on", hintsOn); };
document.getElementById("back").onclick = () => go("back");
document.getElementById("restart").onclick = () => { stack = [D.start]; show(); };
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "Backspace") go("back");
  else if (e.key.toLowerCase() === "r") { stack = [D.start]; show(); }
  else if (e.key.toLowerCase() === "h") document.getElementById("hints").click();
});
addEventListener("resize", fit);
show();
</script>
</body></html>
`;
}

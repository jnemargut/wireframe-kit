// End to end: the built skill's CLI and editor, driven in a real browser.
// Run after `npm run build`: npm run e2e
import { spawn, execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const WF = join(process.cwd(), "skills/wireframe/scripts/wireframe.mjs");
const dir = mkdtempSync(join(tmpdir(), "wf-e2e-"));
const file = join(dir, "order-ahead.wireframe.json");
cpSync("examples/order-ahead.wireframe.json", file);
const read = () => JSON.parse(readFileSync(file, "utf8"));
let failures = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : ` ${extra}`}`); if (!cond) failures++; };
const until = async (fn, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 80)); } return false; };

// CLI
const cli = (...a) => execFileSync(process.execPath, [WF, ...a], { cwd: dir, encoding: "utf8" });
ok("validate passes the example", /is valid \(4 screens/.test(cli("validate", file)));
cli("render", `${file}#status`, "--quiet");
ok("render writes <name>.<screen>.png", existsSync(join(dir, "order-ahead.status.png")));
ok("the PNG carries its source", JSON.parse(cli("source", join(dir, "order-ahead.status.png"))).title === read().title);
cli("export", file, "--png", "--pdf");
ok("export writes the flow PNG and PDF", existsSync(join(dir, "order-ahead.png")) && existsSync(join(dir, "order-ahead.pdf")));
ok("vocab lists components", cli("vocab").includes("tabbar"));
let bad = "";
try { execFileSync(process.execPath, [WF, "validate", file], { cwd: dir, input: "" }); writeFileSync(join(dir, "bad.wireframe.json"), JSON.stringify({ title: "x", screens: { a: { children: [{ type: "buton" }] } } })); cli("validate", join(dir, "bad.wireframe.json")); } catch (e) { bad = String(e.stdout); }
ok("validate suggests fixes", bad.includes('Did you mean "button"'), bad);

// editor
const port = 4480 + Math.floor(Math.random() * 100);
const server = spawn(process.execPath, [WF, "dev", file, "--no-open", "--port", String(port)], { cwd: dir, stdio: ["ignore", "pipe", "inherit"] });
await new Promise((r) => server.stdout.on("data", (d) => String(d).includes("localhost") && r()));
const url = `http://localhost:${port}/`;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(8000);
const errors = [];
process.on("uncaughtException", (e) => { console.error(e); server.kill(); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error(e); server.kill(); process.exit(1); });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url);
await page.waitForSelector("svg.shot");
ok("canvas shows every screen", (await page.locator("svg.shot").count()) === 4);

/** Page coordinates of an element's centre on a screen. */
const at = async (screen, key) => page.evaluate(([s, k]) => {
  const { layouts, pos, view } = window.__wf;
  const l = layouts[s];
  const b = k.includes("#") ? l.items.find((it) => it.key === k) : l.boxes.find((bb) => bb.key === k);
  const c = document.querySelector(".canvas").getBoundingClientRect();
  return { x: c.left + view.x + (pos[s][0] + b.x + b.w / 2) * view.k, y: c.top + view.y + (pos[s][1] + b.y + b.h / 2) * view.k };
}, [screen, key]);
const payKey = await page.evaluate(() => window.__wf.layouts.cart.boxes.find((b) => b.id === "pay").key);

// select + edit text
let p = await at("cart", payKey);
await page.mouse.click(p.x, p.y);
await page.waitForSelector(".inspector h3:has-text('Button')");
ok("clicking selects the element", true);
await page.locator("#insp-text").fill("Place order");
ok("editing text saves to the file", await until(() => JSON.stringify(read()).includes("Place order")));

// nudge by dragging
p = await at("cart", payKey);
await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 30, p.y - 10, { steps: 6 }); await page.mouse.up();
ok("dragging saves a nudge", await until(() => !!read().layout?.cart?.pay?.dx));
await page.keyboard.press("Meta+z");
ok("undo removes the nudge", await until(() => !read().layout?.cart?.pay));

// insert from the palette into the selected screen
await page.mouse.click(10 + (await page.locator(".canvas").boundingBox()).x, 10 + (await page.locator(".canvas").boundingBox()).y);
p = await at("cart", "children/1");
await page.mouse.click(p.x, p.y);
await page.locator(".tile", { hasText: /^badge$/ }).click();
ok("palette inserts into the selected card", await until(() => JSON.stringify(read().screens.cart.children[1]).includes('"badge"')));

// agent edits reload live
const d = read(); d.screens.menu.title = "Menu (agent edit)"; writeFileSync(file, JSON.stringify(d, null, 2));
ok("agent edits show up live", await until(async () => (await page.locator(".screen-title .t", { hasText: "Menu (agent edit)" }).count()) > 0));

// rename a screen: links follow
await page.locator(".screen-title", { hasText: "Order status" }).click();
const idInput = page.getByRole("textbox", { name: "Id", exact: true });
await idInput.fill("tracking"); await idInput.press("Enter");
ok("renaming a screen updates every link", await until(() => { const r = read(); return !!r.screens.tracking && !JSON.stringify(r).includes('"goes": "status"') && !JSON.stringify(r).includes('"goes":"status"'); }));

// play through the flow
await page.keyboard.press("Escape");
await page.locator("button", { hasText: /^Play$/ }).click();
await page.waitForSelector(".play");
const dev = await page.locator(".play-device").boundingBox();
const item = await page.evaluate(() => { const l = window.__wf.layouts.menu; return l.items.find((it) => it.goes === "drink"); });
const k = dev.width / 390;
await page.mouse.click(dev.x + (item.x + item.w / 2) * k, dev.y + (item.y + item.h / 2) * k);
ok("play follows a link", await until(async () => (await page.locator(".play-title").textContent()) === "Oat latte"));
await page.keyboard.press("ArrowLeft");
ok("play goes back", await until(async () => (await page.locator(".play-title").textContent())?.startsWith("Menu")));
await page.keyboard.press("Escape");
ok("Esc leaves play", await until(async () => (await page.locator(".play").count()) === 0));

// export from the editor
const res = await page.request.get(`${url}api/export?format=png`);
ok("editor export returns a PNG", res.ok() && (await res.body()).readUInt32BE(0) === 0x89504e47);
const shot = await page.request.get(`${url}api/screen.png?id=menu`);
ok("copy-as-image endpoint returns a PNG", shot.ok());

ok("no console errors", errors.length === 0, errors.join("\n"));
await browser.close();
server.kill();
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);

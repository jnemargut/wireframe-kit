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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
const errors = [];
process.on("uncaughtException", (e) => { console.error(e); server.kill(); process.exit(1); });
process.on("unhandledRejection", (e) => { console.error(e); server.kill(); process.exit(1); });
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url);
await page.waitForSelector("svg.shot");
ok("canvas shows every screen", (await page.locator("svg.shot").count()) === 4);

/** Page coordinates of an element's center on a screen. */
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
await page.locator(".tile").filter({ has: page.locator(".name", { hasText: /^badge$/ }) }).click();
ok("palette inserts into the selected card", await until(() => JSON.stringify(read().screens.cart.children[1]).includes('"badge"')));

// selection drills in: first the list, then the row
await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
const row = await at("menu", "children/3#0");
await page.mouse.click(row.x, row.y);
const first = await page.evaluate(() => window.__wf.sel?.key);
await page.mouse.click(row.x, row.y);
const second = await page.evaluate(() => window.__wf.sel?.key);
ok("first click picks the list, the next one its row", first === "children/3" && second === "children/3#0", `${first} → ${second}`);
await page.keyboard.press("Escape");
ok("Esc steps out to the parent", (await page.evaluate(() => window.__wf.sel?.key)) === "children/3");

// edit words in place
const title = await at("menu", "children/0");
await page.mouse.dblclick(title.x, title.y);
await page.locator(".inline-edit").fill("Corner Coffee Co.");
await page.keyboard.press("Enter");
ok("double-click edits text in place", await until(() => read().screens.menu.children[0].text === "Corner Coffee Co."));

// drag a component from the palette onto a screen: it lands free, where it was dropped
const dt = await page.evaluateHandle(() => new DataTransfer());
const tile = page.locator(".tile").filter({ has: page.locator(".name", { hasText: /^button$/ }) });
await tile.dispatchEvent("dragstart", { dataTransfer: dt });
const origin = await page.evaluate(() => { const { pos, view } = window.__wf; const c = document.querySelector(".canvas").getBoundingClientRect(); return { x: c.left + view.x + pos.menu[0] * view.k, y: c.top + view.y + pos.menu[1] * view.k, k: view.k }; });
await page.locator(".canvas").dispatchEvent("drop", { dataTransfer: dt, clientX: origin.x + 200 * origin.k, clientY: origin.y + 500 * origin.k });
ok("dropping from the palette places it freely", await until(() => read().screens.menu.children.some((c) => Array.isArray(c.at) && c.type === "button")));
const freeKey = await page.evaluate(() => window.__wf.sel?.key);
const fb = await at("menu", freeKey);
await page.mouse.move(fb.x, fb.y); await page.mouse.down(); await page.mouse.move(fb.x + 40, fb.y + 30, { steps: 5 }); await page.mouse.up();
ok("dragging a free element moves its spot", await until(() => { const c = read().screens.menu.children.find((x) => Array.isArray(x.at) && x.type === "button"); return c && Math.abs(c.at[1] - (500 - 24)) > 20; }));
const he = await page.locator(".handle.h-e").boundingBox();
await page.mouse.move(he.x + 4, he.y + 4); await page.mouse.down(); await page.mouse.move(he.x + 60, he.y + 4, { steps: 5 }); await page.mouse.up();
ok("handles resize it", await until(() => { const c = read().screens.menu.children.find((x) => Array.isArray(x.at) && x.type === "button"); return c && c.width > 300; }));

// draw a red box
await page.keyboard.press("Escape");
await page.locator(".tools button[title='Box (R)']").click();
await page.locator(".tool-color > button").click();
await page.locator(".color-pop button[title='red']").click();
await page.mouse.move(origin.x + 40 * origin.k, origin.y + 300 * origin.k); await page.mouse.down(); await page.mouse.move(origin.x + 250 * origin.k, origin.y + 380 * origin.k, { steps: 5 }); await page.mouse.up();
ok("the box tool draws on the screen", await until(() => read().screens.menu.shapes?.some((x) => x.type === "rect" && x.color === "red")));
await page.keyboard.press("v");

// any screen size
await page.locator(".screen-list button", { hasText: "Oat latte" }).first().click().catch(async () => { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.locator(".screen-list button", { hasText: "Oat latte" }).first().click(); });
await page.locator(".inspector select").first().selectOption("custom");
ok("a screen can take a custom size", await until(() => typeof read().screens.drink.device === "object"));

// agent edits reload live
const d = read(); d.screens.menu.title = "Menu (agent edit)"; writeFileSync(file, JSON.stringify(d, null, 2));
ok("agent edits show up live", await until(async () => (await page.locator(".screen-title .t", { hasText: "Menu (agent edit)" }).count()) > 0));

// rename a screen: links follow
for (let i = 0; i < 4; i++) await page.keyboard.press("Escape");
await page.locator(".screen-list button", { hasText: "Order status" }).click();
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
await page.keyboard.press("d");
const pd = await page.locator(".play-device").boundingBox();
await page.mouse.move(pd.x + 40, pd.y + 200); await page.mouse.down();
for (let i = 1; i < 8; i++) await page.mouse.move(pd.x + 40 + i * 15, pd.y + 200 + (i % 2) * 10);
await page.mouse.up();
ok("the play-mode sharpie saves its marks", await until(() => (read().screens.drink.markup ?? []).length === 1));
await page.keyboard.press("d");
await page.keyboard.press("s");
ok("the screens strip shows every screen", await until(async () => (await page.locator(".play-strip .thumb").count()) === Object.keys(read().screens).length));
await page.locator(".play-strip .thumb").filter({ hasText: "Your order" }).click();
ok("the strip jumps to any screen", await until(async () => (await page.locator(".play-title").textContent()) === "Your order"));
await page.keyboard.press("ArrowLeft");
await page.keyboard.press("ArrowLeft");
ok("play goes back", await until(async () => (await page.locator(".play-title").textContent())?.startsWith("Menu")));
await page.keyboard.press("Escape");
ok("Esc leaves play", await until(async () => (await page.locator(".play").count()) === 0));

// cut an element, paste it back; what's copied is a picture too (for Slack)
await sleep(600);
await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
await page.locator(".screen-list button").first().click();
await sleep(500);
const lp = await page.evaluate(() => {
  const { layouts, pos, view } = window.__wf;
  const b = layouts.menu.boxes.filter((x) => x.key.split("/").length === 2 && !x.hidden && x.type === "list")[0] ?? layouts.menu.boxes.find((x) => x.key === "children/1");
  const c = document.querySelector(".canvas").getBoundingClientRect();
  return { x: c.left + view.x + (pos.menu[0] + b.x + 12) * view.k, y: c.top + view.y + (pos.menu[1] + b.y + 6) * view.k, key: b.key };
});
await page.mouse.click(lp.x, lp.y);
const picked = await page.evaluate(() => window.__wf.sel);
const kids = () => read().screens[picked.screen].children.length;
const n0 = kids();
await page.keyboard.press("Meta+x");
ok("Cmd+X cuts an element", await until(() => kids() === n0 - 1), JSON.stringify(picked));
const clipTypes = async () => page.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types)).catch(() => []);
await until(async () => (await clipTypes()).includes("image/png"), 8000);
const types = await clipTypes();
ok("the clipboard holds a picture of it", types.includes("image/png"), types.join(", "));
await page.keyboard.press("Meta+v");
ok("pasting puts the element back, not a picture", await until(() => kids() === n0));
ok("the icon set is big", (await (await page.request.get(`${url}api/file`)).ok()) && cli("vocab", "icons").split(/\s+/).length > 150);

// export from the editor
const res = await page.request.get(`${url}api/export?format=png`);
ok("editor export returns a PNG", res.ok() && (await res.body()).readUInt32BE(0) === 0x89504e47);
const shot = await page.request.get(`${url}api/screen.png?id=menu`);
ok("copy-as-image endpoint returns a PNG", shot.ok());

ok("no console errors", errors.length === 0, errors.join("\n"));
await ctx.close();
await browser.close();
server.kill();
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);

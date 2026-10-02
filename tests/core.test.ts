import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { drawingFonts } from "../vendor/sketch/fonts";
import { initRenderer, renderPNG } from "../vendor/sketch/resvg";
import { layoutScreen, linksOf } from "../src/layout";
import { embedSource, readSource } from "../src/png";
import { arrows, layoutAll, positions } from "../src/render/flow";
import { screenSVG } from "../src/render/screen";
import { flowSVG } from "../src/render/flow";
import { buildSchema } from "../src/schema";
import { componentsMd, SKILL_MD } from "../src/skill";
import { wrap } from "../src/text";
import type { WireframeFile } from "../src/types";
import { validate } from "../src/validate";
import { COMPONENTS, TYPES } from "../src/vocab";
import * as M from "../src/editor/model";
import { hitChain, pickFrom } from "../src/editor/Canvas";
import { bezelOf } from "../src/render/flow";
import { STARTERS, starterOf } from "../src/vocab";

const example = (): WireframeFile => JSON.parse(readFileSync("examples/order-ahead.wireframe.json", "utf8"));
const one = (children: unknown[], extra: Partial<WireframeFile> = {}): WireframeFile => ({ title: "T", screens: { a: { children: children as never } }, ...extra });
const box = (f: WireframeFile, key: string, screen = "a") => layoutScreen(f, screen).boxes.find((b) => b.key === key)!;

beforeAll(async () => { await initRenderer(); });

describe("catalog", () => {
  it("has about 50 components, each with a doc and an example that validates", () => {
    expect(TYPES.length).toBeGreaterThanOrEqual(50);
    for (const d of Object.values(COMPONENTS)) {
      expect(d.doc.length).toBeGreaterThan(5);
      const r = validate(one([d.example]));
      const real = r.errors.filter((e) => !/\.goes$/.test(e.path)); // examples link to illustrative screens
      expect(real, `${d.type}: ${JSON.stringify(real)}`).toEqual([]);
    }
  });
  it("documents every component for agents and in the schema", () => {
    const md = componentsMd();
    const schema = JSON.stringify(buildSchema());
    for (const t of TYPES) { expect(md).toContain(`\`${t}\``); expect(schema).toContain(`"${t}"`); }
    expect(SKILL_MD).toMatch(/^---\nname: wireframe\n/);
  });
});

describe("layout", () => {
  it("stacks down inside the screen padding, under the status bar", () => {
    const f = one([{ type: "title", text: "Hi" }, { type: "button", text: "Go" }]);
    const t = box(f, "children/0"), b = box(f, "children/1");
    expect(t.x).toBe(16);
    expect(t.y).toBe(47 + 16);
    expect(b.y).toBeCloseTo(t.y + t.h + 12);
    expect(b.w).toBe(390 - 32);
  });
  it("a spacer pushes what follows to the bottom", () => {
    const f = one([{ type: "title", text: "Hi" }, { type: "spacer" }, { type: "button", text: "Pay" }]);
    const b = box(f, "children/2");
    expect(b.y + b.h).toBeCloseTo(844 - 34 - 16);
  });
  it("tab bars pin to the bottom, run edge to edge, and the flow stops above them", () => {
    const f = one([{ type: "spacer" }, { type: "button", text: "Pay" }, { type: "tabbar", items: ["A", "B"] }]);
    const tab = box(f, "children/2");
    expect(tab.pinned).toBe(true);
    expect(tab.x).toBe(0);
    expect(tab.w).toBe(390);
    expect(tab.y + tab.h).toBe(844);
    const pay = box(f, "children/1");
    expect(pay.y + pay.h).toBeLessThanOrEqual(tab.y);
  });
  it("pins float in corners", () => {
    const f = one([{ type: "button", text: "Cart", width: "hug", pin: "bottom-right" }]);
    const b = box(f, "children/0");
    expect(b.x + b.w).toBe(390 - 16);
    expect(b.y + b.h).toBeLessThanOrEqual(844 - 34);
  });
  it("rows share the width between fill children and keep hug children tight", () => {
    const f = one([{ type: "row", children: [{ type: "button", text: "A" }, { type: "button", text: "B" }, { type: "badge", text: "x" }] }]);
    const a = box(f, "children/0/children/0"), b = box(f, "children/0/children/1"), c = box(f, "children/0/children/2");
    expect(a.w).toBeCloseTo(b.w);
    expect(c.w).toBeLessThan(40);
    expect(a.w + b.w + c.w + 16).toBeCloseTo(358, 0);
  });
  it("applies the designer's nudges to an element and everything inside it", () => {
    const f = one([{ type: "card", id: "c", children: [{ type: "text", text: "hi" }] }], { layout: { a: { c: { dx: 10, dy: -4 } } } });
    const plain = one([{ type: "card", id: "c", children: [{ type: "text", text: "hi" }] }]);
    expect(box(f, "children/0").x - box(plain, "children/0").x).toBe(10);
    expect(box(f, "children/0/children/0").y - box(plain, "children/0/children/0").y).toBe(-4);
  });
  it("reports content that runs off the screen, unless the screen scrolls", () => {
    const tall = Array.from({ length: 20 }, () => ({ type: "sketch", height: 100 }));
    expect(layoutScreen(one(tall), "a").overflow).toBeGreaterThan(1000);
    const f = one(tall); f.screens.a.scroll = true;
    const l = layoutScreen(f, "a");
    expect(l.overflow).toBe(0);
    expect(l.h).toBeGreaterThan(2000);
  });
  it("resolves shared pieces and keeps their links off the canvas", () => {
    const f = example();
    const l = layoutScreen(f, "menu");
    const tab = l.boxes.find((b) => b.type === "tabbar")!;
    expect(tab.shared).toBe(true);
    expect(linksOf(l).some((x) => x.to === "status")).toBe(false);
    expect(linksOf(l, true).some((x) => x.to === "status")).toBe(true);
  });
  it("wraps text by real font widths", () => {
    expect(wrap("Oat latte with an extra shot please", "hand", 17, 120).length).toBeGreaterThan(1);
    expect(wrap("Short", "hand", 17, 300)).toEqual(["Short"]);
  });
});

describe("flow canvas", () => {
  it("lines screens up left to right and draws an arrow per link", () => {
    const f = example();
    const ls = layoutAll(f), pos = positions(f, ls);
    expect(pos.drink[0]).toBeGreaterThan(pos.menu[0] + 390);
    const arr = arrows(f, ls, pos);
    expect(arr.map((a) => `${a.from}>${a.to}`)).toEqual(expect.arrayContaining(["menu>drink", "menu>cart", "drink>cart", "cart>status"]));
    // menu → cart skips the drink screen, so it goes round underneath
    expect(arr.find((a) => a.from === "menu" && a.to === "cart")!.lane).toBe(0);
  });
  it("renders the whole flow as SVG", () => {
    const svg = flowSVG(example());
    expect(svg).toContain("Corner Coffee: order ahead");
    expect(svg).toContain("Pastries sell out by 10");
  });
});

describe("validate", () => {
  it("passes the example with no suggestions", () => {
    const r = validate(example());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  const errs = (f: unknown) => validate(f).errors.map((e) => `${e.path} ${e.message} ${e.hint ?? ""}`).join("\n");
  it("suggests the right component, prop, screen and icon", () => {
    expect(errs(one([{ type: "buton", text: "x" }]))).toContain('Did you mean "button"');
    expect(errs(one([{ type: "button", txt: "x" }]))).toContain('Did you mean "text"');
    expect(errs(one([{ type: "button", text: "x", goes: "chekout" }], { screens: { a: { children: [{ type: "button", text: "x", goes: "chekout" }] }, checkout: { children: [] } } }))).toContain('Did you mean "checkout"');
    expect(errs(one([{ type: "icon", icon: "hart" }]))).toContain('Did you mean "heart"');
    expect(errs(one([{ type: "carousel" }]))).toContain('"sketch"');
  });
  it("catches structural mistakes", () => {
    expect(errs(one([{ type: "button", text: "x", children: [] }]))).toContain("can't hold other things");
    expect(errs(one([{ use: "nav" }]))).toContain("shared");
    expect(errs(one([{ type: "text", id: "a" }, { type: "text", id: "a" }]))).toContain("used twice");
    expect(errs({ title: "x", screens: { "my screen": { children: [] } } })).toContain("spaces");
    expect(errs({ screens: {} })).toContain("title");
  });
  it("nudges on design problems", () => {
    const w = (f: WireframeFile) => validate(f).warnings.map((x) => x.message).join("\n");
    expect(w(one([{ type: "button", text: "A", variant: "primary" }, { type: "button", text: "B", variant: "primary" }]))).toContain("2 primary buttons");
    expect(w({ title: "x", screens: { a: { children: [] }, b: { children: [] } } })).toContain('Nothing links to "b"');
    expect(w(one([{ type: "sketch", height: 600 }]))).toContain("sketch boxes");
    expect(w(one([{ type: "sketch", height: 300 }, { type: "button", text: "Cart", width: "hug", pin: "top-left" }]))).toContain("covers");
  });
});

describe("render", () => {
  it("renders a screen to PNG and carries its source", () => {
    const f = example();
    const png = renderPNG(screenSVG(f, "cart"), { fonts: drawingFonts() });
    const tagged = embedSource(png, { file: "order-ahead.wireframe.json", screen: "cart", source: f });
    const back = readSource(tagged)!;
    expect(back.screen).toBe("cart");
    expect((back.source as WireframeFile).title).toBe(f.title);
    expect(tagged.readUInt32BE(16)).toBe(390);
    expect(readSource(png)).toBeUndefined();
  });
  it("draws every component without throwing", () => {
    const children = Object.values(COMPONENTS).filter((d) => !d.defaultPin && d.type !== "sheet" && d.type !== "dialog").map((d) => d.example);
    const f = one(children); f.screens.a.scroll = true;
    expect(screenSVG(f, "a").length).toBeGreaterThan(10000);
  });
});

describe("editor model", () => {
  it("renames a screen and every link to it", () => {
    const d = M.renameScreen(example(), "cart", "basket");
    expect(d.screens.basket).toBeDefined();
    expect(JSON.stringify(d)).not.toContain('"goes":"cart"');
    expect(validate(d).errors).toEqual([]);
  });
  it("gives nodes unique ids when nudged", () => {
    const f = one([{ type: "button", text: "Pay" }, { type: "button", text: "Pay" }]);
    const a = M.ensureId(f, "a", ["screens", "a", "children", 0]);
    const b = M.ensureId(a.doc, "a", ["screens", "a", "children", 1]);
    expect(a.id).toBe("pay");
    expect(b.id).toBe("pay-2");
  });
  it("inserts into a selected container, after a selected element, or before the tab bar", () => {
    const f = example();
    expect(M.insertTarget(f, { screen: "cart", key: "children/1" }, "menu").list).toEqual(["screens", "cart", "children", 1, "children"]);
    expect(M.insertTarget(f, { screen: "cart", key: "children/3" }, "menu")).toMatchObject({ index: 4 });
    const t = M.insertTarget(f, null, "menu");
    expect(t.index).toBe(f.screens.menu.children.length - 2);
  });
});

describe("designer touches", () => {
  it("places free elements at their spot, on top, outside the stacks", () => {
    const f = one([{ type: "title", text: "Hi" }, { type: "button", text: "Free", at: [100, 300], width: 150 }, { type: "button", text: "Flow" }]);
    const free = box(f, "children/1"), flow = box(f, "children/2");
    expect([free.x, free.y, free.w]).toEqual([100, 300, 150]);
    expect(free.free).toBe(true);
    expect(flow.y).toBeLessThan(200);
    expect(free.plane).toBeGreaterThan(flow.plane);
  });
  it("draws shapes and validates them", () => {
    const f = one([{ type: "text", lines: 2 }]);
    f.screens.a.shapes = [{ type: "ellipse", points: [[10, 10], [100, 60]], color: "red" }, { type: "text", points: [[50, 200]], text: "look" }];
    expect(validate(f).errors).toEqual([]);
    expect(screenSVG(f, "a")).toContain("look");
    f.screens.a.shapes.push({ type: "circle", points: [[0, 0]] } as never);
    expect(validate(f).errors.map((e) => e.hint).join()).toContain("rect");
  });
  it("gives any screen any size and a matching device body", () => {
    const f = one([{ type: "text", lines: 2 }], { device: { w: 1280, h: 720 } });
    const l = layoutScreen(f, "a");
    expect([l.w, l.h]).toEqual([1280, 720]);
    expect(bezelOf(l, f).kind).toBe("desktop");
    f.screens.a.chrome = "none";
    expect(bezelOf(layoutScreen(f, "a"), f).l).toBe(0);
    expect(bezelOf(layoutScreen(example(), "menu"), example()).kind).toBe("phone");
  });
  it("selects the outer thing first, then drills in", () => {
    const f = example();
    const l = layoutScreen(f, "menu");
    const item = l.items.find((it) => it.goes === "drink")!;
    const chain = hitChain(l, item.x + 5, item.y + 5, f);
    expect(chain[0]).toBe(l.boxes.find((b) => b.type === "list")!.key);
    expect(chain[chain.length - 1]).toBe(item.key);
    expect(pickFrom(chain, null, "menu", false)).toBe(chain[0]);
    expect(pickFrom(chain, { screen: "menu", key: chain[0] }, "menu", false)).toBe(chain[1]);
    expect(pickFrom(chain, null, "menu", true)).toBe(item.key);
  });
  it("slides screens along when one grows", () => {
    const f = example();
    f.canvas = { menu: [0, 0], drink: [600, 0], cart: [1200, 0], status: [1800, 0] };
    const next = M.setAt(f, ["screens", "drink", "device"], { w: 990, h: 844 });
    const w = (d: typeof f, id: string) => layoutScreen(d, id).w;
    const out = M.keepClear(f, next, w);
    expect(out.canvas!.cart[0]).toBe(1800);
    expect(out.canvas!.menu[0]).toBe(0);
  });
  it("palette starters are neutral and valid", () => {
    for (const t of TYPES) {
      const n = starterOf(t);
      expect(JSON.stringify(n)).not.toMatch(/latte|coffee|pastr/i);
      expect(validate(one([n])).errors, t).toEqual([]);
    }
    expect(Object.keys(STARTERS).length).toBe(TYPES.length);
  });
});

/** Every component in the catalog validates, lays out and draws, in every state it allows. */
import { describe, expect, it } from "vitest";
import { layoutScreen } from "../src/layout";
import { screenSVG } from "../src/render/screen";
import type { WireframeFile } from "../src/types";
import { validate } from "../src/validate";
import { COMPONENTS, STATES, starterOf, TYPES } from "../src/vocab";

const one = (node: Record<string, unknown>, device: "phone" | "desktop" = "desktop"): WireframeFile => ({ title: "t", device, screens: { s: { children: [node as never] } } });

describe("catalog", () => {
  it("has the new pieces", () => {
    for (const t of ["browser", "window", "menu", "drawer", "popover", "tooltip", "accordion", "calendar", "date-picker", "tag-input", "file-upload", "empty-state", "skeleton", "banner", "toolbar", "tree", "timeline", "code", "stat", "fab", "split-button", "avatar-group", "details"]) expect(TYPES, t).toContain(t);
  });

  for (const type of TYPES) {
    const def = COMPONENTS[type];
    const st = def.props.state?.type;
    const states = st && st.kind === "enum" ? st.values : ["normal"];
    describe(type, () => {
      it("its example and its palette starter are valid", () => {
        // examples link to screens of their own story; this one-screen file doesn't have them
        expect(validate(one(def.example)).errors.filter((e) => !/isn't a screen/.test(e.message)), "example").toEqual([]);
        expect(validate(one(starterOf(type))).errors, "starter").toEqual([]);
      });
      for (const state of states) {
        it(`draws ${state}`, () => {
          const f = one({ ...starterOf(type), ...(state === "normal" ? {} : { state }) });
          expect(validate(f).errors).toEqual([]);
          const l = layoutScreen(f, "s");
          const b = l.boxes.find((x) => x.depth === 1);
          expect(b, "laid out").toBeDefined();
          expect(b!.h, "has height").toBeGreaterThan(0);
          const svg = screenSVG(f, "s");
          expect(svg.length).toBeGreaterThan(200);
          expect(svg).not.toMatch(/NaN|undefined/);
        });
      }
    });
  }

  it("only offers states the catalog knows", () => {
    for (const d of Object.values(COMPONENTS)) {
      const st = d.props.state?.type;
      if (st && st.kind === "enum") for (const v of st.values) expect(STATES as readonly string[]).toContain(v);
    }
    const bad = validate(one({ type: "badge", text: "x", state: "hover" }));
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it("an open dropdown draws its options over the screen", () => {
    const f = one({ type: "select", label: "Size", value: "12 oz", items: ["8 oz", "12 oz", "16 oz"], state: "open" });
    const svg = screenSVG(f, "s");
    for (const o of ["8 oz", "16 oz"]) expect(svg).toContain(o);
  });

  it("a screen with a url sits in a browser with that address", () => {
    const f: WireframeFile = { title: "t", device: "laptop", screens: { s: { url: "cornercoffee.com/menu", children: [{ type: "title", text: "Menu" }] } } };
    expect(validate(f).errors).toEqual([]);
    const l = layoutScreen(f, "s");
    expect(l.browser?.url).toBe("cornercoffee.com/menu");
    expect(l.boxes.find((b) => b.depth === 1)!.y).toBeGreaterThanOrEqual(84);
    expect(screenSVG(f, "s")).toContain("cornercoffee.com/menu");
  });

  it("a drawer runs the full height of the screen, below a browser bar", () => {
    const f: WireframeFile = { title: "t", device: "laptop", screens: { s: { url: "x.com", children: [{ type: "text", lines: 2 }, { type: "drawer", title: "Filters", children: [{ type: "text", lines: 1 }] }] } } };
    const l = layoutScreen(f, "s");
    const d = l.boxes.find((b) => b.type === "drawer")!;
    expect(d.x + d.w).toBe(l.w);
    expect(d.y).toBe(84);
    expect(d.y + d.h).toBe(l.h);
  });

  it("drawings take any hex color", () => {
    const f: WireframeFile = { title: "t", screens: { s: { children: [], shapes: [{ type: "rect", points: [[10, 10], [80, 60]], color: "#E8B04B", fill: "mid" }] } } };
    expect(validate(f).errors).toEqual([]);
    expect(screenSVG(f, "s").toLowerCase()).toContain("#e8b04b");
  });

  it("exports a clickable prototype: every screen, its links, and the start screen", async () => {
    const { toPrototypeHTML } = await import("../src/prototype");
    const f: WireframeFile = { title: "Order", start: "menu", screens: {
      menu: { title: "Menu", children: [{ type: "button", text: "Order", goes: "pay" }] },
      pay: { title: "Pay", children: [{ type: "navbar", title: "Pay", back: true }, { type: "button", text: "Done", goes: "menu" }] },
    } };
    const html = toPrototypeHTML(f, "/tmp/order.wireframe.json");
    expect(html).toContain('<template id="s-menu">');
    expect(html).toContain('<template id="s-pay">');
    const data = JSON.parse(/const D = (.*);\n/.exec(html)![1]);
    expect(data.start).toBe("menu");
    const pay = data.screens.find((s: { id: string }) => s.id === "pay");
    expect(pay.hots.map((h: { goes: string }) => h.goes).sort()).toEqual(["back", "menu"]);
  });
});

describe("charts with real numbers", () => {
  const data = [["Mon", 42], ["Tue", 38], ["Wed", 51], ["Thu", 47]];
  it("draws every kind with its labels and numbers", () => {
    for (const kind of ["bar", "hbar", "line", "funnel", "pie", "donut"]) {
      const f = one({ type: "chart", kind, data, highlight: "Wed", unit: "orders", label: "This week" });
      expect(validate(f).errors, kind).toEqual([]);
      const svg = screenSVG(f, "s");
      for (const [l] of data) expect(svg, kind).toContain(String(l));
      expect(svg, kind).not.toMatch(/NaN|Infinity/);
    }
    expect(screenSVG(one({ type: "chart", data }), "s")).toContain("51");
  });

  it("without data it's still the placeholder", () => {
    const f = one({ type: "chart", kind: "line", label: "Orders" });
    expect(validate(f).errors).toEqual([]);
    expect(screenSVG(f, "s")).not.toContain("Add some numbers");
  });

  it("checks the numbers and the call-out", () => {
    expect(validate(one({ type: "chart", data: "lots" })).errors.map((e) => e.message).join()).toMatch(/\[label, number\]/);
    expect(validate(one({ type: "chart", data: [] })).warnings.map((e) => e.message).join()).toMatch(/no numbers yet/);
    expect(validate(one({ type: "chart", data, highlight: "Wedn" })).errors.map((e) => `${e.message} ${e.hint}`).join()).toMatch(/Did you mean "Wed"/);
    expect(validate(one({ type: "chart", data: { Yes: 3, No: 1 }, kind: "pie" })).errors).toEqual([]);
  });
});


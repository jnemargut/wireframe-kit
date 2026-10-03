import { toPrototypeHTML } from "../prototype";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatJSON } from "../../vendor/sketch/json";
import { ensureDir, flowPNG, flowSVGFile, initRenderer, renderScreens, stemOf, toPDF } from "../export";
import { readSource } from "../png";
import { agentsBlock } from "../skill";
import { startScreen, type WireframeFile } from "../types";
import { formatResult, validate } from "../validate";
import { CATEGORIES, COMPONENTS, DEVICES, ICONS, TYPES } from "../vocab";
import { dev } from "./dev";

/** This script lives in <skill>/scripts/wireframe.mjs, so the skill folder is one level up. */
const SKILL_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const RUN = `node "${SELF}"`;

const HELP = `wireframe: low-fi, marker-style wireframes and clickable flows your coding agent writes and you tweak.
It's an agent skill: ${SKILL_ROOT}

Usage: ${RUN} <command> [options]

  new <file> [--title "…"] [--device phone|tablet|desktop]   Create a starter wireframe
  vocab [category|component|icons] [--grep x] [--json]       The component catalog, with props and examples
  validate <file> [--json]        Check a wireframe; errors include fixes
  dev [file] [--port 4400]        Open the flow canvas editor (--no-open); edits save to the file live
  render <file>[#screen] [--size 390x844] [--scale 2]
                                  Each screen as <name>.<screen>.png next to the file (source embedded).
                                  This is what Storyboard Kit shows when a panel's screen is "x.wireframe.json#screen".
  export <file> [--png] [--pdf] [--svg] [--html] [--screens] [--scale 1.5] [--out dir]
                                  The whole flow as one sheet (PNG/SVG), a PDF (flow + a page per screen), --html (a
                                  clickable prototype in one file: send it, anyone can click through), or --screens
  source <file.png>               Print the wireframe JSON embedded in a rendered PNG
  format <file>                   Rewrite the file in canonical, diff-friendly formatting
  install [--project] [--codex]   Install this skill for Claude Code (~/.claude/skills), or into this project

Docs for agents: ${join(SKILL_ROOT, "SKILL.md")}`;

function args(argv: string[]) {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--no-")) flags[a.slice(5)] = false;
    else if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--") && ["grep", "port", "scale", "out", "title", "size", "device"].includes(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

function load(ref: string | undefined): { doc: WireframeFile; abs: string; screen?: string } {
  if (!ref) { console.error("Missing <file>. Example: wireframe validate checkout.wireframe.json"); process.exit(2); }
  const hash = ref.indexOf("#");
  const file = hash >= 0 ? ref.slice(0, hash) : ref;
  const abs = resolve(file);
  if (!existsSync(abs)) { console.error(`No such file: ${file}`); process.exit(2); }
  try { return { doc: JSON.parse(readFileSync(abs, "utf8")), abs, screen: hash >= 0 ? ref.slice(hash + 1) || undefined : undefined }; }
  catch (e) { console.error(`✗ ${file} is not valid JSON: ${(e as Error).message}`); process.exit(1); }
}

function requireValid(doc: WireframeFile, label: string) {
  const r = validate(doc);
  if (!r.ok) { console.error(formatResult(r, label)); console.error("\nFix the errors above first."); process.exit(1); }
}

const STARTER = (title: string, device: string): WireframeFile => ({
  title,
  device: (device in DEVICES ? device : "phone") as WireframeFile["device"],
  screens: {
    home: {
      title: "Home",
      children: [
        { type: "navbar", title },
        { type: "title", text: "What's this screen for?" },
        { type: "text", lines: 2 },
        { type: "sketch", label: "the main thing people come here for", height: 180 },
        { type: "spacer" },
        { type: "button", text: "Next", variant: "primary", goes: "next" },
      ],
    },
    next: {
      title: "Next",
      children: [
        { type: "navbar", title: "Next", back: true },
        { type: "text", lines: 4 },
      ],
    },
  },
});

/** Copy the whole skill folder (docs, bundled script, editor, fonts, examples). */
function installTo(dst: string, bake?: (dir: string) => string): string {
  if (resolve(dst) === resolve(SKILL_ROOT)) return dst;
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(SKILL_ROOT, dst, { recursive: true, filter: (src) => !src.includes(".wireframe-cache") });
  if (bake) bakeSkillDir(dst, bake(dst));
  return dst;
}

/**
 * Agents other than Claude Code don't fill in ${CLAUDE_SKILL_DIR}, so copies made for them get the folder's real
 * path written into their docs (absolute for a home install, relative to the project for a project install).
 */
function bakeSkillDir(dir: string, path: string) {
  for (const f of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    if (!f.endsWith(".md")) continue;
    const file = join(dir, f), text = readFileSync(file, "utf8");
    if (text.includes("${CLAUDE_SKILL_DIR}")) writeFileSync(file, text.replaceAll("${CLAUDE_SKILL_DIR}", path));
  }
}


function upsertBlock(path: string, block: string) {
  const start = "<!-- wireframe:start -->", end = "<!-- wireframe:end -->";
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`${start}[\\s\\S]*?${end}\\n?`);
  text = re.test(text) ? text.replace(re, block) : (text.trim() ? text.trimEnd() + "\n\n" : "") + block;
  writeFileSync(path, text);
}

function vocab(pos: string[], flags: Record<string, string | boolean>) {
  const what = pos[0];
  if (flags.json) {
    console.log(JSON.stringify(what === "icons" ? ICONS : what && COMPONENTS[what] ? COMPONENTS[what] : { components: COMPONENTS, icons: ICONS, devices: DEVICES }, null, 2));
    return;
  }
  const g = typeof flags.grep === "string" ? flags.grep.toLowerCase() : "";
  if (what === "icons") { console.log(ICONS.filter((i) => !g || i.includes(g)).join("  ")); return; }
  if (what && COMPONENTS[what]) {
    const d = COMPONENTS[what];
    console.log(`${d.type}: ${d.doc}\n`);
    const own = Object.entries(d.props);
    if (own.length) { console.log("Props:"); for (const [k, p] of own) console.log(`  ${k.padEnd(10)} ${p.doc}${p.type.kind === "enum" ? ` (${p.type.values.join(" | ")})` : ""}`); }
    console.log(`\nEvery element also takes: id, goes, pin, width, height, grow, note${d.defaultPin ? `\nPinned "${d.defaultPin}" by default.` : ""}`);
    console.log(`\nExample:\n  ${JSON.stringify(d.example)}`);
    return;
  }
  const cat = CATEGORIES.find((c) => c.id === what);
  if (what && !cat) {
    const near = TYPES.filter((t) => t.includes(what) || what.includes(t));
    console.error(`Unknown "${what}". ${near.length ? `Did you mean ${near.join(", ")}? ` : ""}Try a category (${CATEGORIES.map((c) => c.id).join(", ")}), a component, or icons.`);
    process.exit(2);
  }
  for (const c of cat ? [cat] : CATEGORIES) {
    const list = Object.values(COMPONENTS).filter((d) => d.category === c.id && (!g || `${d.type} ${d.doc}`.toLowerCase().includes(g)));
    if (!list.length) continue;
    console.log(`${c.label}: ${c.doc}`);
    for (const d of list) console.log(`  ${d.type.padEnd(12)} ${d.doc}`);
    console.log("");
  }
  if (!cat && !g) console.log(`Details: vocab <component>   ·   icons: vocab icons   ·   devices: ${Object.keys(DEVICES).join(", ")}`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = args(rest);
  if (["render", "export", "dev"].includes(cmd)) await initRenderer();
  switch (cmd) {
    case "vocab": return vocab(pos, flags);
    case "validate": {
      const { doc } = load(pos[0]);
      const r = validate(doc);
      if (flags.json) console.log(JSON.stringify(r, null, 2));
      else console.log(formatResult(r, pos[0], r.ok ? doc : undefined));
      process.exit(r.ok ? 0 : 1);
    }
    case "format": {
      const { doc, abs } = load(pos[0]);
      writeFileSync(abs, formatJSON(doc));
      console.log(`✓ formatted ${pos[0]}`);
      return;
    }
    case "render": {
      const { doc, abs, screen } = load(pos[0]);
      requireValid(doc, pos[0]);
      if (screen && !doc.screens[screen]) { console.error(`No screen "${screen}" in ${basename(abs)}. Screens: ${Object.keys(doc.screens).join(", ")}`); process.exit(1); }
      const m = typeof flags.size === "string" ? /^(\d+)x(\d+)$/.exec(flags.size) : null;
      const out = renderScreens(doc, abs, screen ? [screen] : Object.keys(doc.screens), Number(flags.scale ?? 2), m ? { w: Number(m[1]), h: Number(m[2]) } : undefined);
      if (!flags.quiet) console.log(`✓ rendered ${out.map((p) => basename(p)).join(", ")}\n  In a storyboard: "screen": "./${basename(abs)}#${screen ?? startScreen(doc)}"`);
      return;
    }
    case "export": {
      const { doc, abs } = load(pos[0]);
      requireValid(doc, pos[0]);
      const want = { png: !!flags.png, pdf: !!flags.pdf, svg: !!flags.svg, screens: !!flags.screens, html: !!flags.html };
      if (!Object.values(want).some(Boolean)) want.png = true;
      const outDir = ensureDir(resolve(typeof flags.out === "string" ? flags.out : dirname(abs)));
      const stem = stemOf(abs);
      const written: string[] = [];
      if (want.png) { writeFileSync(join(outDir, `${stem}.png`), flowPNG(doc, abs, Number(flags.scale ?? 1.5))); written.push(join(outDir, `${stem}.png`)); }
      if (want.svg) { writeFileSync(join(outDir, `${stem}.svg`), flowSVGFile(doc, abs)); written.push(join(outDir, `${stem}.svg`)); }
      if (want.pdf) { writeFileSync(join(outDir, `${stem}.pdf`), await toPDF(doc, abs)); written.push(join(outDir, `${stem}.pdf`)); }
      if (want.html) { writeFileSync(join(outDir, `${stem}.html`), toPrototypeHTML(doc, abs)); written.push(join(outDir, `${stem}.html`)); }
      if (want.screens) written.push(...renderScreens(doc, abs, Object.keys(doc.screens), Number(flags.scale ?? 2)));
      console.log(`✓ exported ${written.join(", ")}`);
      return;
    }
    case "source": {
      if (!pos[0] || !existsSync(pos[0])) { console.error("Usage: wireframe source <file.png>"); process.exit(2); }
      const src = readSource(readFileSync(pos[0]));
      if (!src) { console.error(`${pos[0]} has no wireframe source in it.`); process.exit(1); }
      if (flags.out && typeof flags.out === "string") { writeFileSync(flags.out, formatJSON(src.source)); console.log(`✓ wrote ${flags.out} (screen "${src.screen}" of ${src.file})`); }
      else console.log(formatJSON(src.source));
      return;
    }
    case "dev": {
      const file = pos[0] ?? lastFile();
      if (!file) { console.error("Usage: wireframe dev <file>  (no *.wireframe.json found here)"); process.exit(2); }
      remember(file);
      await dev(file.replace(/#.*$/, ""), { port: Number(flags.port ?? 4400), open: flags.open !== false });
      return;
    }
    case "new": {
      const file = pos[0] ?? "flow.wireframe.json";
      if (existsSync(file)) { console.error(`${file} already exists.`); process.exit(1); }
      writeFileSync(file, formatJSON(STARTER(typeof flags.title === "string" ? flags.title : "Untitled flow", typeof flags.device === "string" ? flags.device : "phone")));
      console.log(`✓ created ${file}\n  next: ${RUN} dev ${file}`);
      return;
    }
    case "install": {
      const done: string[] = [];
      if (flags.project) {
        done.push(installTo(resolve(".claude/skills/wireframe")), installTo(resolve(".agents/skills/wireframe"), (d) => relative(process.cwd(), d)));
        upsertBlock("AGENTS.md", agentsBlock(".agents/skills/wireframe"));
        done.push("AGENTS.md (pointer for agents that don't load skills on their own)");
      } else {
        done.push(installTo(join(homedir(), ".claude/skills/wireframe")));
        if (flags.codex) done.push(installTo(join(homedir(), ".codex/skills/wireframe"), (d) => d));
      }
      console.log(`✓ wireframe skill installed:\n  ${done.join("\n  ")}\n\nRestart your agent, then type: /wireframe <the flow you have in mind>…`);
      return;
    }
    case undefined: case "help": case "--help": case "-h":
      console.log(HELP); return;
    default:
      console.error(`Unknown command "${cmd}".\n\n${HELP}`); process.exit(2);
  }
}

/** The file `dev` opens with no argument: the last one used here, else the only one in the folder. */
function lastFile(): string | undefined {
  const mem = join(".wireframe", "last");
  if (existsSync(mem)) { const f = readFileSync(mem, "utf8").trim(); if (existsSync(f)) return f; }
  const here = readdirSync(".").filter((f) => f.endsWith(".wireframe.json"));
  return here.length === 1 ? here[0] : undefined;
}
function remember(file: string) {
  try { mkdirSync(".wireframe", { recursive: true }); writeFileSync(join(".wireframe", "last"), file); } catch { /* read-only folder: fine */ }
}

main().catch((e) => { console.error(`✗ ${(e as Error).message}`); process.exit(1); });

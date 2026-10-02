// Builds the self-contained skill at skills/wireframe/ — the thing people install.
//   skills/wireframe/SKILL.md, references/*        docs (generated from src/vocab.ts)
//   skills/wireframe/scripts/wireframe.mjs         the whole engine, every dependency bundled
//   skills/wireframe/scripts/resvg.wasm            renderer (WebAssembly: any OS, no native binaries)
//   skills/wireframe/scripts/editor/               the flow canvas editor
//   skills/wireframe/assets/fonts, examples/       fonts for rendering, the order-ahead example
import { build } from "esbuild";
import { build as vite } from "vite";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const OUT = "skills/wireframe";
const only = process.argv[2]; // "cli" = just the script (fast iteration)

rmSync(`${OUT}/scripts/wireframe.mjs`, { force: true });
mkdirSync(`${OUT}/scripts`, { recursive: true });

await build({
  entryPoints: ["src/cli/index.ts"],
  outfile: `${OUT}/scripts/wireframe.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  // CommonJS dependencies inside an ES module bundle still need `require` for Node built-ins.
  banner: { js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  logLevel: "warning",
});
cpSync("node_modules/@resvg/resvg-wasm/index_bg.wasm", `${OUT}/scripts/resvg.wasm`);

// fonts used for rendering (the editor bundles its own copies)
mkdirSync(`${OUT}/assets/fonts`, { recursive: true });
for (const f of ["PermanentMarker-Regular.ttf", "PatrickHand-Regular.ttf", "LICENSE-Apache-PermanentMarker.txt", "OFL-PatrickHand.txt"])
  cpSync(`vendor/sketch/fonts/${f}`, `${OUT}/assets/fonts/${f}`);
if (only === "cli") process.exit(0);

// docs, references and schema (generated from the catalog)
await build({ entryPoints: ["scripts/gen.ts"], outfile: "dist/gen.mjs", bundle: true, platform: "node", format: "esm", packages: "external", logLevel: "warning" });
execFileSync("node", ["dist/gen.mjs"], { stdio: "inherit" });

// example flow
mkdirSync(`${OUT}/examples`, { recursive: true });
const ex = JSON.parse(readFileSync("examples/order-ahead.wireframe.json", "utf8"));
ex.$schema = "../references/schema.json";
writeFileSync(`${OUT}/examples/order-ahead.wireframe.json`, JSON.stringify(ex, null, 2) + "\n");

// the editor
await vite({ configFile: "vite.config.ts", logLevel: "warn" });
cpSync("LICENSE", `${OUT}/LICENSE`);
console.log(`built ${OUT}/`);

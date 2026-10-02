/** Regenerates schema.json and the agent skill docs from the catalogue so they never drift. Runs as part of the build. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildSchema } from "../src/schema";
import { FORMAT_MD, SKILL_MD, componentsMd, exampleMd } from "../src/skill";

const OUT = "skills/wireframe";
mkdirSync(`${OUT}/references`, { recursive: true });
writeFileSync(`${OUT}/SKILL.md`, SKILL_MD);
writeFileSync(`${OUT}/references/components.md`, componentsMd());
writeFileSync(`${OUT}/references/format.md`, FORMAT_MD);
writeFileSync(`${OUT}/references/schema.json`, JSON.stringify(buildSchema(), null, 2) + "\n");
writeFileSync(`${OUT}/references/example.md`, exampleMd(readFileSync("examples/order-ahead.wireframe.json", "utf8")));
console.log(`wrote ${OUT}/SKILL.md + references/`);

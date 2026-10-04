import { CATEGORIES, COMMON, COMPONENTS, DEVICES, ICONS } from "./vocab";

/** Shorthand used throughout the docs for "run this skill's bundled script". Defined at the top of SKILL.md. */
export const CLI = "wf";

export const SKILL_MD = `---
name: wireframe
description: Draft low-fi, marker-style wireframes and clickable flows (app or web screens linked together) as a wireframe.json file, validate it, and open the flow canvas editor. Use when the user asks for a wireframe, a low-fi mockup, a screen flow, a clickable prototype sketch, or screens to show inside a storyboard.
---

# Wireframes, built by your agent

You turn a designer's loose description ("the order-ahead flow: menu, cart, pay, order status") into a
\`*.wireframe.json\` file: a few screens built from a closed catalog of about 50 components, linked together.
The tool validates it and opens a canvas where the designer sees the whole flow, tweaks things, and clicks
through it. Everything is drawn in grays, in a hand-drawn marker style, so nobody mistakes it for a final design.

## Running the tool

Everything runs through one bundled script in this skill's folder (it needs Node.js 18+ and nothing else):

\`\`\`bash
node "\${CLAUDE_SKILL_DIR}/scripts/wireframe.mjs" <command>
\`\`\`

\`\${CLAUDE_SKILL_DIR}\` is the folder this SKILL.md is in. If your agent doesn't fill it in, use that folder's
path. **Below, \`${CLI}\` is short for that whole command.**

## Workflow

1. **Look up the components. Don't guess.** \`${CLI} vocab\` lists every component by category,
   \`${CLI} vocab <component>\` shows its props and an example, \`${CLI} vocab icons\` lists icon names, and
   \`${CLI} vocab --grep cart\` searches. If something isn't in the catalog, use a labeled
   \`{ "type": "sketch", "label": "pastry carousel" }\` box rather than inventing a type.
   Full list: [references/components.md](references/components.md).
2. **Write the file**: \`<name>.wireframe.json\` (\`${CLI} new <file>\` makes a starter). Shape:
   [references/format.md](references/format.md). Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: \`${CLI} validate <file>\`. Errors say exactly what to change
   ("did you mean …"). Warnings catch real problems (content running off the screen, a pinned button covering
   something, two primary buttons, screens nothing links to); fix them.
4. **Open the editor** in the background (it keeps running): \`${CLI} dev <file>\`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Look at what you made.** \`${CLI} export <file> --png\` renders the whole flow to one image. Read it and fix
   anything cramped, cut off or confusing before you say you're done.
6. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   The designer's own touches are theirs: \`layout\` (nudges), \`canvas\` (where screens sit), \`at\` (things they
   dragged in and placed freely), and a screen's \`shapes\` (their drawings) and \`markup\` (play-mode sharpie).
   Keep them unless asked. You can read them, though: a red circle or a scribbled note is often feedback for you.
7. **The designer may paste a pointer** like \`In order.wireframe.json, screen "cart", button "Pay" (screens.cart.children[7])\`.
   That's exactly the element to change.
8. **For a storyboard** (Storyboard Kit): \`${CLI} render <file>\` writes \`<name>.<screen>.png\` next to the file,
   and a storyboard panel shows it with \`"screen": "./<name>.wireframe.json#<screen>"\`. Storyboard Kit re-renders
   it automatically when the wireframe changes.

## Craft: what makes a wireframe useful

- **One job per screen.** Know what the person is trying to do there, and make exactly one button
  \`"variant": "primary"\`: the main action. Everything else is secondary, outline or a link.
- **Real words.** Real labels, prices, names and statuses ("Preparing · about 4 min", "$5.25"), never lorem
  ipsum. Use \`{ "type": "text", "lines": 3 }\` squiggles only for body copy whose wording doesn't matter yet.
- **Real numbers on charts, when you have them.** A \`chart\` with \`data\` (\`[["Mon", 42], ["Tue", 38]]\`) draws
  them roughly, with each number written on it; \`highlight\` the one the screen is about. Leave \`data\` out for a
  placeholder when the numbers don't matter yet. Never invent numbers that look like real findings.
- **Link everything that goes somewhere.** Buttons, list items, tabs and links take \`"goes": "<screen id>"\`
  (or \`"back"\`). The canvas draws an arrow for each and Play mode clicks through them.
- **Show the unhappy paths.** Empty states, errors, loading and "it's running late" are their own screens
  (\`"status-delayed"\`), linked from where they happen. They're where the design work is.
- **Let stacks do the layout.** Never write coordinates. Screens stack their children down; use \`row\` to put
  things side by side, \`card\` to group, \`spacer\` to push what follows to the bottom, and \`pin\` to float
  something (a floating cart button: \`"pin": "bottom-right"\`). Bars like \`navbar\`, \`tabbar\` and \`topnav\`
  run edge to edge on their own.
- **Define repeated pieces once.** Put the tab bar or site header in \`shared\` and place it with
  \`{ "use": "tabs", "active": "Orders" }\`. Arrows aren't drawn for shared navigation, so the canvas stays readable.
- **Say why with notes.** \`"note": "Pastries sell out by 10"\` puts a numbered sticky beside the screen; the
  screen itself stays clean.
- **Pick the device.** \`"device": "phone"\` (default), \`"phone-small"\`, \`"phone-large"\`, \`"tablet"\`,
  \`"tablet-landscape"\`, \`"laptop"\`, \`"desktop"\`, \`"watch"\`, or any size \`{ "w": 1280, "h": 800 }\`. Screens can
  mix sizes: set \`device\` on a screen to override the file's. To show the same screen on another device, add a
  screen with that \`device\` and \`"versionOf": "<original id>"\`, and adapt its layout (a phone list becomes a desktop
  grid, a tab bar becomes a top nav). Long web pages: \`"scroll": true\` on the screen. A desktop app layout:
  \`"dir": "right"\` on the screen with a \`sidebar\` first and a \`stack\` for the main column.
- **Show the states.** Controls take \`"state"\`: \`hover\` (a pointer over it), \`pressed\`, \`focus\` (a focus ring),
  \`disabled\`, \`error\`, \`loading\` (a spinner in the button), \`selected\`, and \`open\` for things that drop down
  (\`select\`, \`search\` suggestions, \`date-picker\`'s calendar, \`split-button\`'s menu), drawn over the screen. Items
  in lists, menus, tabs, trees and accordions take a \`state\` too (\`hover\`, \`selected\`, \`disabled\`). Use them
  when the moment matters (the disabled Pay button until a size is picked, the error on a bad card number), or
  lay several copies side by side to spec a component's states. Leave \`state\` out for the normal look.
- **Websites in a browser.** \`"url": "cornercoffee.com/menu"\` on a screen draws browser tabs and an address bar
  across its top (the screen's \`title\` is the tab). The \`browser\` component does the same around a page inside a
  screen, and \`window\` frames a desktop app.
- **Overlays float.** \`menu\`, \`popover\` and \`tooltip\` go where you place them (usually \`"pin"\` or a \`row\`
  beside what they point at); \`drawer\` slides in from the side over a dimmed screen; \`dialog\` and \`sheet\` as before.
- **Stay low-fi.** Grays only; there are no color or font options on purpose. Images are crossed boxes with a
  label unless the designer gives you a picture (\`"src"\`), which gets sketchified to match
  (\`"sketch": false\` shows it as it is). Designers can drop, paste or upload pictures in the editor too.
- **Emphasis in words.** Any text can use \`**bold**\`, \`*italic*\`, \`__underline__\` and \`~~struck out~~\`
  (a sale price, the word that matters). Designers get Cmd+B, Cmd+I and Cmd+U in the editor. An image with a
  \`src\` can be cropped: \`"crop": [left, top, right, bottom]\` as fractions of the picture.
- 3 to 10 screens per file. One file per flow.
`;

function propLine(k: string, doc: string, kind: { kind: string; values?: readonly string[] }) {
  return `  - \`${k}\`: ${doc}${kind.kind === "enum" && kind.values ? ` (${kind.values.map((v) => `\`${v}\``).join(", ")})` : ""}`;
}

export function componentsMd(): string {
  const parts = ["# Wireframe components", "", `Generated from the tool. Query live with \`${CLI} vocab [category|component|icons] [--grep text]\`.`, "",
    "Every element also takes:", ...Object.entries(COMMON).filter(([k]) => k !== "type").map(([k, p]) => propLine(k, p.doc, p.type)), ""];
  for (const c of CATEGORIES) {
    parts.push(`## ${c.label}`, "", c.doc, "");
    for (const d of Object.values(COMPONENTS).filter((x) => x.category === c.id)) {
      parts.push(`### \`${d.type}\``, "", d.doc + (d.defaultPin ? ` Pinned \`${d.defaultPin}\` by default.` : "") + (d.bleed ? " Runs edge to edge." : ""), "");
      for (const [k, p] of Object.entries(d.props)) parts.push(propLine(k, p.doc, p.type));
      parts.push("", "```json", JSON.stringify(d.example), "```", "");
    }
  }
  parts.push("## Icons", "", ICONS.map((i) => `\`${i}\``).join(", "), "", "## Devices", "", Object.entries(DEVICES).map(([k, v]) => `\`${k}\` (${v.w}×${v.h})`).join(", ") + ", or `{ \"w\": …, \"h\": … }`.", "");
  return parts.join("\n");
}

export const FORMAT_MD = `# wireframe.json format

\`\`\`jsonc
{
  "title": "Corner Coffee: order ahead",
  "device": "phone",                 // phone (390×844) | tablet | desktop | watch | { "w": 1280, "h": 800 }
  "start": "menu",                   // first screen (default: the first one listed)
  "shared": {                        // pieces used on several screens
    "tabs": { "type": "tabbar", "items": [{ "text": "Menu", "goes": "menu" }, "Rewards", { "text": "Orders", "goes": "status" }] }
  },
  "screens": {                       // keyed by id: lowercase, no spaces (storyboards point at file#id)
    "menu": {
      "title": "Menu",               // name on the canvas (default: the id)
      "children": [                  // stacked top to bottom
        { "type": "title", "text": "Corner Coffee" },
        { "type": "search", "hint": "Search drinks" },
        { "type": "list", "items": [{ "title": "Oat latte", "meta": "$5.25", "goes": "drink" }, "Cold brew"] },
        { "type": "sketch", "label": "pastry carousel", "height": 96, "note": "Hide sold-out pastries" },
        { "type": "button", "text": "Cart (1)", "variant": "primary", "width": "hug", "pin": "bottom-right", "goes": "cart" },
        { "use": "tabs", "active": "Menu" }
      ]
    },
    "drink": { "children": [ { "type": "navbar", "back": true }, … ] }
  },
  "layout": { "menu": { "cart-button": { "dx": -8, "dy": 4 } } },  // written by the editor. Leave it alone.
  "canvas": { "menu": [12, 76] }                                   // written by the editor. Leave it alone.
}
\`\`\`

**Screens** take \`title\`, \`children\`, and optionally \`dir\` ("down" or "right"), \`gap\` (12), \`pad\` (16; 32 on
desktop), \`align\`, \`scroll\` (long pages grow to fit), \`statusbar\` (default on for phones and tablets), \`device\`
(per-screen override) and \`note\`.

**Layout** is stacks, never coordinates:
- Children stack down. Most things fill the width; small things (labels, badges, icons) hug their content.
  \`"width": "hug"\`, \`"fill"\` or a number overrides it.
- \`row\` puts children side by side, centered; fill-width children share the space, so two buttons split it.
  \`"justify": "between"\` pushes them apart (a heading and a price).
- \`card\` is a bordered box; \`section\` adds a small heading; \`grid\` makes columns.
- \`spacer\` without a height grows, pushing what follows to the bottom of the screen. \`"grow": 1\` on any
  element does the same for it.
- \`pin\` floats an element over the screen: \`top\`, \`bottom\`, \`center\`, \`left\`, \`right\`, \`top-left\`,
  \`top-right\`, \`bottom-left\`, \`bottom-right\`. \`tabbar\`, \`keyboard\`, \`toast\`, \`sheet\` and \`dialog\` pin
  themselves; sheets and dialogs dim the screen behind them.
- \`navbar\`, \`tabbar\`, \`topnav\` and \`keyboard\` ignore the screen's side padding and run edge to edge.

**Links**: \`"goes": "<screen id>"\` on any element, or on items (\`list\`, \`tabbar\`, \`tabs\`, \`segmented\`,
\`chips\`, \`sidebar\`, \`topnav\`, \`breadcrumbs\`, navbar \`actions\`) written as objects:
\`{ "text": "Orders", "goes": "status" }\`. \`"goes": "back"\` returns to the previous screen in Play mode.
\`navbar\` with \`"back": true\` goes back on its own.

**Free placement** is for the designer: dragging something in from the editor writes \`"at": [x, y]\` (screen px)
plus a \`width\`, taking it out of the stacks. Prefer stacks yourself; leave \`at\` where the designer put it.

**Drawings and markup** live on a screen: \`"shapes"\` (boxes, ovals, lines, arrows, freehand paths and free text,
\`{ "type": "rect", "points": [[x1, y1], [x2, y2]], "color": "red" }\`) and \`"markup"\` (sharpie strokes from play mode,
shown only there). \`"chrome"\` picks the device body: \`phone\`, \`tablet\`, \`watch\`, \`laptop\`, \`desktop\`, \`plain\` or \`none\`.

**Ids** (\`"id": "pay"\`) are optional. Give one to anything you'll talk about, link from or that the designer
nudges; the editor adds them when it needs to.
`;

export function exampleMd(exampleJson: string): string {
  return `# Worked example

Prompt: *"Wireframe the order-ahead flow for Corner Coffee: browse the menu, customize a latte, check out, then
watch the order status. Note that pastries sell out early."*

\`\`\`json
${exampleJson.trim()}
\`\`\`

Why it works: every screen has one primary action, the words are real, every way forward is linked with
\`goes\` (so the canvas shows the flow and Play clicks through it), the tab bar is defined once in \`shared\`,
layout is stacks plus one pinned cart button and a spacer, the pastry carousel the catalog doesn't have is a
labeled sketch box, and the "why" lives in notes instead of on the screens.

In a storyboard: \`wf render order-ahead.wireframe.json\`, then a panel's device can use
\`"screen": "./order-ahead.wireframe.json#status"\`.
`;
}

/** Pointer for AGENTS.md, for agents that don't discover skills on their own. */
export const agentsBlock = (skillDir: string) => `<!-- wireframe:start -->
## Wireframes (wireframekit skill)

For wireframes, low-fi mockups or screen flows, read \`${skillDir}/SKILL.md\` and follow it.
\`${CLI}\` there means: \`node ${skillDir}/scripts/wireframe.mjs\`.

- \`${CLI} vocab [category|component|icons]\` lists the components and their props. Don't invent types.
- Write \`<name>.wireframe.json\`, then run \`${CLI} validate <file>\` and fix every error.
- \`${CLI} dev <file>\` opens the flow canvas editor (run it in the background). The designer's edits save into the
  same file: re-read before editing, and keep \`layout\` and \`canvas\`.
- \`${CLI} export <file> --png\` renders the flow; \`${CLI} render <file>\` makes screen PNGs for storyboards.
<!-- wireframe:end -->
`;

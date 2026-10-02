---
name: wireframe
description: Draft low-fi, marker-style wireframes and clickable flows (app or web screens linked together) as a wireframe.json file, validate it, and open the flow canvas editor. Use when the user asks for a wireframe, a low-fi mockup, a screen flow, a clickable prototype sketch, or screens to show inside a storyboard.
---

# Wireframes, built by your agent

You turn a designer's loose description ("the order-ahead flow: menu, cart, pay, order status") into a
`*.wireframe.json` file: a few screens built from a closed catalog of about 50 components, linked together.
The tool validates it and opens a canvas where the designer sees the whole flow, tweaks things, and clicks
through it. Everything is drawn in grays, in a hand-drawn marker style, so nobody mistakes it for a final design.

## Running the tool

Everything runs through one bundled script in this skill's folder (it needs Node.js 18+ and nothing else):

```bash
node "${CLAUDE_SKILL_DIR}/scripts/wireframe.mjs" <command>
```

`${CLAUDE_SKILL_DIR}` is the folder this SKILL.md is in. If your agent doesn't fill it in, use that folder's
path. **Below, `wf` is short for that whole command.**

## Workflow

1. **Look up the components. Don't guess.** `wf vocab` lists every component by category,
   `wf vocab <component>` shows its props and an example, `wf vocab icons` lists icon names, and
   `wf vocab --grep cart` searches. If something isn't in the catalog, use a labeled
   `{ "type": "sketch", "label": "pastry carousel" }` box rather than inventing a type.
   Full list: [references/components.md](references/components.md).
2. **Write the file**: `<name>.wireframe.json` (`wf new <file>` makes a starter). Shape:
   [references/format.md](references/format.md). Worked example: [references/example.md](references/example.md).
3. **Validate and fix** until clean: `wf validate <file>`. Errors say exactly what to change
   ("did you mean …"). Warnings catch real problems (content running off the screen, a pinned button covering
   something, two primary buttons, screens nothing links to); fix them.
4. **Open the editor** in the background (it keeps running): `wf dev <file>`. Tell the designer the URL.
   Their tweaks save into the same file in real time.
5. **Look at what you made.** `wf export <file> --png` renders the whole flow to one image. Read it and fix
   anything cramped, cut off or confusing before you say you're done.
6. **Iterate on the same file.** Re-read it before each edit, because the designer may have changed things.
   The designer's own touches are theirs: `layout` (nudges), `canvas` (where screens sit), `at` (things they
   dragged in and placed freely), and a screen's `shapes` (their drawings) and `markup` (play-mode sharpie).
   Keep them unless asked. You can read them, though: a red circle or a scribbled note is often feedback for you.
7. **The designer may paste a pointer** like `In order.wireframe.json, screen "cart", button "Pay" (screens.cart.children[7])`.
   That's exactly the element to change.
8. **For a storyboard** (Storyboard Kit): `wf render <file>` writes `<name>.<screen>.png` next to the file,
   and a storyboard panel shows it with `"screen": "./<name>.wireframe.json#<screen>"`. Storyboard Kit re-renders
   it automatically when the wireframe changes.

## Craft: what makes a wireframe useful

- **One job per screen.** Know what the person is trying to do there, and make exactly one button
  `"variant": "primary"`: the main action. Everything else is secondary, outline or a link.
- **Real words.** Real labels, prices, names and statuses ("Preparing · about 4 min", "$5.25"), never lorem
  ipsum. Use `{ "type": "text", "lines": 3 }` squiggles only for body copy whose wording doesn't matter yet.
- **Link everything that goes somewhere.** Buttons, list items, tabs and links take `"goes": "<screen id>"`
  (or `"back"`). The canvas draws an arrow for each and Play mode clicks through them.
- **Show the unhappy paths.** Empty states, errors, loading and "it's running late" are their own screens
  (`"status-delayed"`), linked from where they happen. They're where the design work is.
- **Let stacks do the layout.** Never write coordinates. Screens stack their children down; use `row` to put
  things side by side, `card` to group, `spacer` to push what follows to the bottom, and `pin` to float
  something (a floating cart button: `"pin": "bottom-right"`). Bars like `navbar`, `tabbar` and `topnav`
  run edge to edge on their own.
- **Define repeated pieces once.** Put the tab bar or site header in `shared` and place it with
  `{ "use": "tabs", "active": "Orders" }`. Arrows aren't drawn for shared navigation, so the canvas stays readable.
- **Say why with notes.** `"note": "Pastries sell out by 10"` puts a numbered sticky beside the screen; the
  screen itself stays clean.
- **Pick the device.** `"device": "phone"` (default), `"phone-small"`, `"phone-large"`, `"tablet"`,
  `"tablet-landscape"`, `"laptop"`, `"desktop"`, `"watch"`, or any size `{ "w": 1280, "h": 800 }`. Screens can
  mix sizes: set `device` on a screen to override the file's. To show the same screen on another device, add a
  screen with that `device` and `"versionOf": "<original id>"`, and adapt its layout (a phone list becomes a desktop
  grid, a tab bar becomes a top nav). Long web pages: `"scroll": true` on the screen. A desktop app layout:
  `"dir": "right"` on the screen with a `sidebar` first and a `stack` for the main column.
- **Stay low-fi.** Grays only; there are no color or font options on purpose. Images are crossed boxes with a
  label unless the designer gives you a picture (`"src"`), which gets sketchified to match
  (`"sketch": false` shows it as it is). Designers can drop, paste or upload pictures in the editor too.
- **Emphasis in words.** Any text can use `**bold**`, `*italic*` and `~~struck out~~` (a sale price, the
  word that matters). Designers get Cmd+B and Cmd+I in the editor.
- 3 to 10 screens per file. One file per flow.

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

## Write it plainly

Everything you write here (screen titles and the notes beside screens) should sound like you telling a teammate across the table. If it sounds
like a headline, a slogan or a slide from a consultant, write it again.

- **Whole sentences, ordinary words.** Say who does what. "People don't mind when a tool comes back a day late."
  Not "Owners shrug at late."
- **One idea in a sentence.** No semicolons. No colon bolting two ideas together. If there are two things to say,
  write two short sentences.
- **Keep the small words** (the, a, their, when, because, so). Leaving them out is what makes writing read like a
  telegram.
- **Say the thing, don't name it.** "We don't know how often tools come back late" is clearer than "The claim has
  no number behind it."
- **The plainest word wins.** "Use", not "leverage". "Show", not "surface". "Problem", not "pain point". "The
  hard part", not "friction". "Depends on", not "rests on" or "hinges on". "Because", not "due to".
- **No clever turns.** No metaphors, no slogans, no lists of three for rhythm. If a phrase is showing off, cut
  it.
- **Numbers and names as they are.** "8 of 12 people". "The Pay button". Not "most users" or "the primary action".
- **Short.** A title is one plain sentence you could say out loud, about ten words at most. A description is one
  or two short sentences. A sticky is a dozen words. A step in a flow is the one place for a clipped label: a
  few words, verb first ("Asks the barista").
- **Read it out loud.** If you wouldn't say it that way to a friend, change it until you would.

| Instead of | Write |
|---|---|
| Owners shrug at late; hidden damage is what stops them lending | People don't mind late returns. They stop lending when tools come back broken. |
| The ask rests on one claim with no number behind it | The PM says people return things late. We don't know how often. |
| The fee acts after the loan, and never looks at the tool | A late fee doesn't check whether the tool is broken. |
| Try first: check the tool at handover, let the app do the asking | A cheaper idea to try first |
| Late, nobody tells them, so they ask a human | When the order is late, people ask the barista |
| Trust lost | After this, he stops ordering ahead |
| Surface the real queue to reduce friction | Show people the real queue so they know how long it'll be |

The same goes for the message you send when you hand it over.

The words inside a screen are different: write them the way the real product would (short labels, real prices,
real names).

## Craft: what makes a wireframe useful

- **One job per screen.** Know what the person is trying to do there, and make exactly one button
  `"variant": "primary"`: the main action. Everything else is secondary, outline or a link.
- **Real words.** Real labels, prices, names and statuses ("Preparing · about 4 min", "$5.25"), never lorem
  ipsum. Use `{ "type": "text", "lines": 3 }` squiggles only for body copy whose wording doesn't matter yet.
- **Real numbers on charts, when you have them.** A `chart` with `data` (`[["Mon", 42], ["Tue", 38]]`) draws
  them roughly, with each number written on it; `highlight` the one the screen is about. Leave `data` out for a
  placeholder when the numbers don't matter yet. Never invent numbers that look like real findings.
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
- **Show the states.** Controls take `"state"`: `hover` (a pointer over it), `pressed`, `focus` (a focus ring),
  `disabled`, `error`, `loading` (a spinner in the button), `selected`, and `open` for things that drop down
  (`select`, `search` suggestions, `date-picker`'s calendar, `split-button`'s menu), drawn over the screen. Items
  in lists, menus, tabs, trees and accordions take a `state` too (`hover`, `selected`, `disabled`). Use them
  when the moment matters (the disabled Pay button until a size is picked, the error on a bad card number), or
  lay several copies side by side to spec a component's states. Leave `state` out for the normal look.
- **Websites in a browser.** `"url": "cornercoffee.com/menu"` on a screen draws browser tabs and an address bar
  across its top (the screen's `title` is the tab). The `browser` component does the same around a page inside a
  screen, and `window` frames a desktop app.
- **Overlays float.** `menu`, `popover` and `tooltip` go where you place them (usually `"pin"` or a `row`
  beside what they point at); `drawer` slides in from the side over a dimmed screen; `dialog` and `sheet` as before.
- **Stay low-fi.** Grays only; there are no color or font options on purpose. Images are crossed boxes with a
  label unless the designer gives you a picture (`"src"`), which gets sketchified to match
  (`"sketch": false` shows it as it is). Designers can drop, paste or upload pictures in the editor too.
- **Emphasis in words.** Any text can use `**bold**`, `*italic*`, `__underline__` and `~~struck out~~`
  (a sale price, the word that matters). Designers get Cmd+B, Cmd+I and Cmd+U in the editor. An image with a
  `src` can be cropped: `"crop": [left, top, right, bottom]` as fractions of the picture.
- 3 to 10 screens per file. One file per flow.

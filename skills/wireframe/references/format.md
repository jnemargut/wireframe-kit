# wireframe.json format

```jsonc
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
```

**Screens** take `title`, `children`, and optionally `dir` ("down" or "right"), `gap` (12), `pad` (16; 32 on
desktop), `align`, `scroll` (long pages grow to fit), `statusbar` (default on for phones and tablets), `device`
(per-screen override) and `note`.

**Layout** is stacks, never coordinates:
- Children stack down. Most things fill the width; small things (labels, badges, icons) hug their content.
  `"width": "hug"`, `"fill"` or a number overrides it.
- `row` puts children side by side, centered; fill-width children share the space, so two buttons split it.
  `"justify": "between"` pushes them apart (a heading and a price).
- `card` is a bordered box; `section` adds a small heading; `grid` makes columns.
- `spacer` without a height grows, pushing what follows to the bottom of the screen. `"grow": 1` on any
  element does the same for it.
- `pin` floats an element over the screen: `top`, `bottom`, `center`, `left`, `right`, `top-left`,
  `top-right`, `bottom-left`, `bottom-right`. `tabbar`, `keyboard`, `toast`, `sheet` and `dialog` pin
  themselves; sheets and dialogs dim the screen behind them.
- `navbar`, `tabbar`, `topnav` and `keyboard` ignore the screen's side padding and run edge to edge.

**Links**: `"goes": "<screen id>"` on any element, or on items (`list`, `tabbar`, `tabs`, `segmented`,
`chips`, `sidebar`, `topnav`, `breadcrumbs`, navbar `actions`) written as objects:
`{ "text": "Orders", "goes": "status" }`. `"goes": "back"` returns to the previous screen in Play mode.
`navbar` with `"back": true` goes back on its own.

**Free placement** is for the designer: dragging something in from the editor writes `"at": [x, y]` (screen px)
plus a `width`, taking it out of the stacks. Prefer stacks yourself; leave `at` where the designer put it.

**Drawings and markup** live on a screen: `"shapes"` (boxes, ovals, lines, arrows, freehand paths and free text,
`{ "type": "rect", "points": [[x1, y1], [x2, y2]], "color": "red" }`) and `"markup"` (sharpie strokes from play mode,
shown only there). `"chrome"` picks the device body: `phone`, `tablet`, `watch`, `laptop`, `desktop`, `plain` or `none`.

**Ids** (`"id": "pay"`) are optional. Give one to anything you'll talk about, link from or that the designer
nudges; the editor adds them when it needs to.

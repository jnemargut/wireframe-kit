# Wireframe components

Generated from the tool. Query live with `wf vocab [category|component|icons] [--grep text]`.

Every element also takes:
  - `use`: Use a piece from the file's `shared` section instead of a type, e.g. "use": "tabs". Other props override it.
  - `id`: A name for this element, so links, nudges and agent pointers can find it.
  - `goes`: Tapping it goes to this screen id (or "back").
  - `pin`: Float it over the screen instead of stacking it ("bottom", "top-right", ...). (`top`, `bottom`, `left`, `right`, `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`)
  - `width`: "fill", "hug", or a number of px.
  - `height`: Height in px (most things size themselves).
  - `grow`: Take a share of leftover space along the stack (a spacer grows by default).
  - `note`: A designer's note. Shown as a numbered sticky beside the screen on the canvas, never on the screen itself.
  - `at`: Place it freely at [x, y] on the screen, outside the stacks (top-level elements only). The editor writes this when a designer drags something in; agents should prefer stacks.

## Layout

Containers that stack things down or across.

### `stack`

Stacks children down (default) or across.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `dir`: Stack direction. (`down`, `right`)

```json
{"type":"stack","dir":"down","gap":8,"children":[{"type":"text","text":"..."}]}
```

### `row`

Children side by side, centered vertically. Fill-width children share the space.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `wrap`: Wrap onto more lines when it runs out of room.

```json
{"type":"row","gap":8,"children":[{"type":"button","text":"Cancel"},{"type":"button","text":"Save","variant":"primary"}]}
```

### `card`

A bordered box that stacks its children down.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `flat`: No border, just a soft fill.

```json
{"type":"card","children":[{"type":"heading","text":"Oat latte"},{"type":"text","text":"12 oz, extra shot"}]}
```

### `section`

A titled group: a small heading, then its children.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: The section heading.
  - `action`: Small link on the right, e.g. "See all".

```json
{"type":"section","title":"Favorites","action":"See all","children":[{"type":"list","items":["Oat latte","Cold brew"]}]}
```

### `grid`

Children in equal columns.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `columns`: Number of columns (default 2).

```json
{"type":"grid","columns":2,"children":[{"type":"image","label":"Croissant"},{"type":"image","label":"Muffin"}]}
```

### `spacer`

Empty space. Without a height it grows, pushing what follows to the bottom.


```json
{"type":"spacer"}
```

## Text

Titles, paragraphs and small labels.

### `title`

The big marker title of a screen.

  - `text`: The words.
  - `align`: Text alignment. (`start`, `center`, `end`)

```json
{"type":"title","text":"Corner Coffee"}
```

### `heading`

A smaller marker heading.

  - `text`: The words.
  - `align`: Text alignment. (`start`, `center`, `end`)

```json
{"type":"heading","text":"Your order"}
```

### `text`

A paragraph. Leave `text` out and set `lines` for placeholder squiggles.

  - `text`: The words.
  - `lines`: Placeholder lines when there's no text.
  - `size`: Text size. (`sm`, `md`, `lg`)
  - `muted`: Grey instead of ink.
  - `align`: Text alignment. (`start`, `center`, `end`)

```json
{"type":"text","text":"We'll text you when it's ready."}
```

### `label`

Small gray text: captions, meta, helper text.

  - `text`: The words.
  - `align`: Text alignment. (`start`, `center`, `end`)

```json
{"type":"label","text":"Order #214 · pickup counter"}
```

### `link`

Underlined text that goes somewhere.

  - `text`: The words.

```json
{"type":"link","text":"Forgot password?","goes":"reset"}
```

### `badge`

A small pill: counts, statuses, tags.

  - `text`: The words.
  - `filled`: Dark fill.

```json
{"type":"badge","text":"New"}
```

## Controls

Buttons and form inputs.

### `button`

A button. Mark the one main action on a screen `primary`.

  - `text`: The words.
  - `variant`: primary = the main action (dark). Default secondary. (`primary`, `secondary`, `outline`, `text`)
  - `icon`: Icon name (see wf vocab icons).
  - `size`: Size. (`sm`, `md`, `lg`)

```json
{"type":"button","text":"Pay","variant":"primary","goes":"status"}
```

### `icon-button`

A tappable icon.

  - `icon`: Icon name (see wf vocab icons).
  - `variant`: Look. (`plain`, `outline`, `filled`)
  - `badge`: Small count dot, e.g. "2".

```json
{"type":"icon-button","icon":"cart","badge":"1","goes":"cart"}
```

### `input`

A text field with an optional label above.

  - `label`: Label above.
  - `hint`: Placeholder.
  - `value`: Typed value.
  - `icon`: Leading icon.
  - `error`: Error text below.

```json
{"type":"input","label":"Name for the order","hint":"e.g. Marcus"}
```

### `textarea`

A multi-line text field.

  - `label`: Label above.
  - `hint`: Placeholder.
  - `value`: Typed value.
  - `rows`: Visible rows (default 3).

```json
{"type":"textarea","label":"Notes for the barista","hint":"Extra hot, please"}
```

### `search`

A rounded search field.

  - `hint`: Placeholder.
  - `value`: Typed value.

```json
{"type":"search","hint":"Search drinks"}
```

### `select`

A dropdown field.

  - `label`: Label above.
  - `value`: Chosen value.
  - `hint`: Placeholder.

```json
{"type":"select","label":"Size","value":"12 oz"}
```

### `checkbox`

A checkbox with text.

  - `text`: The words.
  - `checked`: Ticked.

```json
{"type":"checkbox","text":"Save this order","checked":true}
```

### `radio`

A group of radio options.

  - `items`: The options.
  - `value`: The chosen option.

```json
{"type":"radio","items":["Pickup","Delivery"],"value":"Pickup"}
```

### `toggle`

A switch with text on the left.

  - `text`: The words.
  - `on`: Switched on.

```json
{"type":"toggle","text":"Text me when it's ready","on":true}
```

### `slider`

A slider.

  - `label`: Label above.
  - `value`: 0 to 1.

```json
{"type":"slider","label":"Sweetness","value":0.3}
```

### `stepper`

A − n + quantity control.

  - `value`: The number.

```json
{"type":"stepper","value":1}
```

### `segmented`

A segmented control.

  - `items`: The segments.
  - `active`: The selected one.

```json
{"type":"segmented","items":["Hot","Iced"],"active":"Hot"}
```

### `chips`

A wrapping row of pills (filters, tags).

  - `items`: The chips.
  - `active`: The selected ones.

```json
{"type":"chips","items":["All","Coffee","Tea","Pastries"],"active":["All"]}
```

## Navigation

Bars, tabs and menus. Items can link with goes.

### `navbar`

The bar at the top of an app screen. Runs edge to edge.

  - `title`: Title in the middle.
  - `back`: Show a back arrow (goes back).
  - `actions`: Icons on the right: icon names, or { icon, goes }.
  - `large`: Big title on its own line, left-aligned.

```json
{"type":"navbar","title":"Your order","back":true}
```

### `tabbar`

App tabs pinned to the bottom. Pinned `bottom` by default. Runs edge to edge.

  - `items`: Tabs: text, or { text, icon, goes }. Icons are guessed from the words.
  - `active`: The current tab.

```json
{"type":"tabbar","items":["Home","Order","Rewards","Account"],"active":"Order"}
```

### `tabs`

Underlined tabs inside a screen.

  - `items`: Tabs: text, or { text, goes }.
  - `active`: The current tab.

```json
{"type":"tabs","items":["Menu","Favorites","Past orders"],"active":"Menu"}
```

### `breadcrumbs`

A › trail › of places.

  - `items`: The trail.

```json
{"type":"breadcrumbs","items":["Account","Orders","#214"]}
```

### `pagination`

‹ 1 2 3 › page buttons.

  - `pages`: How many pages (default 5).
  - `current`: Current page (default 1).

```json
{"type":"pagination","pages":5,"current":2}
```

### `dots`

Carousel page dots.

  - `count`: How many (default 3).
  - `active`: Which is current, from 1.

```json
{"type":"dots","count":4,"active":1}
```

### `sidebar`

A side menu for desktop and tablet. Put it first in a screen with "dir": "right".

  - `title`: Brand or app name at the top.
  - `items`: Menu items: text, or { text, icon, goes }.
  - `active`: The current item.

```json
{"type":"sidebar","title":"Corner Coffee","items":["Orders","Menu","Stores","Settings"],"active":"Orders"}
```

### `topnav`

A website's top bar: brand left, links right. Runs edge to edge.

  - `title`: Brand.
  - `items`: Links: text, or { text, goes }.
  - `active`: The current one.
  - `button`: A button on the far right, e.g. "Order now".

```json
{"type":"topnav","title":"Corner Coffee","items":["Menu","Locations","Rewards"],"button":"Order now"}
```

## Content

Images, lists, tables, charts and other placeholders.

### `image`

An image placeholder (a crossed box). Give `src` to use a real picture; it's sketchified in grays.

  - `label`: What the picture is.
  - `aspect`: Shape when there's no height: "16:9", "1:1", "4:3".
  - `src`: Optional image file path, sketchified.
  - `round`: Round corners a lot (or a circle when square).

```json
{"type":"image","label":"Latte art photo","aspect":"16:9"}
```

### `avatar`

A round profile picture or initials.

  - `text`: Initials (otherwise a head shape).
  - `size`: Diameter (default 40).

```json
{"type":"avatar","text":"MJ"}
```

### `icon`

A single icon.

  - `icon`: Icon name (see wf vocab icons).
  - `size`: Size (default 24).

```json
{"type":"icon","icon":"coffee","size":32}
```

### `list`

Rows of things. Items can be text or { title, subtitle, meta, icon, image, goes }.

  - `items`: The rows.
  - `chevrons`: Show › on every row.
  - `dividers`: Lines between rows (default true).
  - `cards`: Each row as its own card.

```json
{"type":"list","items":[{"title":"Oat latte","subtitle":"12 oz · extra shot","meta":"$5.25","goes":"drink"},{"title":"Cold brew","meta":"$4.50"}]}
```

### `table`

A data table.

  - `columns`: Column headings.
  - `rows`: Rows: arrays of cell text.

```json
{"type":"table","columns":["Order","Store","Total"],"rows":[["#214","Main St","$5.25"],["#198","Main St","$9.80"]]}
```

### `chart`

A chart placeholder.

  - `kind`: Chart type (default bar). (`bar`, `line`, `pie`, `donut`)
  - `label`: Caption.

```json
{"type":"chart","kind":"line","label":"Orders this week"}
```

### `map`

A map placeholder with a pin.

  - `label`: Caption.

```json
{"type":"map","label":"Corner Coffee, Main St"}
```

### `video`

A video placeholder (16:9 with a play button).

  - `label`: Caption.

```json
{"type":"video","label":"How we roast"}
```

### `rating`

Stars out of five.

  - `value`: 0 to 5.

```json
{"type":"rating","value":4}
```

### `divider`

A horizontal line, optionally with words in the middle.

  - `text`: Words in the middle, e.g. "or".

```json
{"type":"divider"}
```

### `keyboard`

A phone keyboard, pinned to the bottom. Pinned `bottom` by default. Runs edge to edge.


```json
{"type":"keyboard"}
```

## Feedback

Alerts, toasts, progress and overlays.

### `sheet`

A bottom sheet over a dimmed screen. Pinned `bottom` by default. Runs edge to edge.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: Sheet title.

```json
{"type":"sheet","title":"Pickup time","children":[{"type":"radio","items":["As soon as it's ready","Schedule for later"],"value":"As soon as it's ready"},{"type":"button","text":"Done","variant":"primary"}]}
```

### `dialog`

A centered dialog over a dimmed screen. Pinned `center` by default.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: Dialog title.

```json
{"type":"dialog","title":"Cancel order?","children":[{"type":"text","text":"Your barista may have started it."},{"type":"row","children":[{"type":"button","text":"Keep it"},{"type":"button","text":"Cancel","variant":"primary"}]}]}
```

### `alert`

An inline message box.

  - `text`: The message.
  - `kind`: Changes the icon (default info). (`info`, `success`, `warning`, `error`)
  - `title`: Bold first line.

```json
{"type":"alert","kind":"warning","text":"Running about 5 minutes behind."}
```

### `toast`

A short dark message floating near the bottom. Pinned `bottom` by default.

  - `text`: The message.
  - `action`: A link on the right, e.g. "Undo".

```json
{"type":"toast","text":"Added to your order","action":"Undo"}
```

### `progress`

A progress bar.

  - `value`: 0 to 1 (default 0.4).
  - `label`: Caption above.

```json
{"type":"progress","value":0.4,"label":"Preparing · about 4 min"}
```

### `steps`

Numbered steps with the current one marked (checkout, order tracking).

  - `items`: Step names.
  - `current`: Current step, from 1.

```json
{"type":"steps","items":["Ordered","Preparing","Ready"],"current":2}
```

### `spinner`

A loading spinner.

  - `label`: Caption beside it.

```json
{"type":"spinner","label":"Loading menu"}
```

## Sketch

A labeled box for anything not in the catalog.

### `sketch`

A dashed, labeled box for anything the catalog doesn't have. Say what it is.

  - `label`: What goes here, e.g. "pastry carousel".

```json
{"type":"sketch","label":"pastry carousel","height":90}
```

## Icons

`menu`, `back`, `close`, `search`, `plus`, `minus`, `check`, `chevron-right`, `chevron-down`, `chevron-left`, `heart`, `star`, `cart`, `bag`, `user`, `users`, `home`, `bell`, `settings`, `share`, `more`, `map-pin`, `clock`, `calendar`, `camera`, `image`, `mail`, `phone`, `chat`, `filter`, `edit`, `trash`, `lock`, `info`, `alert`, `play`, `list`, `grid`, `download`, `upload`, `coffee`, `card`, `gift`, `bookmark`, `send`, `mic`, `refresh`, `logout`, `help`, `doc`, `folder`, `link`, `eye`, `sun`, `moon`

## Devices

`phone` (390×844), `phone-small` (375×667), `phone-large` (430×932), `tablet` (820×1180), `tablet-landscape` (1180×820), `laptop` (1280×800), `desktop` (1440×900), `watch` (198×242), or `{ "w": …, "h": … }`.

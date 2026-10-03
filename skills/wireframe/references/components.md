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
  - `locked`: Stays put until it's unlocked (editor-owned: Shift+Cmd+L).
  - `group`: Moves and selects with the others in its group (editor-owned: Cmd+G).
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
  - `state`: Draw it in a state: hover (the pointer is over it), selected (outlined), disabled (grayed out). Default normal. (`normal`, `hover`, `selected`, `disabled`)

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

### `accordion`

Sections that expand and collapse. The open ones show their text.

  - `items`: Sections: text, or { title, text, state }.
  - `open`: Titles of the expanded sections.

```json
{"type":"accordion","items":[{"title":"How long does pickup take?","text":"Most orders are ready in 4 minutes."},{"title":"Can I change my order?"}],"open":["How long does pickup take?"]}
```

### `browser`

A web browser window: tabs, back/forward and an address bar with your `url`. Put the page inside.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `url`: The address shown, e.g. "cornercoffee.com/menu".
  - `title`: The tab's title.
  - `tabs`: More tabs beside it.

```json
{"type":"browser","url":"cornercoffee.com/menu","title":"Menu · Corner Coffee","children":[{"type":"topnav","title":"Corner Coffee","items":["Menu","Rewards"]},{"type":"image","label":"Hero photo"}]}
```

### `window`

A desktop app window with a title bar and close buttons. Put the app inside.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: The window title.

```json
{"type":"window","title":"Corner Coffee for Mac","children":[{"type":"text","lines":3}]}
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
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

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
  - `variant`: primary = the main action (dark). danger = destructive. Default secondary. (`primary`, `secondary`, `outline`, `text`, `danger`)
  - `icon`: Icon name (see wf vocab icons).
  - `size`: Size. (`sm`, `md`, `lg`)
  - `state`: Draw it in a state: hover (the pointer is over it), pressed (mid-click or tap), focus (keyboard focus ring), disabled (grayed out), loading (a spinner in place of its content). Default normal. (`normal`, `hover`, `pressed`, `focus`, `disabled`, `loading`)

```json
{"type":"button","text":"Pay","variant":"primary","goes":"status"}
```

### `icon-button`

A tappable icon.

  - `icon`: Icon name (see wf vocab icons).
  - `variant`: Look. (`plain`, `outline`, `filled`)
  - `badge`: Small count dot, e.g. "2".
  - `state`: Draw it in a state: hover (the pointer is over it), pressed (mid-click or tap), focus (keyboard focus ring), disabled (grayed out), loading (a spinner in place of its content). Default normal. (`normal`, `hover`, `pressed`, `focus`, `disabled`, `loading`)

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
  - `help`: Helper text below.
  - `required`: Mark the label with *.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`)

```json
{"type":"input","label":"Name for the order","hint":"e.g. Marcus"}
```

### `textarea`

A multi-line text field.

  - `label`: Label above.
  - `hint`: Placeholder.
  - `value`: Typed value.
  - `rows`: Visible rows (default 3).
  - `error`: Error text below.
  - `help`: Helper text below.
  - `required`: Mark the label with *.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`)

```json
{"type":"textarea","label":"Notes for the barista","hint":"Extra hot, please"}
```

### `search`

A rounded search field.

  - `hint`: Placeholder.
  - `value`: Typed value.
  - `items`: Suggestions shown when it's open (state "open").
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), open (its dropdown, menu or calendar showing). Default normal. (`normal`, `hover`, `focus`, `disabled`, `open`)

```json
{"type":"search","hint":"Search drinks"}
```

### `select`

A dropdown field. Give `items` and set `state: "open"` to show the list dropped down (the chosen value is ticked).

  - `label`: Label above.
  - `value`: Chosen value.
  - `hint`: Placeholder.
  - `items`: The options (shown when open). Items can be { text, icon, state }.
  - `error`: Error text below.
  - `help`: Helper text below.
  - `required`: Mark the label with *.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border), open (its dropdown, menu or calendar showing). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`, `open`)

```json
{"type":"select","label":"Size","value":"12 oz","items":["8 oz","12 oz","16 oz"]}
```

### `checkbox`

A checkbox with text.

  - `text`: The words.
  - `checked`: Ticked.
  - `mixed`: Partly ticked (a dash): some of a group is chosen.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`)

```json
{"type":"checkbox","text":"Save this order","checked":true}
```

### `radio`

A group of radio options.

  - `items`: The options.
  - `value`: The chosen option.
  - `dir`: Stack the options down (default) or across. (`down`, `right`)
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"radio","items":["Pickup","Delivery"],"value":"Pickup"}
```

### `toggle`

A switch with text on the left.

  - `text`: The words.
  - `on`: Switched on.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"toggle","text":"Text me when it's ready","on":true}
```

### `slider`

A slider.

  - `label`: Label above.
  - `value`: 0 to 1.
  - `to`: A second handle for a range, 0 to 1.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"slider","label":"Sweetness","value":0.3}
```

### `stepper`

A − n + quantity control.

  - `value`: The number.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"stepper","value":1}
```

### `segmented`

A segmented control.

  - `items`: The segments. Items can be { text, icon, state }.
  - `active`: The selected one.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"segmented","items":["Hot","Iced"],"active":"Hot"}
```

### `chips`

A wrapping row of pills (filters, tags).

  - `items`: The chips.
  - `active`: The selected ones.
  - `close`: An × on each chip (removable filters).
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

```json
{"type":"chips","items":["All","Coffee","Tea","Pastries"],"active":["All"]}
```

### `split-button`

A button with a ▾ beside it for more actions. With state open, its menu shows.

  - `text`: The main action.
  - `variant`: Look (default secondary). (`primary`, `secondary`, `outline`)
  - `items`: The other actions in its menu.
  - `state`: Draw it in a state: hover (the pointer is over it), pressed (mid-click or tap), focus (keyboard focus ring), disabled (grayed out), open (its dropdown, menu or calendar showing). Default normal. (`normal`, `hover`, `pressed`, `focus`, `disabled`, `open`)

```json
{"type":"split-button","text":"Save","variant":"primary","items":["Save as draft","Save and close"]}
```

### `fab`

A floating round action button, pinned bottom-right. Give it text for a wide one. Pinned `bottom-right` by default.

  - `icon`: Icon (default plus).
  - `text`: Text beside the icon (makes it wide).
  - `state`: Draw it in a state: hover (the pointer is over it), pressed (mid-click or tap), focus (keyboard focus ring), disabled (grayed out), loading (a spinner in place of its content). Default normal. (`normal`, `hover`, `pressed`, `focus`, `disabled`, `loading`)

```json
{"type":"fab","icon":"plus","goes":"new"}
```

### `date-picker`

A date field with a calendar icon. With state open, the month calendar drops down.

  - `label`: Label above.
  - `value`: The date, e.g. "Oct 14, 2026".
  - `hint`: Placeholder.
  - `day`: The chosen day of the month in the open calendar.
  - `today`: Today's day in the open calendar (ringed).
  - `month`: Month shown in the open calendar, e.g. "October 2026".
  - `error`: Error text below.
  - `required`: Mark the label with *.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border), open (its dropdown, menu or calendar showing). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`, `open`)

```json
{"type":"date-picker","label":"Pickup date","value":"Oct 14, 2026","day":14}
```

### `tag-input`

A field holding removable tags (multi-select, recipients, labels).

  - `label`: Label above.
  - `items`: The tags.
  - `hint`: Placeholder after the tags.
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out), error (red-flag border). Default normal. (`normal`, `hover`, `focus`, `disabled`, `error`)

```json
{"type":"tag-input","label":"Allergies","items":["Nuts","Dairy"],"hint":"Add another"}
```

### `file-upload`

A drop zone for files, with any picked files listed below.

  - `label`: Label above.
  - `text`: Words in the zone (default: drag a file here or browse).
  - `files`: Files already added.
  - `state`: Draw it in a state: hover (the pointer is over it), disabled (grayed out), error (red-flag border). Default normal. (`normal`, `hover`, `disabled`, `error`)

```json
{"type":"file-upload","label":"Receipt","files":["receipt-oct.pdf"]}
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

  - `items`: Tabs: text, or { text, goes, badge, state }.
  - `active`: The current tab.
  - `kind`: Underlined (default) or boxed tabs. (`line`, `boxed`)
  - `state`: Draw it in a state: hover (the pointer is over it), focus (keyboard focus ring), disabled (grayed out). Default normal. (`normal`, `hover`, `focus`, `disabled`)

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
  - `items`: Menu items: text, or { text, icon, goes, badge, state }.
  - `active`: The current item.
  - `collapsed`: Icons only (a narrow rail).

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

### `toolbar`

A bar of actions above a table or editor: buttons or icons on the left, a search and a main button on the right.

  - `items`: Actions: icon names, text, or { text, icon, goes }.
  - `search`: Search placeholder (shows a search field).
  - `button`: A main button on the right.

```json
{"type":"toolbar","items":["filter","sort","Export"],"search":"Search orders","button":"New order"}
```

## Content

Images, lists, tables, charts and other placeholders.

### `image`

An image placeholder (a crossed box). Give `src` to use a real picture; it's sketchified in grays (`"sketch": false` shows it as it is).

  - `label`: What the picture is.
  - `aspect`: Shape when there's no height: "16:9", "1:1", "4:3".
  - `src`: Optional image file path, sketchified.
  - `sketch`: false shows the picture as it is, instead of sketchified in grays.
  - `crop`: Show only part of the picture: [left, top, right, bottom] as fractions (the editor's Crop button writes it).
  - `round`: Round corners a lot (or a circle when square).
  - `mirror`: Flip the picture left to right.
  - `turn`: Turn the picture clockwise: 0, 90, 180 or 270.
  - `state`: Draw it in a state: hover (the pointer is over it), selected (outlined). Default normal. (`normal`, `hover`, `selected`)

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

  - `items`: The rows. Each can have a `state`: hover, selected or disabled.
  - `chevrons`: Show › on every row.
  - `dividers`: Lines between rows (default true).
  - `cards`: Each row as its own card.
  - `select`: A checkbox on every row (rows with state selected are ticked).
  - `selected`: The title of the selected row (highlighted).

```json
{"type":"list","items":[{"title":"Oat latte","subtitle":"12 oz · extra shot","meta":"$5.25","goes":"drink"},{"title":"Cold brew","meta":"$4.50"}]}
```

### `table`

A data table.

  - `columns`: Column headings.
  - `rows`: Rows: arrays of cell text.
  - `select`: A checkbox column.
  - `selected`: Selected rows, by number from 1 (ticked and highlighted), e.g. ["2"].
  - `sort`: The column it's sorted by (an arrow in the heading).
  - `actions`: A ⋮ menu at the end of every row.
  - `striped`: Shade every other row.

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

### `calendar`

A month calendar with a chosen day.

  - `month`: e.g. "October 2026".
  - `day`: The chosen day.
  - `today`: Today's day (ringed).
  - `start`: Weekday the 1st falls on, 0 = Sunday (default 4).

```json
{"type":"calendar","month":"October 2026","day":14,"today":2}
```

### `details`

Label and value pairs (order details, a profile, settings summary).

  - `items`: Pairs: { label, value } (or "Label: value" text).
  - `columns`: Pairs per row (default 1).

```json
{"type":"details","items":[{"label":"Order","value":"#214"},{"label":"Pickup","value":"Main St · 8:10"},{"label":"Total","value":"$5.25"}]}
```

### `stat`

A big number with its label and change (dashboards).

  - `label`: What it counts.
  - `value`: The number, e.g. "1,284".
  - `delta`: The change, e.g. "+12%".
  - `trend`: Arrow direction for the change. (`up`, `down`, `flat`)

```json
{"type":"stat","label":"Orders today","value":"1,284","delta":"+12%","trend":"up"}
```

### `avatar-group`

Overlapping profile pictures with a +N.

  - `items`: Initials, one per person (blank = a head shape).
  - `more`: The +N count after them.

```json
{"type":"avatar-group","items":["MJ","AK",""],"more":4}
```

### `tree`

Nested folders or categories that expand.

  - `items`: Items: text, or { text, icon, open, children: [...], state }.
  - `selected`: The highlighted item.

```json
{"type":"tree","items":[{"text":"Drinks","open":true,"children":["Coffee","Tea"]},"Food","Merch"]}
```

### `timeline`

Events down a line (order history, activity).

  - `items`: Events: text, or { title, meta, text }.
  - `current`: How many are done (the rest are hollow).

```json
{"type":"timeline","items":[{"title":"Ordered","meta":"8:01"},{"title":"Preparing","meta":"8:03"},{"title":"Ready","meta":"about 8:10"}],"current":2}
```

### `code`

A block of code or terminal text in a mono font. Lines split on \n.

  - `text`: The code. Leave it out for placeholder lines.
  - `lines`: Placeholder lines when there's no text (default 4).
  - `numbers`: Line numbers.
  - `copy`: A copy button in the corner.

```json
{"type":"code","text":"npm install corner-coffee","copy":true}
```

## Feedback

Alerts, banners, toasts, progress, loading and empty states.

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
  - `kind`: A bar (default) or a ring with the percentage inside. (`bar`, `circle`)

```json
{"type":"progress","value":0.4,"label":"Preparing · about 4 min"}
```

### `steps`

Numbered steps with the current one marked (checkout, order tracking).

  - `items`: Step names.
  - `current`: Current step, from 1.
  - `vertical`: Stack the steps down the screen (a wizard's side list).

```json
{"type":"steps","items":["Ordered","Preparing","Ready"],"current":2}
```

### `spinner`

A loading spinner.

  - `label`: Caption beside it.

```json
{"type":"spinner","label":"Loading menu"}
```

### `banner`

A full-width message strip across the top of a page or section. Runs edge to edge.

  - `text`: The message.
  - `kind`: Changes the icon (default info). (`info`, `success`, `warning`, `error`)
  - `action`: A link on the right, e.g. "Update".
  - `close`: An × to dismiss it.

```json
{"type":"banner","kind":"warning","text":"Main St is closing early today.","action":"See hours"}
```

### `empty-state`

What a screen shows when there's nothing yet: an icon, a heading, a line of text and a button.

  - `icon`: Icon name (see wf vocab icons).
  - `title`: Heading.
  - `text`: A line of help.
  - `button`: Button text.

```json
{"type":"empty-state","icon":"coffee","title":"No orders yet","text":"Your past orders will show up here.","button":"Start an order"}
```

### `skeleton`

Gray loading placeholders where content is about to appear.

  - `lines`: Text lines (default 3).
  - `avatar`: A round picture on the left.
  - `image`: A picture block on top.

```json
{"type":"skeleton","avatar":true,"lines":2}
```

## Overlays

Things that float over a screen: dialogs, sheets, drawers, menus, popovers and tooltips.

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

### `menu`

A dropdown menu panel. Items can show an icon, a shortcut, a check, a divider, or be dangerous or disabled.

  - `items`: Items: text, "-" for a divider, or { text, icon, shortcut, checked, danger, state, goes }.
  - `value`: The ticked item.

```json
{"type":"menu","items":[{"text":"Edit","icon":"edit"},{"text":"Duplicate","icon":"copy"},"-",{"text":"Delete","icon":"trash","danger":true}]}
```

### `drawer`

A side panel sliding over a dimmed screen (filters, details). Pinned right, full height. Pinned `right` by default.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: Panel title.
  - `side`: Which side (default right). (`right`, `left`)

```json
{"type":"drawer","title":"Filters","children":[{"type":"checkbox","text":"Open now","checked":true},{"type":"button","text":"Apply","variant":"primary"}]}
```

### `popover`

A small card that pops out from something, with an arrow pointing at it.

  - `children`: What's inside, in order.
  - `gap`: Space between children (px).
  - `pad`: Space inside the edges (px).
  - `align`: Cross-axis alignment of children that don't fill. (`start`, `center`, `end`, `stretch`)
  - `justify`: Main-axis distribution of leftover space. (`start`, `center`, `end`, `between`)
  - `title`: Title.
  - `arrow`: Which edge the arrow is on (default top). (`top`, `bottom`, `left`, `right`)

```json
{"type":"popover","title":"Extra shot","children":[{"type":"text","text":"Adds a bit more caffeine for $0.75."}]}
```

### `tooltip`

A small dark label with an arrow, explaining what something is.

  - `text`: The words.
  - `arrow`: Which edge the arrow is on (default bottom: it sits above the thing). (`bottom`, `top`, `left`, `right`)

```json
{"type":"tooltip","text":"Reorder your last drink"}
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

`menu`, `back`, `close`, `search`, `plus`, `minus`, `check`, `chevron-right`, `chevron-down`, `chevron-left`, `heart`, `star`, `cart`, `bag`, `user`, `users`, `home`, `bell`, `settings`, `share`, `more`, `map-pin`, `clock`, `calendar`, `camera`, `image`, `mail`, `phone`, `chat`, `filter`, `edit`, `trash`, `lock`, `info`, `alert`, `play`, `list`, `grid`, `download`, `upload`, `coffee`, `card`, `gift`, `bookmark`, `send`, `mic`, `refresh`, `logout`, `help`, `doc`, `folder`, `link`, `eye`, `sun`, `moon`, `arrow-up`, `arrow-down`, `arrow-left`, `arrow-right`, `chevron-up`, `external`, `expand`, `collapse`, `undo`, `redo`, `sort`, `drag`, `sidebar`, `zoom-in`, `zoom-out`, `copy`, `save`, `print`, `attach`, `pin`, `flag`, `tag`, `archive`, `inbox`, `reply`, `scan`, `qr`, `barcode`, `scissors`, `crop`, `layers`, `sliders`, `pause`, `stop`, `skip-next`, `skip-back`, `volume`, `mute`, `music`, `headphones`, `video`, `tv`, `monitor`, `laptop`, `smartphone`, `watch`, `keyboard`, `wifi`, `bluetooth`, `battery`, `signal`, `map`, `navigation`, `compass`, `globe`, `car`, `bus`, `bike`, `walk`, `plane`, `train`, `truck`, `store`, `building`, `briefcase`, `school`, `wallet`, `dollar`, `receipt`, `percent`, `ticket`, `thumbs-up`, `thumbs-down`, `chart`, `pie-chart`, `trending`, `database`, `code`, `terminal`, `cloud`, `heart-pulse`, `pill`, `medical`, `utensils`, `cake`, `paw`, `dumbbell`, `leaf`, `bolt`, `drop`, `umbrella`, `thermometer`, `fire`, `user-plus`, `user-check`, `id-card`, `smile`, `frown`, `shield`, `key`, `unlock`, `eye-off`, `fingerprint`, `accessibility`, `timer`, `hourglass`, `alarm`, `history`, `sparkle`, `rocket`, `idea`, `target`, `puzzle`, `award`, `trophy`, `palette`, `brush`, `at-sign`, `hash`, `language`

## Devices

`phone` (390×844), `phone-small` (375×667), `phone-large` (430×932), `tablet` (820×1180), `tablet-landscape` (1180×820), `laptop` (1280×800), `desktop` (1440×900), `watch` (198×242), or `{ "w": …, "h": … }`.

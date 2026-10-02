/**
 * The component catalog: the single source of truth for the validator, the JSON Schema, the skill docs
 * and the editor's palette and inspector. A closed list on purpose, so agents can't invent things that
 * don't render. Anything missing becomes a labeled `sketch` box.
 */

export type PropKind =
  | { kind: "text" }
  | { kind: "number"; min?: number; max?: number }
  | { kind: "bool" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "items" }
  | { kind: "icon" }
  | { kind: "screen" }
  | { kind: "rows" }
  | { kind: "strings" }
  | { kind: "point" }
  | { kind: "children" };

export interface PropDef { type: PropKind; doc: string }

export type Category = "layout" | "text" | "controls" | "navigation" | "content" | "feedback" | "sketch";
export const CATEGORIES: { id: Category; label: string; doc: string }[] = [
  { id: "layout", label: "Layout", doc: "Containers that stack things down or across." },
  { id: "text", label: "Text", doc: "Titles, paragraphs and small labels." },
  { id: "controls", label: "Controls", doc: "Buttons and form inputs." },
  { id: "navigation", label: "Navigation", doc: "Bars, tabs and menus. Items can link with goes." },
  { id: "content", label: "Content", doc: "Images, lists, tables, charts and other placeholders." },
  { id: "feedback", label: "Feedback", doc: "Alerts, toasts, progress and overlays." },
  { id: "sketch", label: "Sketch", doc: "A labeled box for anything not in the catalog." },
];

export const PINS = ["top", "bottom", "left", "right", "center", "top-left", "top-right", "bottom-left", "bottom-right"] as const;
export type Pin = (typeof PINS)[number];
export const DEVICES = {
  phone: { w: 390, h: 844, label: "Phone" },
  "phone-small": { w: 375, h: 667, label: "Small phone" },
  "phone-large": { w: 430, h: 932, label: "Large phone" },
  tablet: { w: 820, h: 1180, label: "Tablet" },
  "tablet-landscape": { w: 1180, h: 820, label: "Tablet, landscape" },
  laptop: { w: 1280, h: 800, label: "Laptop" },
  desktop: { w: 1440, h: 900, label: "Desktop" },
  watch: { w: 198, h: 242, label: "Watch" },
} as const;
export type DeviceName = keyof typeof DEVICES;
/** The body drawn around a screen (same marker style as Storyboard Kit's devices). */
export const CHROMES = ["phone", "tablet", "watch", "laptop", "desktop", "plain", "none"] as const;
export type Chrome = (typeof CHROMES)[number];

export const ICONS = [
  "menu", "back", "close", "search", "plus", "minus", "check", "chevron-right", "chevron-down", "chevron-left", "heart", "star",
  "cart", "bag", "user", "users", "home", "bell", "settings", "share", "more", "map-pin", "clock", "calendar", "camera", "image",
  "mail", "phone", "chat", "filter", "edit", "trash", "lock", "info", "alert", "play", "list", "grid", "download", "upload",
  "coffee", "card", "gift", "bookmark", "send", "mic", "refresh", "logout", "help", "doc", "folder", "link", "eye", "sun", "moon",
] as const;
export type IconName = (typeof ICONS)[number];

const t = (doc: string): PropDef => ({ type: { kind: "text" }, doc });
const n = (doc: string, min?: number, max?: number): PropDef => ({ type: { kind: "number", min, max }, doc });
const b = (doc: string): PropDef => ({ type: { kind: "bool" }, doc });
const e = (values: readonly string[], doc: string): PropDef => ({ type: { kind: "enum", values }, doc });
const items = (doc: string): PropDef => ({ type: { kind: "items" }, doc });
const icon = (doc = "Icon name (see wf vocab icons)."): PropDef => ({ type: { kind: "icon" }, doc });
const strings = (doc: string): PropDef => ({ type: { kind: "strings" }, doc });

/** Props every node accepts. */
export const COMMON: Record<string, PropDef> = {
  type: t("What it is (from the catalog)."),
  use: t("Use a piece from the file's `shared` section instead of a type, e.g. \"use\": \"tabs\". Other props override it."),
  id: t("A name for this element, so links, nudges and agent pointers can find it."),
  goes: { type: { kind: "screen" }, doc: "Tapping it goes to this screen id (or \"back\")." },
  pin: e(PINS, "Float it over the screen instead of stacking it (\"bottom\", \"top-right\", ...)."),
  width: { type: { kind: "text" }, doc: "\"fill\", \"hug\", or a number of px." },
  height: n("Height in px (most things size themselves).", 4),
  grow: n("Take a share of leftover space along the stack (a spacer grows by default).", 0),
  note: t("A designer's note. Shown as a numbered sticky beside the screen on the canvas, never on the screen itself."),
  at: { type: { kind: "point" }, doc: "Place it freely at [x, y] on the screen, outside the stacks (top-level elements only). The editor writes this when a designer drags something in; agents should prefer stacks." },
};

const CONTAINER: Record<string, PropDef> = {
  children: { type: { kind: "children" }, doc: "What's inside, in order." },
  gap: n("Space between children (px).", 0),
  pad: n("Space inside the edges (px).", 0),
  align: e(["start", "center", "end", "stretch"], "Cross-axis alignment of children that don't fill."),
  justify: e(["start", "center", "end", "between"], "Main-axis distribution of leftover space."),
};

export interface ComponentDef {
  type: string;
  category: Category;
  doc: string;
  props: Record<string, PropDef>;
  container?: boolean;
  /** Width inside a stack when the node doesn't say. */
  defaultWidth: "fill" | "hug";
  /** Ignores the screen's side padding (bars that run edge to edge). */
  bleed?: boolean;
  defaultPin?: Pin;
  /** Props whose items can link with `goes`. */
  linkItems?: boolean;
  example: Record<string, unknown>;
}

const defs: ComponentDef[] = [
  // layout
  { type: "stack", category: "layout", container: true, defaultWidth: "fill", doc: "Stacks children down (default) or across.",
    props: { ...CONTAINER, dir: e(["down", "right"], "Stack direction.") },
    example: { type: "stack", dir: "down", gap: 8, children: [{ type: "text", text: "..." }] } },
  { type: "row", category: "layout", container: true, defaultWidth: "fill", doc: "Children side by side, centered vertically. Fill-width children share the space.",
    props: { ...CONTAINER, wrap: b("Wrap onto more lines when it runs out of room.") },
    example: { type: "row", gap: 8, children: [{ type: "button", text: "Cancel" }, { type: "button", text: "Save", variant: "primary" }] } },
  { type: "card", category: "layout", container: true, defaultWidth: "fill", doc: "A bordered box that stacks its children down.",
    props: { ...CONTAINER, flat: b("No border, just a soft fill.") },
    example: { type: "card", children: [{ type: "heading", text: "Oat latte" }, { type: "text", text: "12 oz, extra shot" }] } },
  { type: "section", category: "layout", container: true, defaultWidth: "fill", doc: "A titled group: a small heading, then its children.",
    props: { ...CONTAINER, title: t("The section heading."), action: t("Small link on the right, e.g. \"See all\".") },
    example: { type: "section", title: "Favorites", action: "See all", children: [{ type: "list", items: ["Oat latte", "Cold brew"] }] } },
  { type: "grid", category: "layout", container: true, defaultWidth: "fill", doc: "Children in equal columns.",
    props: { ...CONTAINER, columns: n("Number of columns (default 2).", 1, 8) },
    example: { type: "grid", columns: 2, children: [{ type: "image", label: "Croissant" }, { type: "image", label: "Muffin" }] } },
  { type: "sheet", category: "feedback", container: true, defaultWidth: "fill", bleed: true, defaultPin: "bottom", doc: "A bottom sheet over a dimmed screen.",
    props: { ...CONTAINER, title: t("Sheet title.") },
    example: { type: "sheet", title: "Pickup time", children: [{ type: "radio", items: ["As soon as it's ready", "Schedule for later"], value: "As soon as it's ready" }, { type: "button", text: "Done", variant: "primary" }] } },
  { type: "dialog", category: "feedback", container: true, defaultWidth: "fill", defaultPin: "center", doc: "A centered dialog over a dimmed screen.",
    props: { ...CONTAINER, title: t("Dialog title.") },
    example: { type: "dialog", title: "Cancel order?", children: [{ type: "text", text: "Your barista may have started it." }, { type: "row", children: [{ type: "button", text: "Keep it" }, { type: "button", text: "Cancel", variant: "primary" }] }] } },

  // text
  { type: "title", category: "text", defaultWidth: "fill", doc: "The big marker title of a screen.",
    props: { text: t("The words."), align: e(["start", "center", "end"], "Text alignment.") }, example: { type: "title", text: "Corner Coffee" } },
  { type: "heading", category: "text", defaultWidth: "fill", doc: "A smaller marker heading.",
    props: { text: t("The words."), align: e(["start", "center", "end"], "Text alignment.") }, example: { type: "heading", text: "Your order" } },
  { type: "text", category: "text", defaultWidth: "fill", doc: "A paragraph. Leave `text` out and set `lines` for placeholder squiggles.",
    props: { text: t("The words."), lines: n("Placeholder lines when there's no text.", 1, 30), size: e(["sm", "md", "lg"], "Text size."), muted: b("Grey instead of ink."), align: e(["start", "center", "end"], "Text alignment.") },
    example: { type: "text", text: "We'll text you when it's ready." } },
  { type: "label", category: "text", defaultWidth: "hug", doc: "Small gray text: captions, meta, helper text.",
    props: { text: t("The words."), align: e(["start", "center", "end"], "Text alignment.") }, example: { type: "label", text: "Order #214 · pickup counter" } },
  { type: "link", category: "text", defaultWidth: "hug", doc: "Underlined text that goes somewhere.",
    props: { text: t("The words.") }, example: { type: "link", text: "Forgot password?", goes: "reset" } },
  { type: "badge", category: "text", defaultWidth: "hug", doc: "A small pill: counts, statuses, tags.",
    props: { text: t("The words."), filled: b("Dark fill.") }, example: { type: "badge", text: "New" } },

  // controls
  { type: "button", category: "controls", defaultWidth: "fill", doc: "A button. Mark the one main action on a screen `primary`.",
    props: { text: t("The words."), variant: e(["primary", "secondary", "outline", "text"], "primary = the main action (dark). Default secondary."), icon: icon(), size: e(["sm", "md", "lg"], "Size.") },
    example: { type: "button", text: "Pay", variant: "primary", goes: "status" } },
  { type: "icon-button", category: "controls", defaultWidth: "hug", doc: "A tappable icon.",
    props: { icon: icon(), variant: e(["plain", "outline", "filled"], "Look."), badge: t("Small count dot, e.g. \"2\".") },
    example: { type: "icon-button", icon: "cart", badge: "1", goes: "cart" } },
  { type: "input", category: "controls", defaultWidth: "fill", doc: "A text field with an optional label above.",
    props: { label: t("Label above."), hint: t("Placeholder."), value: t("Typed value."), icon: icon("Leading icon."), error: t("Error text below.") },
    example: { type: "input", label: "Name for the order", hint: "e.g. Marcus" } },
  { type: "textarea", category: "controls", defaultWidth: "fill", doc: "A multi-line text field.",
    props: { label: t("Label above."), hint: t("Placeholder."), value: t("Typed value."), rows: n("Visible rows (default 3).", 1, 20) },
    example: { type: "textarea", label: "Notes for the barista", hint: "Extra hot, please" } },
  { type: "search", category: "controls", defaultWidth: "fill", doc: "A rounded search field.",
    props: { hint: t("Placeholder."), value: t("Typed value.") }, example: { type: "search", hint: "Search drinks" } },
  { type: "select", category: "controls", defaultWidth: "fill", doc: "A dropdown field.",
    props: { label: t("Label above."), value: t("Chosen value."), hint: t("Placeholder.") }, example: { type: "select", label: "Size", value: "12 oz" } },
  { type: "checkbox", category: "controls", defaultWidth: "fill", doc: "A checkbox with text.",
    props: { text: t("The words."), checked: b("Ticked.") }, example: { type: "checkbox", text: "Save this order", checked: true } },
  { type: "radio", category: "controls", defaultWidth: "fill", doc: "A group of radio options.",
    props: { items: strings("The options."), value: t("The chosen option.") }, example: { type: "radio", items: ["Pickup", "Delivery"], value: "Pickup" } },
  { type: "toggle", category: "controls", defaultWidth: "fill", doc: "A switch with text on the left.",
    props: { text: t("The words."), on: b("Switched on.") }, example: { type: "toggle", text: "Text me when it's ready", on: true } },
  { type: "slider", category: "controls", defaultWidth: "fill", doc: "A slider.",
    props: { label: t("Label above."), value: n("0 to 1.", 0, 1) }, example: { type: "slider", label: "Sweetness", value: 0.3 } },
  { type: "stepper", category: "controls", defaultWidth: "hug", doc: "A − n + quantity control.",
    props: { value: n("The number.") }, example: { type: "stepper", value: 1 } },
  { type: "segmented", category: "controls", defaultWidth: "fill", linkItems: true, doc: "A segmented control.",
    props: { items: items("The segments."), active: t("The selected one.") }, example: { type: "segmented", items: ["Hot", "Iced"], active: "Hot" } },
  { type: "chips", category: "controls", defaultWidth: "fill", linkItems: true, doc: "A wrapping row of pills (filters, tags).",
    props: { items: items("The chips."), active: { type: { kind: "strings" }, doc: "The selected ones." } }, example: { type: "chips", items: ["All", "Coffee", "Tea", "Pastries"], active: ["All"] } },

  // navigation
  { type: "navbar", category: "navigation", defaultWidth: "fill", bleed: true, doc: "The bar at the top of an app screen.",
    props: { title: t("Title in the middle."), back: b("Show a back arrow (goes back)."), actions: { type: { kind: "items" }, doc: "Icons on the right: icon names, or { icon, goes }." }, large: b("Big title on its own line, left-aligned.") },
    example: { type: "navbar", title: "Your order", back: true } },
  { type: "tabbar", category: "navigation", defaultWidth: "fill", bleed: true, defaultPin: "bottom", linkItems: true, doc: "App tabs pinned to the bottom.",
    props: { items: items("Tabs: text, or { text, icon, goes }. Icons are guessed from the words."), active: t("The current tab.") },
    example: { type: "tabbar", items: ["Home", "Order", "Rewards", "Account"], active: "Order" } },
  { type: "tabs", category: "navigation", defaultWidth: "fill", linkItems: true, doc: "Underlined tabs inside a screen.",
    props: { items: items("Tabs: text, or { text, goes }."), active: t("The current tab.") }, example: { type: "tabs", items: ["Menu", "Favorites", "Past orders"], active: "Menu" } },
  { type: "breadcrumbs", category: "navigation", defaultWidth: "fill", linkItems: true, doc: "A › trail › of places.",
    props: { items: items("The trail.") }, example: { type: "breadcrumbs", items: ["Account", "Orders", "#214"] } },
  { type: "pagination", category: "navigation", defaultWidth: "hug", doc: "‹ 1 2 3 › page buttons.",
    props: { pages: n("How many pages (default 5).", 1, 20), current: n("Current page (default 1).", 1) }, example: { type: "pagination", pages: 5, current: 2 } },
  { type: "dots", category: "navigation", defaultWidth: "hug", doc: "Carousel page dots.",
    props: { count: n("How many (default 3).", 1, 12), active: n("Which is current, from 1.", 1) }, example: { type: "dots", count: 4, active: 1 } },
  { type: "sidebar", category: "navigation", defaultWidth: "hug", linkItems: true, doc: "A side menu for desktop and tablet. Put it first in a screen with \"dir\": \"right\".",
    props: { title: t("Brand or app name at the top."), items: items("Menu items: text, or { text, icon, goes }."), active: t("The current item.") },
    example: { type: "sidebar", title: "Corner Coffee", items: ["Orders", "Menu", "Stores", "Settings"], active: "Orders" } },
  { type: "topnav", category: "navigation", defaultWidth: "fill", bleed: true, linkItems: true, doc: "A website's top bar: brand left, links right.",
    props: { title: t("Brand."), items: items("Links: text, or { text, goes }."), active: t("The current one."), button: t("A button on the far right, e.g. \"Order now\".") },
    example: { type: "topnav", title: "Corner Coffee", items: ["Menu", "Locations", "Rewards"], button: "Order now" } },

  // content
  { type: "image", category: "content", defaultWidth: "fill", doc: "An image placeholder (a crossed box). Give `src` to use a real picture; it's sketchified in grays (`\"sketch\": false` shows it as it is).",
    props: { label: t("What the picture is."), aspect: t("Shape when there's no height: \"16:9\", \"1:1\", \"4:3\"."), src: t("Optional image file path, sketchified."), sketch: b("false shows the picture as it is, instead of sketchified in grays."), round: b("Round corners a lot (or a circle when square).") },
    example: { type: "image", label: "Latte art photo", aspect: "16:9" } },
  { type: "avatar", category: "content", defaultWidth: "hug", doc: "A round profile picture or initials.",
    props: { text: t("Initials (otherwise a head shape)."), size: n("Diameter (default 40).", 16, 200) }, example: { type: "avatar", text: "MJ" } },
  { type: "icon", category: "content", defaultWidth: "hug", doc: "A single icon.",
    props: { icon: icon(), size: n("Size (default 24).", 12, 200) }, example: { type: "icon", icon: "coffee", size: 32 } },
  { type: "list", category: "content", defaultWidth: "fill", linkItems: true, doc: "Rows of things. Items can be text or { title, subtitle, meta, icon, image, goes }.",
    props: { items: items("The rows."), chevrons: b("Show › on every row."), dividers: b("Lines between rows (default true)."), cards: b("Each row as its own card.") },
    example: { type: "list", items: [{ title: "Oat latte", subtitle: "12 oz · extra shot", meta: "$5.25", goes: "drink" }, { title: "Cold brew", meta: "$4.50" }] } },
  { type: "table", category: "content", defaultWidth: "fill", doc: "A data table.",
    props: { columns: strings("Column headings."), rows: { type: { kind: "rows" }, doc: "Rows: arrays of cell text." } },
    example: { type: "table", columns: ["Order", "Store", "Total"], rows: [["#214", "Main St", "$5.25"], ["#198", "Main St", "$9.80"]] } },
  { type: "chart", category: "content", defaultWidth: "fill", doc: "A chart placeholder.",
    props: { kind: e(["bar", "line", "pie", "donut"], "Chart type (default bar)."), label: t("Caption.") }, example: { type: "chart", kind: "line", label: "Orders this week" } },
  { type: "map", category: "content", defaultWidth: "fill", doc: "A map placeholder with a pin.",
    props: { label: t("Caption.") }, example: { type: "map", label: "Corner Coffee, Main St" } },
  { type: "video", category: "content", defaultWidth: "fill", doc: "A video placeholder (16:9 with a play button).",
    props: { label: t("Caption.") }, example: { type: "video", label: "How we roast" } },
  { type: "rating", category: "content", defaultWidth: "hug", doc: "Stars out of five.",
    props: { value: n("0 to 5.", 0, 5) }, example: { type: "rating", value: 4 } },
  { type: "divider", category: "content", defaultWidth: "fill", doc: "A horizontal line, optionally with words in the middle.",
    props: { text: t("Words in the middle, e.g. \"or\".") }, example: { type: "divider" } },
  { type: "spacer", category: "layout", defaultWidth: "fill", doc: "Empty space. Without a height it grows, pushing what follows to the bottom.",
    props: {}, example: { type: "spacer" } },
  { type: "keyboard", category: "content", defaultWidth: "fill", bleed: true, defaultPin: "bottom", doc: "A phone keyboard, pinned to the bottom.",
    props: {}, example: { type: "keyboard" } },

  // feedback
  { type: "alert", category: "feedback", defaultWidth: "fill", doc: "An inline message box.",
    props: { text: t("The message."), kind: e(["info", "success", "warning", "error"], "Changes the icon (default info)."), title: t("Bold first line.") },
    example: { type: "alert", kind: "warning", text: "Running about 5 minutes behind." } },
  { type: "toast", category: "feedback", defaultWidth: "hug", defaultPin: "bottom", doc: "A short dark message floating near the bottom.",
    props: { text: t("The message."), action: t("A link on the right, e.g. \"Undo\".") }, example: { type: "toast", text: "Added to your order", action: "Undo" } },
  { type: "progress", category: "feedback", defaultWidth: "fill", doc: "A progress bar.",
    props: { value: n("0 to 1 (default 0.4).", 0, 1), label: t("Caption above.") }, example: { type: "progress", value: 0.4, label: "Preparing · about 4 min" } },
  { type: "steps", category: "feedback", defaultWidth: "fill", doc: "Numbered steps with the current one marked (checkout, order tracking).",
    props: { items: strings("Step names."), current: n("Current step, from 1.", 1) }, example: { type: "steps", items: ["Ordered", "Preparing", "Ready"], current: 2 } },
  { type: "spinner", category: "feedback", defaultWidth: "hug", doc: "A loading spinner.",
    props: { label: t("Caption beside it.") }, example: { type: "spinner", label: "Loading menu" } },

  // sketch
  { type: "sketch", category: "sketch", defaultWidth: "fill", doc: "A dashed, labeled box for anything the catalog doesn't have. Say what it is.",
    props: { label: t("What goes here, e.g. \"pastry carousel\".") }, example: { type: "sketch", label: "pastry carousel", height: 90 } },
];

export const COMPONENTS: Record<string, ComponentDef> = Object.fromEntries(defs.map((d) => [d.type, d]));
export const TYPES = defs.map((d) => d.type);

/** Every prop a type accepts (its own plus the common ones). */
export const propsOf = (type: string): Record<string, PropDef> => ({ ...COMMON, ...(COMPONENTS[type]?.props ?? {}) });

/** Icons guessed from tab and menu words, so agents rarely need to say. */
const GUESS: [RegExp, IconName][] = [
  [/home|feed|today/i, "home"], [/search|explore|find|discover/i, "search"], [/account|profile|me\b|you\b/i, "user"],
  [/cart|basket|bag/i, "cart"], [/order|coffee|drink|menu/i, "coffee"], [/reward|gift|offer|deal/i, "gift"],
  [/setting|prefer/i, "settings"], [/favou?rite|saved|like/i, "heart"], [/message|chat|inbox/i, "chat"],
  [/notif|alert|activity/i, "bell"], [/store|location|map|near/i, "map-pin"], [/calendar|schedule|book/i, "calendar"],
  [/history|recent|past/i, "clock"], [/pay|wallet|card|billing/i, "card"], [/help|support/i, "help"], [/team|people|friends/i, "users"],
  [/photo|gallery|camera/i, "camera"], [/doc|file|report/i, "doc"], [/list|task/i, "list"], [/dashboard|overview/i, "grid"],
];
export function guessIcon(text: string): IconName {
  return GUESS.find(([re]) => re.test(text))?.[1] ?? "grid";
}

/** What the editor's palette inserts: neutral placeholder content (the examples above are for agents and docs). */
export const STARTERS: Record<string, Record<string, unknown>> = {
  stack: { type: "stack", children: [{ type: "text", lines: 2 }] },
  row: { type: "row", children: [{ type: "button", text: "Button" }, { type: "button", text: "Button", variant: "primary" }] },
  card: { type: "card", children: [{ type: "heading", text: "Heading" }, { type: "text", lines: 2 }] },
  section: { type: "section", title: "Section", children: [{ type: "text", lines: 2 }] },
  grid: { type: "grid", columns: 2, children: [{ type: "image", aspect: "1:1" }, { type: "image", aspect: "1:1" }] },
  sheet: { type: "sheet", title: "Title", children: [{ type: "text", lines: 2 }, { type: "button", text: "Done", variant: "primary" }] },
  dialog: { type: "dialog", title: "Title", children: [{ type: "text", text: "Are you sure?" }, { type: "row", children: [{ type: "button", text: "Cancel" }, { type: "button", text: "OK", variant: "primary" }] }] },
  title: { type: "title", text: "Title" },
  heading: { type: "heading", text: "Heading" },
  text: { type: "text", lines: 3 },
  label: { type: "label", text: "Label" },
  link: { type: "link", text: "Link" },
  badge: { type: "badge", text: "Badge" },
  button: { type: "button", text: "Button" },
  "icon-button": { type: "icon-button", icon: "plus" },
  input: { type: "input", label: "Label", hint: "Placeholder" },
  textarea: { type: "textarea", label: "Label", hint: "Placeholder" },
  search: { type: "search", hint: "Search" },
  select: { type: "select", label: "Label", value: "Choose one" },
  checkbox: { type: "checkbox", text: "Checkbox" },
  radio: { type: "radio", items: ["Option one", "Option two"], value: "Option one" },
  toggle: { type: "toggle", text: "Toggle", on: true },
  slider: { type: "slider", value: 0.5 },
  stepper: { type: "stepper", value: 1 },
  segmented: { type: "segmented", items: ["One", "Two", "Three"], active: "One" },
  chips: { type: "chips", items: ["One", "Two", "Three"], active: ["One"] },
  navbar: { type: "navbar", title: "Title", back: true },
  tabbar: { type: "tabbar", items: ["Home", "Search", "Account"], active: "Home" },
  tabs: { type: "tabs", items: ["One", "Two", "Three"], active: "One" },
  breadcrumbs: { type: "breadcrumbs", items: ["Home", "Section", "Page"] },
  pagination: { type: "pagination", pages: 3, current: 1 },
  dots: { type: "dots", count: 3, active: 1 },
  sidebar: { type: "sidebar", title: "App", items: ["Home", "Inbox", "Settings"], active: "Home" },
  topnav: { type: "topnav", title: "Brand", items: ["One", "Two", "Three"], button: "Sign up" },
  image: { type: "image", aspect: "16:9" },
  avatar: { type: "avatar" },
  icon: { type: "icon", icon: "star" },
  list: { type: "list", items: [{ title: "List item", subtitle: "Subtitle" }, { title: "List item", subtitle: "Subtitle" }, { title: "List item", subtitle: "Subtitle" }] },
  table: { type: "table", columns: ["Name", "Status", "Date"], rows: [["Item", "Active", "Today"], ["Item", "Paused", "Yesterday"]] },
  chart: { type: "chart", kind: "bar" },
  map: { type: "map" },
  video: { type: "video" },
  rating: { type: "rating", value: 4 },
  divider: { type: "divider" },
  spacer: { type: "spacer", height: 24 },
  keyboard: { type: "keyboard" },
  alert: { type: "alert", kind: "info", text: "A message for the person." },
  toast: { type: "toast", text: "Saved", action: "Undo" },
  progress: { type: "progress", value: 0.5 },
  steps: { type: "steps", items: ["One", "Two", "Three"], current: 2 },
  spinner: { type: "spinner", label: "Loading" },
  sketch: { type: "sketch", height: 120 },
};
export const starterOf = (type: string): Record<string, unknown> => structuredClone(STARTERS[type] ?? COMPONENTS[type]?.example ?? { type });

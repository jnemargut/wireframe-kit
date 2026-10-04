/**
 * The component catalog: the single source of truth for the validator, the JSON Schema, the skill docs
 * and the editor's palette and inspector. A closed list on purpose, so agents can't invent things that
 * don't render. Anything missing becomes a labeled `sketch` box.
 */
import { CHART_KINDS } from "../vendor/sketch/chart";

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
  | { kind: "crop" }
  | { kind: "chartdata" }
  | { kind: "children" };

export interface PropDef { type: PropKind; doc: string }

export type Category = "layout" | "text" | "controls" | "navigation" | "content" | "feedback" | "overlays" | "sketch";
export const CATEGORIES: { id: Category; label: string; doc: string }[] = [
  { id: "layout", label: "Layout", doc: "Containers that stack things down or across." },
  { id: "text", label: "Text", doc: "Titles, paragraphs and small labels." },
  { id: "controls", label: "Controls", doc: "Buttons and form inputs." },
  { id: "navigation", label: "Navigation", doc: "Bars, tabs and menus. Items can link with goes." },
  { id: "content", label: "Content", doc: "Images, lists, tables, charts and other placeholders." },
  { id: "feedback", label: "Feedback", doc: "Alerts, banners, toasts, progress, loading and empty states." },
  { id: "overlays", label: "Overlays", doc: "Things that float over a screen: dialogs, sheets, drawers, menus, popovers and tooltips." },
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
  "arrow-up", "arrow-down", "arrow-left", "arrow-right", "chevron-up", "external", "expand", "collapse", "undo",
  "redo", "sort", "drag", "sidebar", "zoom-in", "zoom-out", "copy", "save", "print", "attach", "pin", "flag", "tag",
  "archive", "inbox", "reply", "scan", "qr", "barcode", "scissors", "crop", "layers", "sliders", "pause", "stop",
  "skip-next", "skip-back", "volume", "mute", "music", "headphones", "video", "tv", "monitor", "laptop",
  "smartphone", "watch", "keyboard", "wifi", "bluetooth", "battery", "signal", "map", "navigation", "compass",
  "globe", "car", "bus", "bike", "walk", "plane", "train", "truck", "store", "building", "briefcase", "school",
  "wallet", "dollar", "receipt", "percent", "ticket", "thumbs-up", "thumbs-down", "chart", "pie-chart", "trending",
  "database", "code", "terminal", "cloud", "heart-pulse", "pill", "medical", "utensils", "cake", "paw", "dumbbell",
  "leaf", "bolt", "drop", "umbrella", "thermometer", "fire", "user-plus", "user-check", "id-card", "smile", "frown",
  "shield", "key", "unlock", "eye-off", "fingerprint", "accessibility", "timer", "hourglass", "alarm", "history",
  "sparkle", "rocket", "idea", "target", "puzzle", "award", "trophy", "palette", "brush", "at-sign", "hash",
  "language",
] as const;
export type IconName = (typeof ICONS)[number];

const t = (doc: string): PropDef => ({ type: { kind: "text" }, doc });
const n = (doc: string, min?: number, max?: number): PropDef => ({ type: { kind: "number", min, max }, doc });
const b = (doc: string): PropDef => ({ type: { kind: "bool" }, doc });
const e = (values: readonly string[], doc: string): PropDef => ({ type: { kind: "enum", values }, doc });
const items = (doc: string): PropDef => ({ type: { kind: "items" }, doc });
const icon = (doc = "Icon name (see wf vocab icons)."): PropDef => ({ type: { kind: "icon" }, doc });
const strings = (doc: string): PropDef => ({ type: { kind: "strings" }, doc });

/** Interaction states a component can be drawn in, so one screen can show hover, focus, disabled, an open dropdown... */
export const STATES = ["normal", "hover", "pressed", "focus", "disabled", "error", "loading", "open", "selected"] as const;
export type State = (typeof STATES)[number];
const STATE_DOC: Record<string, string> = {
  hover: "hover (the pointer is over it)", pressed: "pressed (mid-click or tap)", focus: "focus (keyboard focus ring)", disabled: "disabled (grayed out)",
  error: "error (red-flag border)", loading: "loading (a spinner in place of its content)", open: "open (its dropdown, menu or calendar showing)", selected: "selected (outlined)",
};
const st = (...vals: State[]): PropDef => e(["normal", ...vals], `Draw it in a state: ${vals.map((v) => STATE_DOC[v]).join(", ")}. Default normal.`);
const BUTTON_STATES = st("hover", "pressed", "focus", "disabled", "loading");
const FIELD_STATES = st("hover", "focus", "disabled", "error");
const CHOICE_STATES = st("hover", "focus", "disabled");

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
  locked: { type: { kind: "bool" }, doc: "Stays put until it's unlocked (editor-owned: Shift+Cmd+L)." },
  group: { type: { kind: "text" }, doc: "Moves and selects with the others in its group (editor-owned: Cmd+G)." },
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
    props: { ...CONTAINER, flat: b("No border, just a soft fill."), state: st("hover", "selected", "disabled") },
    example: { type: "card", children: [{ type: "heading", text: "Oat latte" }, { type: "text", text: "12 oz, extra shot" }] } },
  { type: "section", category: "layout", container: true, defaultWidth: "fill", doc: "A titled group: a small heading, then its children.",
    props: { ...CONTAINER, title: t("The section heading."), action: t("Small link on the right, e.g. \"See all\".") },
    example: { type: "section", title: "Favorites", action: "See all", children: [{ type: "list", items: ["Oat latte", "Cold brew"] }] } },
  { type: "grid", category: "layout", container: true, defaultWidth: "fill", doc: "Children in equal columns.",
    props: { ...CONTAINER, columns: n("Number of columns (default 2).", 1, 8) },
    example: { type: "grid", columns: 2, children: [{ type: "image", label: "Croissant" }, { type: "image", label: "Muffin" }] } },
  { type: "sheet", category: "overlays", container: true, defaultWidth: "fill", bleed: true, defaultPin: "bottom", doc: "A bottom sheet over a dimmed screen.",
    props: { ...CONTAINER, title: t("Sheet title.") },
    example: { type: "sheet", title: "Pickup time", children: [{ type: "radio", items: ["As soon as it's ready", "Schedule for later"], value: "As soon as it's ready" }, { type: "button", text: "Done", variant: "primary" }] } },
  { type: "dialog", category: "overlays", container: true, defaultWidth: "fill", defaultPin: "center", doc: "A centered dialog over a dimmed screen.",
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
    props: { text: t("The words."), state: CHOICE_STATES }, example: { type: "link", text: "Forgot password?", goes: "reset" } },
  { type: "badge", category: "text", defaultWidth: "hug", doc: "A small pill: counts, statuses, tags.",
    props: { text: t("The words."), filled: b("Dark fill.") }, example: { type: "badge", text: "New" } },

  // controls
  { type: "button", category: "controls", defaultWidth: "fill", doc: "A button. Mark the one main action on a screen `primary`.",
    props: { text: t("The words."), variant: e(["primary", "secondary", "outline", "text", "danger"], "primary = the main action (dark). danger = destructive. Default secondary."), icon: icon(), size: e(["sm", "md", "lg"], "Size."), state: BUTTON_STATES },
    example: { type: "button", text: "Pay", variant: "primary", goes: "status" } },
  { type: "icon-button", category: "controls", defaultWidth: "hug", doc: "A tappable icon.",
    props: { icon: icon(), variant: e(["plain", "outline", "filled"], "Look."), badge: t("Small count dot, e.g. \"2\"."), state: BUTTON_STATES },
    example: { type: "icon-button", icon: "cart", badge: "1", goes: "cart" } },
  { type: "input", category: "controls", defaultWidth: "fill", doc: "A text field with an optional label above.",
    props: { label: t("Label above."), hint: t("Placeholder."), value: t("Typed value."), icon: icon("Leading icon."), error: t("Error text below."), help: t("Helper text below."), required: b("Mark the label with *."), state: FIELD_STATES },
    example: { type: "input", label: "Name for the order", hint: "e.g. Marcus" } },
  { type: "textarea", category: "controls", defaultWidth: "fill", doc: "A multi-line text field.",
    props: { label: t("Label above."), hint: t("Placeholder."), value: t("Typed value."), rows: n("Visible rows (default 3).", 1, 20), error: t("Error text below."), help: t("Helper text below."), required: b("Mark the label with *."), state: FIELD_STATES },
    example: { type: "textarea", label: "Notes for the barista", hint: "Extra hot, please" } },
  { type: "search", category: "controls", defaultWidth: "fill", doc: "A rounded search field.",
    props: { hint: t("Placeholder."), value: t("Typed value."), items: items("Suggestions shown when it's open (state \"open\")."), state: st("hover", "focus", "disabled", "open") }, example: { type: "search", hint: "Search drinks" } },
  { type: "select", category: "controls", defaultWidth: "fill", doc: "A dropdown field. Give `items` and set `state: \"open\"` to show the list dropped down (the chosen value is ticked).",
    props: { label: t("Label above."), value: t("Chosen value."), hint: t("Placeholder."), items: items("The options (shown when open). Items can be { text, icon, state }."), error: t("Error text below."), help: t("Helper text below."), required: b("Mark the label with *."), state: st("hover", "focus", "disabled", "error", "open") },
    example: { type: "select", label: "Size", value: "12 oz", items: ["8 oz", "12 oz", "16 oz"] } },
  { type: "checkbox", category: "controls", defaultWidth: "fill", doc: "A checkbox with text.",
    props: { text: t("The words."), checked: b("Ticked."), mixed: b("Partly ticked (a dash): some of a group is chosen."), state: st("hover", "focus", "disabled", "error") }, example: { type: "checkbox", text: "Save this order", checked: true } },
  { type: "radio", category: "controls", defaultWidth: "fill", doc: "A group of radio options.",
    props: { items: strings("The options."), value: t("The chosen option."), dir: e(["down", "right"], "Stack the options down (default) or across."), state: CHOICE_STATES }, example: { type: "radio", items: ["Pickup", "Delivery"], value: "Pickup" } },
  { type: "toggle", category: "controls", defaultWidth: "fill", doc: "A switch with text on the left.",
    props: { text: t("The words."), on: b("Switched on."), state: CHOICE_STATES }, example: { type: "toggle", text: "Text me when it's ready", on: true } },
  { type: "slider", category: "controls", defaultWidth: "fill", doc: "A slider.",
    props: { label: t("Label above."), value: n("0 to 1.", 0, 1), to: n("A second handle for a range, 0 to 1.", 0, 1), state: CHOICE_STATES }, example: { type: "slider", label: "Sweetness", value: 0.3 } },
  { type: "stepper", category: "controls", defaultWidth: "hug", doc: "A − n + quantity control.",
    props: { value: n("The number."), state: CHOICE_STATES }, example: { type: "stepper", value: 1 } },
  { type: "segmented", category: "controls", defaultWidth: "fill", linkItems: true, doc: "A segmented control.",
    props: { items: items("The segments. Items can be { text, icon, state }."), active: t("The selected one."), state: CHOICE_STATES }, example: { type: "segmented", items: ["Hot", "Iced"], active: "Hot" } },
  { type: "chips", category: "controls", defaultWidth: "fill", linkItems: true, doc: "A wrapping row of pills (filters, tags).",
    props: { items: items("The chips."), active: { type: { kind: "strings" }, doc: "The selected ones." }, close: b("An × on each chip (removable filters)."), state: CHOICE_STATES }, example: { type: "chips", items: ["All", "Coffee", "Tea", "Pastries"], active: ["All"] } },

  // navigation
  { type: "navbar", category: "navigation", defaultWidth: "fill", bleed: true, doc: "The bar at the top of an app screen.",
    props: { title: t("Title in the middle."), back: b("Show a back arrow (goes back)."), actions: { type: { kind: "items" }, doc: "Icons on the right: icon names, or { icon, goes }." }, large: b("Big title on its own line, left-aligned.") },
    example: { type: "navbar", title: "Your order", back: true } },
  { type: "tabbar", category: "navigation", defaultWidth: "fill", bleed: true, defaultPin: "bottom", linkItems: true, doc: "App tabs pinned to the bottom.",
    props: { items: items("Tabs: text, or { text, icon, goes }. Icons are guessed from the words."), active: t("The current tab.") },
    example: { type: "tabbar", items: ["Home", "Order", "Rewards", "Account"], active: "Order" } },
  { type: "tabs", category: "navigation", defaultWidth: "fill", linkItems: true, doc: "Underlined tabs inside a screen.",
    props: { items: items("Tabs: text, or { text, goes, badge, state }."), active: t("The current tab."), kind: e(["line", "boxed"], "Underlined (default) or boxed tabs."), state: CHOICE_STATES }, example: { type: "tabs", items: ["Menu", "Favorites", "Past orders"], active: "Menu" } },
  { type: "breadcrumbs", category: "navigation", defaultWidth: "fill", linkItems: true, doc: "A › trail › of places.",
    props: { items: items("The trail.") }, example: { type: "breadcrumbs", items: ["Account", "Orders", "#214"] } },
  { type: "pagination", category: "navigation", defaultWidth: "hug", doc: "‹ 1 2 3 › page buttons.",
    props: { pages: n("How many pages (default 5).", 1, 20), current: n("Current page (default 1).", 1) }, example: { type: "pagination", pages: 5, current: 2 } },
  { type: "dots", category: "navigation", defaultWidth: "hug", doc: "Carousel page dots.",
    props: { count: n("How many (default 3).", 1, 12), active: n("Which is current, from 1.", 1) }, example: { type: "dots", count: 4, active: 1 } },
  { type: "sidebar", category: "navigation", defaultWidth: "hug", linkItems: true, doc: "A side menu for desktop and tablet. Put it first in a screen with \"dir\": \"right\".",
    props: { title: t("Brand or app name at the top."), items: items("Menu items: text, or { text, icon, goes, badge, state }."), active: t("The current item."), collapsed: b("Icons only (a narrow rail).") },
    example: { type: "sidebar", title: "Corner Coffee", items: ["Orders", "Menu", "Stores", "Settings"], active: "Orders" } },
  { type: "topnav", category: "navigation", defaultWidth: "fill", bleed: true, linkItems: true, doc: "A website's top bar: brand left, links right.",
    props: { title: t("Brand."), items: items("Links: text, or { text, goes }."), active: t("The current one."), button: t("A button on the far right, e.g. \"Order now\".") },
    example: { type: "topnav", title: "Corner Coffee", items: ["Menu", "Locations", "Rewards"], button: "Order now" } },

  // content
  { type: "image", category: "content", defaultWidth: "fill", doc: "An image placeholder (a crossed box). Give `src` to use a real picture; it's sketchified in grays (`\"sketch\": false` shows it as it is).",
    props: { label: t("What the picture is."), aspect: t("Shape when there's no height: \"16:9\", \"1:1\", \"4:3\"."), src: t("Optional image file path, sketchified."), sketch: b("false shows the picture as it is, instead of sketchified in grays."), crop: { type: { kind: "crop" }, doc: "Show only part of the picture: [left, top, right, bottom] as fractions (the editor's Crop button writes it)." }, round: b("Round corners a lot (or a circle when square)."), mirror: b("Flip the picture left to right."), turn: n("Turn the picture clockwise: 0, 90, 180 or 270.", 0, 270), state: st("hover", "selected") },
    example: { type: "image", label: "Latte art photo", aspect: "16:9" } },
  { type: "avatar", category: "content", defaultWidth: "hug", doc: "A round profile picture or initials.",
    props: { text: t("Initials (otherwise a head shape)."), size: n("Diameter (default 40).", 16, 200) }, example: { type: "avatar", text: "MJ" } },
  { type: "icon", category: "content", defaultWidth: "hug", doc: "A single icon.",
    props: { icon: icon(), size: n("Size (default 24).", 12, 200) }, example: { type: "icon", icon: "coffee", size: 32 } },
  { type: "list", category: "content", defaultWidth: "fill", linkItems: true, doc: "Rows of things. Items can be text or { title, subtitle, meta, icon, image, goes }.",
    props: { items: items("The rows. Each can have a `state`: hover, selected or disabled."), chevrons: b("Show › on every row."), dividers: b("Lines between rows (default true)."), cards: b("Each row as its own card."), select: b("A checkbox on every row (rows with state selected are ticked)."), selected: t("The title of the selected row (highlighted).") },
    example: { type: "list", items: [{ title: "Oat latte", subtitle: "12 oz · extra shot", meta: "$5.25", goes: "drink" }, { title: "Cold brew", meta: "$4.50" }] } },
  { type: "table", category: "content", defaultWidth: "fill", doc: "A data table.",
    props: { columns: strings("Column headings."), rows: { type: { kind: "rows" }, doc: "Rows: arrays of cell text." }, select: b("A checkbox column."), selected: { type: { kind: "strings" }, doc: "Selected rows, by number from 1 (ticked and highlighted), e.g. [\"2\"]." }, sort: t("The column it's sorted by (an arrow in the heading)."), actions: b("A ⋮ menu at the end of every row."), striped: b("Shade every other row.") },
    example: { type: "table", columns: ["Order", "Store", "Total"], rows: [["#214", "Main St", "$5.25"], ["#198", "Main St", "$9.80"]] } },
  { type: "chart", category: "content", defaultWidth: "fill", doc: "A chart. Without data it's a placeholder; with data it draws the real numbers, roughly, with each number written on it. Highlight calls one out.",
    props: { kind: e(CHART_KINDS, "Chart type (default bar). hbar is sideways bars, for long labels."), label: t("Caption."), data: { type: { kind: "chartdata" }, doc: "The numbers: [[\"Mon\", 42], [\"Tue\", 38]] or { \"Mon\": 42 }." }, highlight: strings("Label(s) to call out; the rest stay light."), unit: t("Goes on every number: \"%\", \"$\", \"orders\"."), values: b("false hides the numbers.") },
    example: { type: "chart", kind: "line", label: "Orders this week", data: [["Mon", 42], ["Tue", 38], ["Wed", 51], ["Thu", 47], ["Fri", 64]], highlight: "Fri" } },
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
    props: { value: n("0 to 1 (default 0.4).", 0, 1), label: t("Caption above."), kind: e(["bar", "circle"], "A bar (default) or a ring with the percentage inside.") }, example: { type: "progress", value: 0.4, label: "Preparing · about 4 min" } },
  { type: "steps", category: "feedback", defaultWidth: "fill", doc: "Numbered steps with the current one marked (checkout, order tracking).",
    props: { items: strings("Step names."), current: n("Current step, from 1.", 1), vertical: b("Stack the steps down the screen (a wizard's side list).") }, example: { type: "steps", items: ["Ordered", "Preparing", "Ready"], current: 2 } },
  { type: "spinner", category: "feedback", defaultWidth: "hug", doc: "A loading spinner.",
    props: { label: t("Caption beside it.") }, example: { type: "spinner", label: "Loading menu" } },
  { type: "banner", category: "feedback", defaultWidth: "fill", bleed: true, doc: "A full-width message strip across the top of a page or section.",
    props: { text: t("The message."), kind: e(["info", "success", "warning", "error"], "Changes the icon (default info)."), action: t("A link on the right, e.g. \"Update\"."), close: b("An × to dismiss it.") },
    example: { type: "banner", kind: "warning", text: "Main St is closing early today.", action: "See hours" } },
  { type: "empty-state", category: "feedback", defaultWidth: "fill", doc: "What a screen shows when there's nothing yet: an icon, a heading, a line of text and a button.",
    props: { icon: icon(), title: t("Heading."), text: t("A line of help."), button: t("Button text.") },
    example: { type: "empty-state", icon: "coffee", title: "No orders yet", text: "Your past orders will show up here.", button: "Start an order" } },
  { type: "skeleton", category: "feedback", defaultWidth: "fill", doc: "Gray loading placeholders where content is about to appear.",
    props: { lines: n("Text lines (default 3).", 0, 12), avatar: b("A round picture on the left."), image: b("A picture block on top.") },
    example: { type: "skeleton", avatar: true, lines: 2 } },

  // controls (more)
  { type: "split-button", category: "controls", defaultWidth: "hug", doc: "A button with a ▾ beside it for more actions. With state open, its menu shows.",
    props: { text: t("The main action."), variant: e(["primary", "secondary", "outline"], "Look (default secondary)."), items: items("The other actions in its menu."), state: st("hover", "pressed", "focus", "disabled", "open") },
    example: { type: "split-button", text: "Save", variant: "primary", items: ["Save as draft", "Save and close"] } },
  { type: "fab", category: "controls", defaultWidth: "hug", defaultPin: "bottom-right", doc: "A floating round action button, pinned bottom-right. Give it text for a wide one.",
    props: { icon: icon("Icon (default plus)."), text: t("Text beside the icon (makes it wide)."), state: BUTTON_STATES },
    example: { type: "fab", icon: "plus", goes: "new" } },
  { type: "date-picker", category: "controls", defaultWidth: "fill", doc: "A date field with a calendar icon. With state open, the month calendar drops down.",
    props: { label: t("Label above."), value: t("The date, e.g. \"Oct 14, 2026\"."), hint: t("Placeholder."), day: n("The chosen day of the month in the open calendar.", 1, 31), today: n("Today's day in the open calendar (ringed).", 1, 31), month: t("Month shown in the open calendar, e.g. \"October 2026\"."), error: t("Error text below."), required: b("Mark the label with *."), state: st("hover", "focus", "disabled", "error", "open") },
    example: { type: "date-picker", label: "Pickup date", value: "Oct 14, 2026", day: 14 } },
  { type: "tag-input", category: "controls", defaultWidth: "fill", doc: "A field holding removable tags (multi-select, recipients, labels).",
    props: { label: t("Label above."), items: strings("The tags."), hint: t("Placeholder after the tags."), state: FIELD_STATES },
    example: { type: "tag-input", label: "Allergies", items: ["Nuts", "Dairy"], hint: "Add another" } },
  { type: "file-upload", category: "controls", defaultWidth: "fill", doc: "A drop zone for files, with any picked files listed below.",
    props: { label: t("Label above."), text: t("Words in the zone (default: drag a file here or browse)."), files: strings("Files already added."), state: st("hover", "disabled", "error") },
    example: { type: "file-upload", label: "Receipt", files: ["receipt-oct.pdf"] } },

  // content (more)
  { type: "calendar", category: "content", defaultWidth: "hug", doc: "A month calendar with a chosen day.",
    props: { month: t("e.g. \"October 2026\"."), day: n("The chosen day.", 1, 31), today: n("Today's day (ringed).", 1, 31), start: n("Weekday the 1st falls on, 0 = Sunday (default 4).", 0, 6) },
    example: { type: "calendar", month: "October 2026", day: 14, today: 2 } },
  { type: "details", category: "content", defaultWidth: "fill", doc: "Label and value pairs (order details, a profile, settings summary).",
    props: { items: items("Pairs: { label, value } (or \"Label: value\" text)."), columns: n("Pairs per row (default 1).", 1, 4) },
    example: { type: "details", items: [{ label: "Order", value: "#214" }, { label: "Pickup", value: "Main St · 8:10" }, { label: "Total", value: "$5.25" }] } },
  { type: "stat", category: "content", defaultWidth: "fill", doc: "A big number with its label and change (dashboards).",
    props: { label: t("What it counts."), value: t("The number, e.g. \"1,284\"."), delta: t("The change, e.g. \"+12%\"."), trend: e(["up", "down", "flat"], "Arrow direction for the change.") },
    example: { type: "stat", label: "Orders today", value: "1,284", delta: "+12%", trend: "up" } },
  { type: "avatar-group", category: "content", defaultWidth: "hug", doc: "Overlapping profile pictures with a +N.",
    props: { items: strings("Initials, one per person (blank = a head shape)."), more: n("The +N count after them.", 0) },
    example: { type: "avatar-group", items: ["MJ", "AK", ""], more: 4 } },
  { type: "tree", category: "content", defaultWidth: "fill", doc: "Nested folders or categories that expand.",
    props: { items: items("Items: text, or { text, icon, open, children: [...], state }."), selected: t("The highlighted item.") },
    example: { type: "tree", items: [{ text: "Drinks", open: true, children: ["Coffee", "Tea"] }, "Food", "Merch"] } },
  { type: "timeline", category: "content", defaultWidth: "fill", doc: "Events down a line (order history, activity).",
    props: { items: items("Events: text, or { title, meta, text }."), current: n("How many are done (the rest are hollow).", 0) },
    example: { type: "timeline", items: [{ title: "Ordered", meta: "8:01" }, { title: "Preparing", meta: "8:03" }, { title: "Ready", meta: "about 8:10" }], current: 2 } },
  { type: "code", category: "content", defaultWidth: "fill", doc: "A block of code or terminal text in a mono font. Lines split on \\n.",
    props: { text: t("The code. Leave it out for placeholder lines."), lines: n("Placeholder lines when there's no text (default 4).", 1, 30), numbers: b("Line numbers."), copy: b("A copy button in the corner.") },
    example: { type: "code", text: "npm install corner-coffee", copy: true } },

  // layout (more)
  { type: "accordion", category: "layout", defaultWidth: "fill", doc: "Sections that expand and collapse. The open ones show their text.",
    props: { items: items("Sections: text, or { title, text, state }."), open: { type: { kind: "strings" }, doc: "Titles of the expanded sections." } },
    example: { type: "accordion", items: [{ title: "How long does pickup take?", text: "Most orders are ready in 4 minutes." }, { title: "Can I change my order?" }], open: ["How long does pickup take?"] } },
  { type: "browser", category: "layout", container: true, defaultWidth: "fill", doc: "A web browser window: tabs, back/forward and an address bar with your `url`. Put the page inside.",
    props: { ...CONTAINER, url: t("The address shown, e.g. \"cornercoffee.com/menu\"."), title: t("The tab's title."), tabs: strings("More tabs beside it.") },
    example: { type: "browser", url: "cornercoffee.com/menu", title: "Menu · Corner Coffee", children: [{ type: "topnav", title: "Corner Coffee", items: ["Menu", "Rewards"] }, { type: "image", label: "Hero photo" }] } },
  { type: "window", category: "layout", container: true, defaultWidth: "fill", doc: "A desktop app window with a title bar and close buttons. Put the app inside.",
    props: { ...CONTAINER, title: t("The window title.") },
    example: { type: "window", title: "Corner Coffee for Mac", children: [{ type: "text", lines: 3 }] } },

  // navigation (more)
  { type: "toolbar", category: "navigation", defaultWidth: "fill", linkItems: true, doc: "A bar of actions above a table or editor: buttons or icons on the left, a search and a main button on the right.",
    props: { items: items("Actions: icon names, text, or { text, icon, goes }."), search: t("Search placeholder (shows a search field)."), button: t("A main button on the right.") },
    example: { type: "toolbar", items: ["filter", "sort", "Export"], search: "Search orders", button: "New order" } },

  // overlays
  { type: "menu", category: "overlays", defaultWidth: "hug", linkItems: true, doc: "A dropdown menu panel. Items can show an icon, a shortcut, a check, a divider, or be dangerous or disabled.",
    props: { items: items("Items: text, \"-\" for a divider, or { text, icon, shortcut, checked, danger, state, goes }."), value: t("The ticked item.") },
    example: { type: "menu", items: [{ text: "Edit", icon: "edit" }, { text: "Duplicate", icon: "copy" }, "-", { text: "Delete", icon: "trash", danger: true }] } },
  { type: "drawer", category: "overlays", container: true, defaultWidth: "fill", defaultPin: "right", doc: "A side panel sliding over a dimmed screen (filters, details). Pinned right, full height.",
    props: { ...CONTAINER, title: t("Panel title."), side: e(["right", "left"], "Which side (default right).") },
    example: { type: "drawer", title: "Filters", children: [{ type: "checkbox", text: "Open now", checked: true }, { type: "button", text: "Apply", variant: "primary" }] } },
  { type: "popover", category: "overlays", container: true, defaultWidth: "fill", doc: "A small card that pops out from something, with an arrow pointing at it.",
    props: { ...CONTAINER, title: t("Title."), arrow: e(["top", "bottom", "left", "right"], "Which edge the arrow is on (default top).") },
    example: { type: "popover", title: "Extra shot", children: [{ type: "text", text: "Adds a bit more caffeine for $0.75." }] } },
  { type: "tooltip", category: "overlays", defaultWidth: "hug", doc: "A small dark label with an arrow, explaining what something is.",
    props: { text: t("The words."), arrow: e(["bottom", "top", "left", "right"], "Which edge the arrow is on (default bottom: it sits above the thing).") },
    example: { type: "tooltip", text: "Reorder your last drink" } },

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
  select: { type: "select", label: "Label", value: "Choose one", items: ["Choose one", "Another", "And another"] },
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
  banner: { type: "banner", kind: "info", text: "A message across the page.", action: "Action" },
  "empty-state": { type: "empty-state", icon: "inbox", title: "Nothing here yet", text: "A line about what will show up here.", button: "Get started" },
  skeleton: { type: "skeleton", avatar: true, lines: 2 },
  "split-button": { type: "split-button", text: "Button", items: ["Action", "Another action"] },
  fab: { type: "fab", icon: "plus" },
  "date-picker": { type: "date-picker", label: "Date", value: "Oct 14, 2026", day: 14 },
  "tag-input": { type: "tag-input", label: "Tags", items: ["One", "Two"], hint: "Add" },
  "file-upload": { type: "file-upload", label: "Attachment" },
  calendar: { type: "calendar", month: "October 2026", day: 14, today: 2 },
  details: { type: "details", items: [{ label: "Label", value: "Value" }, { label: "Label", value: "Value" }, { label: "Label", value: "Value" }] },
  stat: { type: "stat", label: "Label", value: "1,234", delta: "+12%", trend: "up" },
  "avatar-group": { type: "avatar-group", items: ["AB", "", "CD"], more: 3 },
  tree: { type: "tree", items: [{ text: "Folder", open: true, children: ["Item", "Item"] }, "Folder", "Folder"] },
  timeline: { type: "timeline", items: [{ title: "Event", meta: "9:00" }, { title: "Event", meta: "9:30" }, { title: "Event", meta: "10:00" }], current: 2 },
  code: { type: "code", lines: 4, numbers: true },
  accordion: { type: "accordion", items: [{ title: "Section", text: "What's inside this section." }, { title: "Section" }, { title: "Section" }], open: ["Section"] },
  browser: { type: "browser", url: "example.com", title: "Page title", children: [{ type: "heading", text: "Page" }, { type: "text", lines: 3 }] },
  window: { type: "window", title: "App", children: [{ type: "text", lines: 3 }] },
  toolbar: { type: "toolbar", items: ["filter", "sort"], search: "Search", button: "New" },
  menu: { type: "menu", items: [{ text: "Edit", icon: "edit" }, { text: "Duplicate", icon: "copy" }, "-", { text: "Delete", icon: "trash", danger: true }] },
  drawer: { type: "drawer", title: "Panel", children: [{ type: "text", lines: 3 }, { type: "button", text: "Done", variant: "primary" }] },
  popover: { type: "popover", title: "Title", children: [{ type: "text", lines: 2 }] },
  tooltip: { type: "tooltip", text: "What this does" },
  sketch: { type: "sketch", height: 120 },
};
export const starterOf = (type: string): Record<string, unknown> => structuredClone(STARTERS[type] ?? COMPONENTS[type]?.example ?? { type });

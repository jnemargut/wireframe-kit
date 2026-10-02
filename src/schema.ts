/** JSON Schema for *.wireframe.json, generated from the catalogue (editors get autocomplete; the validator is stricter). */
import { COMMON, COMPONENTS, DEVICES, ICONS, PINS, TYPES, type PropDef } from "./vocab";

function propSchema(p: PropDef): Record<string, unknown> {
  const t = p.type;
  const base = { description: p.doc };
  switch (t.kind) {
    case "text": return { ...base, type: ["string", "number"] };
    case "number": return { ...base, type: "number", ...(t.min !== undefined ? { minimum: t.min } : {}), ...(t.max !== undefined ? { maximum: t.max } : {}) };
    case "bool": return { ...base, type: "boolean" };
    case "enum": return { ...base, enum: [...t.values] };
    case "icon": return { ...base, enum: [...ICONS] };
    case "screen": return { ...base, type: "string" };
    case "strings": return { ...base, oneOf: [{ type: "string" }, { type: "array", items: { type: ["string", "number"] } }] };
    case "rows": return { ...base, type: "array", items: { type: "array", items: { type: ["string", "number"] } } };
    case "items": return { ...base, type: "array", items: { oneOf: [{ type: ["string", "number"] }, { $ref: "#/definitions/item" }] } };
    case "children": return { ...base, type: "array", items: { $ref: "#/definitions/node" } };
  }
}

export function buildSchema() {
  const props: Record<string, unknown> = {};
  for (const d of Object.values(COMPONENTS)) for (const [k, p] of Object.entries(d.props)) props[k] ??= propSchema(p);
  for (const [k, p] of Object.entries(COMMON)) props[k] = propSchema(p);
  props.type = { description: COMMON.type.doc, enum: TYPES };
  props.width = { description: COMMON.width.doc, oneOf: [{ enum: ["fill", "hug"] }, { type: "number", exclusiveMinimum: 0 }] };
  props.pin = { description: COMMON.pin.doc, enum: [...PINS] };
  const device = { oneOf: [{ enum: Object.keys(DEVICES) }, { type: "object", required: ["w", "h"], properties: { w: { type: "number" }, h: { type: "number" } } }] };
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Wireframe Kit file",
    type: "object",
    required: ["title", "screens"],
    additionalProperties: false,
    properties: {
      $schema: { type: "string" },
      title: { type: "string" },
      device,
      start: { type: "string" },
      shared: { type: "object", additionalProperties: { $ref: "#/definitions/node" } },
      screens: { type: "object", additionalProperties: { $ref: "#/definitions/screen" } },
      layout: { type: "object", additionalProperties: { type: "object", additionalProperties: { type: "object", properties: { dx: { type: "number" }, dy: { type: "number" }, scale: { type: "number" }, hidden: { type: "boolean" } } } } },
      canvas: { type: "object", additionalProperties: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 } },
    },
    definitions: {
      screen: {
        type: "object",
        required: ["children"],
        additionalProperties: false,
        properties: {
          title: { type: "string" }, dir: { enum: ["down", "right"] }, gap: { type: "number" }, pad: { type: "number" },
          align: { enum: ["start", "center", "end", "stretch"] }, scroll: { type: "boolean" }, statusbar: { type: "boolean" },
          device, note: { type: "string" }, children: { type: "array", items: { $ref: "#/definitions/node" } },
        },
      },
      node: { type: "object", anyOf: [{ required: ["type"] }, { required: ["use"] }], additionalProperties: false, properties: props },
      item: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, meta: { type: "string" }, icon: { enum: [...ICONS] }, image: { type: ["boolean", "string"] }, goes: { type: "string" } } },
    },
  };
}

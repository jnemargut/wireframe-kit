# sketch/

The marker drawing kit shared by Storyboard Kit and Wireframe Kit: tokens, fonts, the wobble filter,
sketchify (image baking), PNG rendering via resvg-wasm, diff-friendly JSON with field-level edits, and the
local editor server helpers.

**This folder is the source.** Wireframe Kit keeps an exact copy in `vendor/sketch/`
(`npm run sync-sketch` there), and its build fails if the copy is edited by hand. Fix things here first.

Keep it free of anything specific to storyboards or wireframes.

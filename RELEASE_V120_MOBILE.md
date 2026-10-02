# TripCraft Mobile V120

V120 is based directly on the uploaded V118 FINAL package.

## Mobile control fix
- Hardened `Next` and `Back` on touch devices by capturing `pointerup` for touch/pen.
- Added deduplication so a touch `pointerup` followed by a synthetic `click` fires navigation exactly once.
- Preserved the existing planner validation and step/sub-step routing.
- Desktop click behavior remains unchanged.

## QA performed
- JavaScript syntax validation for all active application scripts and all inline scripts in `index.html` and `index-en.html`.
- V120 acceptance test: PASS.
- V120 runtime test: PASS (account open/edit, save/update, discard, AI fallback, exact day open).
- V120 navigation runtime: PASS (touch Next/Back fire exactly once).
- CJ/Booking integration regression: PASS.
- Core feature regression: PASS (dates, couples, rooms, multi-star selection, unsaved guard).
- Mobile controls regression: PASS (day open, save, discard).
- Static control inventory: 56 buttons in each entry page; all 56 have detectable action wiring through `id`, `data-*`, or inline action references.

## Environment note
A real Chromium end-to-end page run could not be completed in this execution environment because its managed browser policy blocks localhost and file URLs. The code-level runtime and interaction simulations above were therefore used for the mobile control QA. A final smoke test on the target iPhone/Android browser is still recommended before publishing.

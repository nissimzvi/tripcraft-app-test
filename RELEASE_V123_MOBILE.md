# TripCraft Mobile V123

Based on approved V122.

Fixes:
- Restored the registration / email OTP gate before starting a new trip for logged-out users.
- Fixed a V122 display regression where the new Home travel-content blocks remained visible while routing to Login, making it look as if registration had been skipped.
- Home content is now visible only on the Home route.
- Corrected the active version-layer filename/reference: V122 pointed to a missing tripcraft-v122.js. V123 loads tripcraft-v123.js consistently.
- Service Worker cache updated to V123 and includes the actual active V123 script.
- Visible and internal version updated to V123.

QA:
- Syntax checks passed for all local JavaScript files.
- All local HTML/CSS/JS/image references in index.html and index-en.html checked.
- Registration route remains protected by the existing V101 auth gate.
- Next/Back mobile controls and V120 touch protections were not changed.

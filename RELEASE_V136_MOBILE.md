# TripCraft MOBILE V136

Targeted repair over V135.

- Restored the missing `tripcraft-config.js` required for Supabase Auth and AI connectivity.
- Restored `sw.js` and moved cache/version to V136.
- Planner is public again: Home -> Build Trip opens the planner immediately.
- Login is required only when the user presses the final Build Trip button, preserving the intended flow: Planner -> Login/Register -> Email OTP -> resume Build.
- Added hard click routing for Build Trip, Login and My Account links so mobile taps cannot silently fail.
- Logged-out menu shows Plan a Trip + Sign in; My Account is hidden.
- Logged-in menu shows Plan a Trip + My Account; Sign in is hidden.
- No changes to AI V134 backend or Admin V129.

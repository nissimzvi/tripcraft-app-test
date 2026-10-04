# TripCraft V128 QA Report

## Baselines
- MOBILE: rebuilt from stable MOBILE V126 planner, not from the broken V127/V128 attempt.
- ADMIN: rebuilt from the original working ADMIN V126 package supplied by the user.
- Backend: no new deployment required; the already deployed TripCraft AI V127 remains the backend.

## Automated static QA
77/77 checks passed. Coverage includes HTML IDs, step/button wiring, flight field order, time validation, trip_id/user_id payloads, verify_trip payload, rich AI day mapping, Maps/Waze links, local file references, admin script references, AI settings function definitions, RPC names, user/trip joins and 7-decimal cost formatting.

## Browser/runtime QA
15/15 checks passed in headless Chromium with controlled mocks. Coverage includes:
- Mobile JavaScript boot without application errors.
- Same-airport checkbox auto-fill/read-only behavior.
- Flight times are mandatory when a flight airport is entered.
- Build Trip button becomes active/visible on final step.
- Next flow reaches step 7 and Previous returns to step 6.
- AI day detail renders actual AI text, time, notes, Google Maps and Waze links.
- Admin JavaScript boot without application errors.
- Admin login/dashboard flow with mocked RPC data.
- AI rows display user name + email, trip name + destination.
- AI costs display exactly 7 digits after the decimal.

## Live-service boundary
The QA did not create another paid OpenAI itinerary. The deployed AI V127 backend was already validated live earlier with successful build_trip and verify_trip calls. V128 preserves that backend contract and was statically checked against arrival_airport, departure_airport, arrival_time and departure_time fields.


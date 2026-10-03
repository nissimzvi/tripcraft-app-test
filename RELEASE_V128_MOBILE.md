# TripCraft MOBILE V128

QA rebuild from stable MOBILE V126 (not V127).

- Preserves the V126 7-step wizard and Build Trip button behavior.
- New Trip clears the prior trip/draft/currentTripId before opening the wizard.
- Flight arrival/departure times added; required only when flight airports are entered.
- Creates a tripcraft_trips cloud shell before AI calls so trip_id/user_id are joinable in Admin.
- Sends authenticated user_id + trip_id to build_trip and verify_trip.
- Sends arrival/departure airports and times to AI.
- Day details display AI summary/activity text and per-stop Google Maps + Waze links.
- Israel/no-flight planning remains supported.

- Same-return-airport checkbox moved directly under the arrival airport field (before flight times), for a practical mobile flow.

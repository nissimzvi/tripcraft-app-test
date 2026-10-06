# TripCraft MOBILE V138

## Focus
Authentication-first entry to a new trip, without touching calendar/day/AI itinerary behavior.

## Fixed
- Public **Build a Trip / Plan a Trip** links now point to `#login` in the HTML itself when JavaScript has not yet decided otherwise.
- A logged-out user must see email entry before the planner.
- Existing email: Supabase OTP with `shouldCreateUser:false`.
- New email: first name + last name are mandatory, phone optional, then OTP creates the account.
- After successful OTP the flow resumes at a clean planner step 1.
- Already authenticated users can start a clean trip without another OTP.
- Disabled the competing V136/V137 planner-entry routing blocks.
- Service worker registration and cache are V138; HTML/config use network/no-store to reduce stale-version problems.
- `tripcraft-config.js` is included in the release.

## Intentionally unchanged
Calendar/date display, gray date range, AI build, day details, Google Maps, Waze, rain alternative, save/discard trip.
- Legacy verified accounts that have no first/last name are required to complete them once; the names are written to Supabase Auth metadata.

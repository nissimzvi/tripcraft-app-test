# TripCraft MOBILE V139

## Build strategy
- Rebuilt from the V125 stable package, not patched on top of V138.
- Brought forward only the proven V132 planner/calendar/day-detail integration.
- No V135/V136/V137/V138 runtime routing layers are included.
- Added one clean V139 auth-to-new-trip routing layer.
- Bundled the supplied TripCraft AI V126 Hotfix4 source under `supabase/functions/tripcraft-ai/index.ts` for source consistency; deployment is not changed by this ZIP.

## User flow
Logout -> Home -> Build a Trip -> Email -> existing/new user -> 6-digit OTP -> fresh Planner -> dates -> Build AI -> day detail -> Maps/Waze -> Save -> Account.

## Preserved features
- Existing user: email check -> OTP without creating a new user.
- New user: required first + last name -> OTP signup. Phone remains optional.
- 6-digit OTP.
- User name in the header after login; login is hidden for logged-in users.
- Custom date-range calendar with Hebrew display such as `16 ספט 2026` and gray selected range.
- Arrival/departure airports and times, same-airport option, traveler count and trip preferences.
- AI `build_trip` and `verify_trip`, including usage/cost tracking.
- Day-level hourly detail, Google Maps, Waze, TripCheck and rain alternative.
- Save Trip / discard without saving / personal trip link / My Trips.

## Important
This package intentionally keeps the planner self-contained and does not restore the legacy V101/V102/V109 planner override scripts into the active page.

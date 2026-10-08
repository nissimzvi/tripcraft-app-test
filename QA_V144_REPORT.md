# TripCraft MOBILE V144 - QA Report

## Result
PASS - 47/47 targeted static/integration checks passed.
PASS - all 28 inline JavaScript blocks in `index.html` and `index-en.html` passed `node --check`.
PASS - `sw.js` and `tripcraft-config.js` passed JavaScript syntax checks.

## Critical flow changes verified
- Country is mandatory; Region is optional.
- Region field supports free text and aliases, including Slovenia region aliases.
- Booking search query is built country-first, then region/route area.
- Step 6 contains a preliminary route before final approval and respects the lodging choice.
- New Trip clears planner draft, Trip ID, dates, destination/region, flights, preferences and result state.
- Duplicate date preview is hidden; the existing formatted date control remains.
- Personal trip URLs always use the configured HTTPS TripCraft base URL and never generate `file:///` links.
- Full-name fallback reads `first_name`, `last_name`, `full_name` and `name` metadata.
- AI build does not start until a Supabase save preflight + read-back succeeds.
- Temporary `building` / `pending` rows are hidden from My Account.
- Progress cannot reach 100% before verified cloud persistence.
- Final save performs upsert + read-back verification.
- Save failure keeps the built draft locally, shows a clear error, and exposes Retry Save without claiming success.
- Success message appears only after verified persistence and contains a My Account CTA.
- The default manual Save button is hidden; retry is shown only on a failed save.
- AI backend bundle contains a hard geography rule to keep route/overnight stays inside selected country unless another country was explicitly selected.
- AI usage metadata marks trip save status as pending at AI completion, avoiding implication that AI completion equals trip persistence.

## Build sequence in V144
1. Validate user + country + dates.
2. Create Trip ID.
3. Supabase persistence preflight (hidden `building` row).
4. Read back the preflight row. If this fails, AI is NOT called.
5. Call `build_trip`.
6. Build itinerary in memory.
7. Run TripCheck / `verify_trip` (best effort; warning retained if verification service fails).
8. Save full trip to Supabase.
9. Read back the exact trip for the authenticated user.
10. Refresh cloud account list and verify the Trip ID exists.
11. Only then set progress to 100% and display “trip saved” success.

## Browser runtime limitation
A Chromium smoke test was attempted in the isolated build environment, but the page depends on external CDN/Supabase resources and the headless run timed out. Therefore real OTP, live Supabase RLS behavior, OpenAI Edge Function execution and live Booking results still require one end-to-end test in the deployed environment.

## Deployment note
For the country-first AI constraint, deploy the bundled `supabase/functions/tripcraft-ai/index.ts` together with the V144 web files. The front end already sends country and optional region separately; the V144 function enforces the selected-country geography in the AI prompt.

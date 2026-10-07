# TripCraft MOBILE V140 - QA Report

## Scope
V140 is an auth-focused release built from V139. Planner, calendar, AI, day drill-down and navigation features were intentionally preserved.

## Auth flow checks
- PASS: stale `localStorage` customer alone is not treated as an authenticated user.
- PASS: protected pages (`trips`, `hotels`, `planner`, `import`, `cart`, `account`) route unauthenticated users to Login.
- PASS: Build/New Trip links route unauthenticated users to Login.
- PASS: email-first flow is present.
- PASS: existing user path uses `signInWithOtp(... shouldCreateUser:false)`.
- PASS: unknown/new user path exposes required first name + last name and optional phone, then uses `shouldCreateUser:true`.
- PASS: OTP is six digits and verified with Supabase `verifyOtp`.
- PASS: after OTP, both existing and new users land on `#account`.
- PASS: account loads trips for the authenticated `user_id` and renders My Trips.
- PASS: account includes Build a New Trip.
- PASS: authenticated user's first/last name is rendered in the header.
- PASS: logout clears both Supabase session and local verified-auth cache.
- PASS: verified local session expires after 30 minutes of inactivity.

## Trip saving
- PASS: AI trip build still calls `tcSaveCurrentTrip(false)` after the itinerary is built.
- PASS: save function upserts the trip to Supabase `trips` and also maintains the local fallback.
- PASS: day/rain changes retain the existing save calls.

## Regression checks
- PASS: V132 custom date-range calendar remains present.
- PASS: AI `build_trip` remains present.
- PASS: AI `verify_trip` / TripCheck remains present.
- PASS: arrival/departure times remain present.
- PASS: day detail modal remains present.
- PASS: Google Maps and Waze links remain present.
- PASS: rain alternative remains present.
- PASS: Supabase AI function file is byte-for-byte unchanged from V139.
- PASS: logo asset is byte-for-byte unchanged from V139.
- PASS: legacy planner JS asset is byte-for-byte unchanged from V139.

## JavaScript QA
- PASS: all inline JavaScript blocks in Hebrew index passed `node --check`.
- PASS: all inline JavaScript blocks in English index passed `node --check`.
- PASS: isolated auth-state test confirms stale local cache rejection, verified-session acceptance, and 30-minute inactivity expiry.

## Version QA
- PASS: visible header shows V140 in Hebrew and English.
- PASS: `VERSION.txt` is V140.
- PASS: config/service-worker version markers updated to V140.
- PASS: no V139/v139 runtime references remain.

## Runtime limitation
A true end-to-end OTP delivery/login against the deployed Supabase project requires running the deployed site with network access and a real email inbox. This package was statically and structurally validated here; actual email delivery was not simulated.

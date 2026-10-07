# TripCraft MOBILE V142 - QA Report

## Scope
V142 is based directly on V141. Only session/inactivity behavior and version/cache identifiers were changed.

## Root cause fixed
V141 called `tcMarkAuthenticated()` during `tcSyncAuthSession()`. A persisted Supabase session therefore reset the inactivity clock whenever the app/page opened. Mobile Safari/PWA could retain the Supabase token and restore an old account even after far more than 30 minutes.

## V142 behavior
- `lastActivity` is persisted in `localStorage` as `tc_v142_last_activity`.
- Successful OTP sets authenticated state and the activity timestamp.
- Real pointer/keyboard/touch activity refreshes the timestamp only while authenticated.
- App startup checks the persisted timestamp before restoring a Supabase session.
- If the timestamp is missing or older than 30 minutes, V142 calls Supabase `signOut()`, clears local user identity and protected-route state, and requires Email + OTP again.
- Returning to the app/tab (`visibilitychange` / `focus`) performs the same timeout check.
- Opening/reloading the app does not itself refresh `lastActivity`.
- Existing Account, trip list, edit/delete, auto-save, return-to-account, planner, AI, Maps/Waze and day-detail logic were not intentionally changed.

## Static QA performed
- Hebrew index: 14 inline JavaScript blocks passed `node --check`.
- English index: 14 inline JavaScript blocks passed `node --check`.
- Email, first name, last name, return-to-account, edit/delete elements verified present.
- Persistent timeout, startup sign-out and resume/focus timeout logic verified present in HE and EN.
- Boundary logic verified: 29:59 fresh; 30:00 fresh; 30:01 expired; missing timestamp expired.
- `VERSION.txt` = V142.
- `tripcraft-config.js` version = 142.
- Service-worker cache = `tripcraft-mobile-v142`.
- Service-worker registration query = `v=142`.

## Runtime limitation
A real OTP delivery / Supabase mobile Safari or installed-PWA runtime test cannot be performed in this container. The critical acceptance test after deployment is:
1. Sign in on mobile with Email + OTP.
2. Confirm account name and trips appear.
3. Close/background TripCraft for more than 30 minutes without interaction.
4. Reopen TripCraft and tap My Account / Build Trip.
5. Expected: Email login screen, not the previous user's account.

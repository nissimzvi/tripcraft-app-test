# QA - TripCraft MOBILE V141

## Scope
V141 is a targeted account/authentication repair on top of V140. Planner, AI build/verify, calendar, day detail, Maps/Waze and rain-alternative logic were not replaced.

## Fixed flow
1. Unauthenticated account-required action -> Login page.
2. Login page visibly contains one email field (`tcAuthEmail`).
3. Email check uses Supabase OTP with `shouldCreateUser:false` for an existing-user check.
4. If the email is new -> first name + last name are required; phone is optional; account OTP is sent with `shouldCreateUser:true`.
5. OTP verification -> authenticated account -> My Account.
6. User name and email are rendered in My Account/header. Legacy `tripcraft_profile` metadata is also supported.
7. My Account shows saved trips with Open/Edit, Copy Link and Delete Trip.
8. AI build auto-saves using `tcSaveCurrentTrip(false)`.
9. After save, the planner displays a persistent "trip saved" confirmation and a "Back to My Account" button.
10. Service Worker/cache/config versions were aligned to V141 to prevent stale V132/V139/V140 frontend code.

## Static QA performed
- Both `index.html` and `index-en.html`: no duplicate DOM IDs.
- Required auth/account/save DOM controls present in both languages.
- 15 flow assertions passed in each language.
- All inline JavaScript blocks in both index files passed `node --check` (28 script blocks total).
- `VERSION.txt` = V141.
- `tripcraft-config.js` = version 141.
- Service Worker cache = `tripcraft-mobile-v141`.
- Service Worker registration = `./sw.js?v=141`.
- No critical stale V139/V140 config/cache references remain.

## Runtime limitation
A real end-to-end Supabase email delivery and OTP verification cannot be completed in the container because it requires the deployed site/browser and actual email inbox. The first live test after deployment should be:
Logout -> Build Trip -> Email -> existing/new branch -> OTP -> My Account -> New Trip -> Build AI -> auto-save notice -> Back to My Account -> Open/Edit -> Delete.

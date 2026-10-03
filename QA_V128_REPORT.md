# TripCraft V128 QA Report

Build basis: stable MOBILE V126 and clean ADMIN V126.

Automated/static QA completed successfully: 72 checks passed, 0 failed.

Mobile checks include:
- 7 planner steps present.
- Previous / Next / Build Trip handlers present.
- Build Trip button is shown by the original stable V126 step-7 logic.
- Save Trip / Exit without Save controls present.
- New Trip clears previous draft/current trip state in both inline flow and account flow.
- Flight time controls exist in Hebrew and English.
- Flight times are required only when flight airports are entered.
- build_trip and verify_trip calls include trip_id and authenticated user_id.
- A tripcraft_trips cloud shell is created before AI usage logging.
- AI day detail, Google Maps and Waze code present.
- All local script references resolve.
- All external/local JS and inline JS passed syntax checks.
- No duplicate HTML IDs found.

Admin checks include:
- AI costs use exactly 7 decimal places.
- Detailed AI activity table includes Trip / Destination.
- trip_id is joined to saved trips.
- user_id (or linked trip user_id) resolves to name + email.
- Old NULL-id AI rows are explicitly shown as unassigned rather than falsely matched.
- Admin JavaScript passed syntax validation.

ZIP checks:
- ZIP opens without corruption.
- Every file is inside one clearly named internal V128 folder.

# TripCraft MOBILE V138 — QA Report

**Static/structural QA: 87/87 checks passed.**

## What was actually wrong
- V137 still registered `sw.js?v=136`, which left a stale-version/cache path.
- V137 also had the V136 direct-planner handler and a second V137 auth-first handler at the same time. The result depended on competing click handlers/cache state.
- V138 makes the rule structural instead of fragile: public Build/Plan links point to `#login` in the HTML itself. JavaScript bypasses login only when a verified local session/customer is already present.

## Required flow now
1. Logged-out user presses Build/Plan.
2. Email screen opens before the planner.
3. Existing email → OTP (`shouldCreateUser:false`).
4. New email → required first + last name, optional phone → OTP (`shouldCreateUser:true`).
5. Successful OTP → clean planner step 1.
6. Existing legacy account missing a name must complete first + last name once; metadata is updated.

## Regression protection
- Calendar/date implementation is byte-for-byte unchanged from V137, including the gray in-range dates.
- AI build function is byte-for-byte unchanged from V137.
- Day runtime is byte-for-byte unchanged from V137, preserving Maps/Waze/rain behavior.
- Save/discard and build-progress code are still present.
- V136/V137 competing routing scripts are disabled.
- Service worker/cache is V138 and HTML/config use fresh network requests.

## Runtime limitation
This environment can validate the package, routing structure, file completeness and JavaScript syntax. It cannot receive the real OTP email, so one live OTP smoke test is still required after deployment.

## Checks
- PASS — index.html V138 visible
- PASS — index.html four public auth-first links
- PASS — index.html no public #planner anchor
- PASS — index.html email input
- PASS — index.html email check
- PASS — index.html existing-user OTP
- PASS — index.html new-user OTP
- PASS — index.html first name
- PASS — index.html last name
- PASS — index.html OTP input
- PASS — index.html OTP verify
- PASS — index.html legacy name completion
- PASS — index.html return to planner
- PASS — index.html V138 resume
- PASS — index.html SW V138
- PASS — index.html V136 route disabled
- PASS — index.html V137 route disabled
- PASS — index.html no duplicate ids
- PASS — index.html active script 0 syntax
- PASS — index.html active script 1 syntax
- PASS — index.html active script 2 syntax
- PASS — index.html active script 3 syntax
- PASS — index.html active script 4 syntax
- PASS — index.html active script 5 syntax
- PASS — index.html active script 6 syntax
- PASS — index.html active script 7 syntax
- PASS — index.html active script 8 syntax
- PASS — index.html active script 9 syntax
- PASS — index.html active script 10 syntax
- PASS — index.html active script 11 syntax
- PASS — index.html active script 12 syntax
- PASS — index.html active script 13 syntax
- PASS — index-en.html V138 visible
- PASS — index-en.html four public auth-first links
- PASS — index-en.html no public #planner anchor
- PASS — index-en.html email input
- PASS — index-en.html email check
- PASS — index-en.html existing-user OTP
- PASS — index-en.html new-user OTP
- PASS — index-en.html first name
- PASS — index-en.html last name
- PASS — index-en.html OTP input
- PASS — index-en.html OTP verify
- PASS — index-en.html legacy name completion
- PASS — index-en.html return to planner
- PASS — index-en.html V138 resume
- PASS — index-en.html SW V138
- PASS — index-en.html V136 route disabled
- PASS — index-en.html V137 route disabled
- PASS — index-en.html no duplicate ids
- PASS — index-en.html active script 0 syntax
- PASS — index-en.html active script 1 syntax
- PASS — index-en.html active script 2 syntax
- PASS — index-en.html active script 3 syntax
- PASS — index-en.html active script 4 syntax
- PASS — index-en.html active script 5 syntax
- PASS — index-en.html active script 6 syntax
- PASS — index-en.html active script 7 syntax
- PASS — index-en.html active script 8 syntax
- PASS — index-en.html active script 9 syntax
- PASS — index-en.html active script 10 syntax
- PASS — index-en.html active script 11 syntax
- PASS — index-en.html active script 12 syntax
- PASS — index-en.html active script 13 syntax
- PASS — required file tripcraft-config.js
- PASS — required file sw.js
- PASS — required file assets/hero.jpg
- PASS — required file tripcraft-logo-v109.png
- PASS — config V138
- PASS — config Supabase URL
- PASS — config publishable key
- PASS — config AI function
- PASS — SW cache V138
- PASS — SW fresh HTML/config
- PASS — preserved tcCalendarModal
- PASS — preserved tc-cal-day.in-range
- PASS — preserved displayPlannerDate
- PASS — preserved Google Maps
- PASS — preserved Waze
- PASS — preserved rain_alternative
- PASS — preserved plannerSaveTrip
- PASS — preserved plannerDiscardTrip
- PASS — preserved tcBuildProgressStart
- PASS — preserved tcBuildProgressFinish
- PASS — calendar script byte-for-byte unchanged
- PASS — day runtime byte-for-byte unchanged
- PASS — AI build function byte-for-byte unchanged

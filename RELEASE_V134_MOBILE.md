# TripCraft MOBILE V134

Targeted fixes on top of MOBILE V133. Home page design intentionally unchanged.

- Fixed duplicate date display: native iOS date input is hidden and used only as value storage; custom TripCraft calendar is the only visible picker.
- Kept date-range shading and RTL display.
- Build requires an active Supabase auth session; stale local customer data no longer bypasses email/OTP login.
- Build progress now continues slowly from 88% up to 97% while waiting for AI, then reaches 100% only when the itinerary is returned.
- After build completes, Build/Next/Back controls disappear and a slim floating Save Trip / Exit Without Saving row appears.
- Planner buttons are thinner and aligned in one row on mobile.
- Added universal Back and Close controls on every internal page; day modal keeps its own Close control.
- Existing day details, Google Maps, Waze, TripCheck and rain alternative behavior preserved from V133.

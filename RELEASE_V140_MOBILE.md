# TripCraft MOBILE V140

Auth-focused release based on V139.

- Protected actions require a verified Supabase session; stale localStorage customer data is no longer treated as login.
- Email is checked first. Existing users receive OTP. New users must provide first and last name (phone optional) and then receive OTP.
- After successful OTP, both existing and new users land on My Account, where their cloud/local trips are listed and a New Trip button is available.
- User name is rendered in the header after verified login.
- Session expires after 30 minutes of inactivity.
- Trip creation continues to auto-save through `tcSaveCurrentTrip(false)` after the AI build completes.
- Planner, V132 calendar, AI build/verify, day details, Maps/Waze, TripCheck and rain alternative are otherwise unchanged from V139.

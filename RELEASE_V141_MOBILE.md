# TripCraft MOBILE V141

V141 repairs the account-first authentication flow without changing the planner/AI/day-detail feature set.

- Any account-required action routes an unauthenticated visitor to the email screen.
- Email is checked first. Existing users receive OTP; new users must supply first name + last name (phone optional) before OTP.
- After OTP, the user lands in My Account, with name/email and their saved trips.
- Each saved trip has Open/Edit, Copy Link, and Delete.
- AI-built trips are auto-saved. A persistent confirmation appears in the result with a **Back to My Account** button.
- Auth profile display supports both `tripcraft_profile` metadata used by older versions and `first_name`/`last_name`.
- Service Worker registration/cache and public config all identify V141 to prevent stale V132/V139/V140 frontend code.

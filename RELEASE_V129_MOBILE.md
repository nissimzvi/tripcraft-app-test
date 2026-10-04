# TripCraft MOBILE V129

Reliability release focused on mobile flow completion:
- Fixes Build Trip login-return key mismatch.
- Resumes Build Trip automatically after successful OTP authentication.
- Adds local OTP cooldown and translates Supabase rate-limit waits into clear Hebrew countdowns.
- Reuses an existing Supabase session before a new OTP request.
- Adds a clean New Trip action so the previous trip does not leak into a new plan.
- Keeps flight-time, same-airport placement, AI build/verify, Maps/Waze and V127 backend integration.
- Adds a versioned service worker to avoid stale mixed GitHub Pages code.

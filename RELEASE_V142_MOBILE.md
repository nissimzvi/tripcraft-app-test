# TripCraft MOBILE V142

Session / inactivity fix only, based on V141.

- 30-minute inactivity timestamp is now persisted in localStorage so mobile Safari/PWA cannot silently restore an old login days later.
- On every app start, Supabase session is accepted only when last activity is within 30 minutes.
- Expired sessions perform Supabase signOut, clear the local customer identity, and protected routes return to Email + OTP login.
- App resume / tab focus performs the same 30-minute check.
- Opening the app does not itself refresh lastActivity. Only actual user interaction does.
- Existing V141 account, trip list, auto-save, edit/delete, AI, planner and day-detail behavior is otherwise unchanged.

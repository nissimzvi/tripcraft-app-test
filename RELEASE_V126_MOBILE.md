# TripCraft Mobile V126

- Based only on verified Mobile V125.
- Build Trip now calls the stable Supabase `tripcraft-ai` backend.
- A Trip ID is created before the AI call and is passed to build and verification for per-trip cost tracking.
- AI itinerary is mapped into the existing V125 day UI, preserving existing buttons/navigation.
- Web verification runs as a separate second stage; verification failure does not discard a successfully built trip.
- Hebrew and English flows use the same backend integration.
- Version/header/service-worker cache updated to V126.

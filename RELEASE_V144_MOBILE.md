# TripCraft MOBILE V144

V144 rebuilds the Build Trip completion chain around verified persistence.

- Country is required; Region is optional and supports aliases/autocomplete.
- Booking searches are constrained by country first, then region/route area.
- Step 6 shows a preliminary route before final approval and asks/uses the lodging choice already collected.
- New Trip clears all previous planner data, including dates and local planner draft.
- Duplicate date preview text is hidden; formatted dates remain `6 ספט 2027`.
- Progress no longer reaches 100 before AI/save. 100 is shown only after a DB read-back confirms the trip exists.
- Auto-save performs Supabase upsert + read-back verification. Failure shows retry and keeps the built draft locally without a false success message.
- Account list only treats cloud or locally verified trips as saved.
- Personal links are canonical TripCraft HTTPS links; file:// links are never generated.
- Full-name fallback reads first_name/last_name/full_name/name metadata.
- AI request receives country + optional region as separate hard geography fields.

Backend note: the bundled `supabase/functions/tripcraft-ai/index.ts` is also updated to enforce selected-country geography. Deploy that function together with V144 for the strongest country constraint.

- Before any billable AI build call, V144 performs a database save preflight and read-back. If persistence is unavailable, AI is not called. The temporary building row is hidden from the account until final verification.

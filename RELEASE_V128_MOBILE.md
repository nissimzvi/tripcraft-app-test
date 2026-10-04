# TripCraft MOBILE V128

Baseline: stable MOBILE V126.

Changes:
- Restored and QA-protected Build Trip button on final planner step.
- Arrival/return flight times are captured and sent to the AI backend as critical constraints.
- 'Same airport for return' is directly under arrival airport, before return airport and times.
- Airport values use LTR-safe display inside the RTL mobile UI.
- New AI trips send trip_id + user_id to build_trip and verify_trip.
- Day details render the actual AI activity description, times, route metadata and notes.
- Each AI stop has working Google Maps and Waze search links built from the stop location + trip destination.
- New trip flow retains V126 navigation and reset behavior.

Backend dependency: deployed TripCraft AI V127.

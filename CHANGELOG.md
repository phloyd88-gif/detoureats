# Changelog

## v1.3 Beta
- Added editable starting point and destination fields for arbitrary U.S. trips.
- Added current location as an optional origin rather than a route requirement.
- Added origin/destination swap for typed routes.
- Added route validation and a pre-trip summary with distance, drive time, and food-option counts.
- Added recent-trip history and quick example routes.
- Added cached preview reuse so Trust Us does not repeat a completed route search.
- Removed Amsterdam and Myrtle Beach as functional input defaults.
- Prevented arbitrary-route failures from silently substituting the original curated corridor.
- Optimized curated-stop processing so unrelated corridor restaurants are filtered before address lookup.


## v1.2 Beta
- Added restaurant discovery across any live route using OpenStreetMap and Overpass.
- Added route-corridor sampling and geographically distributed discovery candidates.
- Combined discovered venues with relevant curated recommendations.
- Added common-chain identification and available cuisine, address, website, phone, and hours metadata.
- Added Curated and Route-discovered provenance labels throughout the app.
- Added conservative discovery-confidence scoring caps so incomplete data cannot produce elite Detour Scores.
- Added unknown-hours treatment and explicit unverified-hours messaging.
- Added discovery counts and fallback status to Driver Mode and the trip timeline.


## v1.1 Beta
- Made Detour Score a prominent main-card visual.
- Added plain-English score meaning and comparison with the next option.
- Added visible Food, Trip Fit, and Time Fit components.
- Added a Trust Snapshot with route mode, restaurant confidence, hours status, verification date, and operational risk.
- Made timeline scores more prominent.
- Added a manual Recheck Route action for live-location trips.


## v1.0 Beta
- Combined Trip Timeline, Food Zones, Live Location Beta, and live route calculations.
- Added Use My Location with browser permission handling.
- Added no-account OpenStreetMap geocoding and OSRM route calculations.
- Added real route order, ETA, distance ahead, added trip time, and decision timing.
- Added automatic passed-stop removal and controlled location-based refreshes.
- Added next-six-stop timeline, current/best-if-wait/backup roles, and food-gap warnings.
- Preserved the complete curated demo fallback when live services are unavailable.


## v0.9
- Added Stop Here versus Skip and Wait decision consequences.
- Added the next qualifying restaurant, approximate wait, score comparison, and route outlook.
- Added stronger stop-or-wait messaging based on what comes next.
- Added browser persistence for trip preferences.
- Built from the stable v0.8.1 interface with no API or account requirement.


## v0.8.1
- Renamed Style to Eating Priority.
- Added in-drive priority controls.
- Replaced Find Something Faster with Eat Sooner.
- Fixed Eat Sooner so it favors the earliest qualifying open stop and does not automatically skip the current recommendation.
- Renamed modes to Best overall, Eat soon, and Worth waiting for.


## v0.8
- Added Driver Mode route-progress panel.
- Added simulated remaining time, next food zone, and decision countdown.
- Simplified the main recommendation card for at-a-glance use.
- Added confidence and operational-risk indicators.
- Hid technical details by default behind Tell Me Why.
- Added a one-tap Find Something Faster action.


## v0.7
- Added optional trip preferences.
- Added preference-fit scoring and explanations.
- Added reason-based skipping that changes subsequent recommendations.
- Added cuisine exclusion, budget mode, quick-stop mode, defer logic, and a raised quality bar.
- Added active-preference and latest-adjustment details to Trip Context.
- Fixed Food Adventure so its style value is handled consistently.


## v0.6.1
- Fixed Hungry Soon showing No rush.
- User-selected style now directly influences meal urgency.
- Added Style applied to the Trip Context panel.


## v0.6
- Added meal urgency states.
- Added route-scarcity analysis.
- Added stop-now, eat-soon, and keep-driving decision messaging.
- Added trip-context details showing urgency and route outlook.


## v0.5.2
- Fixed Hungry Soon still selecting Bonnie Blue.
- Added a real earlier open stop in Binghamton.
- Hungry Soon now explicitly selects the earliest open candidate that clears the quality threshold.


## v0.5.1
- Fixed trip style selector so it materially changes recommendations.
- Added urgency scoring.
- Hungry Soon now favors earlier acceptable stops.
- Food Adventure now tolerates more waiting for standout restaurants.
- Added style-specific explanation text.


## v0.5
- Replaced fictional restaurants with a curated real test corridor.
- Added source links, data confidence, verification dates, addresses, and published hours.
- Added operational-risk warnings for sellouts, limited hours, and payment restrictions.
- Clearly separated verified restaurant facts from editorial DetourEats scoring and estimated routing data.


## v0.4
- Added a dedicated Detour Score engine.
- Added richer sample route data with food reputation, uniqueness, confidence, consistency, and destination-worthiness.
- Added score explanation breakdown: Food, Trip Fit, Time, and Scarcity.
- Added guardrails so convenience cannot make mediocre food look elite.
- Improved Best Available logic so the app still makes a decision when the traveler needs to eat.


## v0.3.2
- Replaced weak Best Available copy that implied the driver was still guessing.
- Updated wording to reinforce that DetourEats makes the decision.


## v0.3.1
- Fixed data/engine wiring bug causing the app to show only Keep Driving.
- Explicitly exposed candidate data to the browser window.
- Mapped app fields to existing data fields like seq, estimatedAddedMinutes, famousFor, and arrivalClock.


## v0.3
- Added clearer trip states and recommendation tiers.
- Improved recommendation copy and practical/best-available logic.
- Added safer fallback recommendation behavior.
- Improved skip behavior and details panel language.
- Left the temporary DE logo in place to keep the live site stable.


## v0.2.3
- Replaced the broken detailed illustrated icon with a clean temporary DE mark.
- Kept the green brand theme.
- This is intended as a stable live-site icon while the final logo is refined.


## v0.2.2
- Replaced the too-abstract temporary icon with a more literal road/fork/food icon.
- Enlarged the header icon slightly for better readability.


## v0.2.1
- Simplified the app icon/logo so it reads cleanly at small size.
- Removed the overly detailed landscape-style SVG mark from v0.2.


## v0.2
- Green visual theme.
- New SVG app icon.
- Cleaner public setup flow.
- Debug/simulation controls hidden behind a toggle.
- Updated manifest and cache name.

## v0.1
- Initial prototype with simulated route data and Detour Score recommendation engine.

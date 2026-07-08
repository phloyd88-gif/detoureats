# Changelog

## v1.8.8 Unified Closure Validation
- Blocked G's Famous Lemon Cookies at 44 Main Street in Amsterdam as permanently closed.
- Fixed the short-route Nominatim fallback bypassing known business-status overrides.
- Added a provider-neutral candidate status assessor.
- Applies local tester suppressions to both OpenStreetMap and fallback candidates.
- Preserves operational confidence after fallback status validation.
- Updated all cache-busted assets and the service-worker cache to v1.8.8.


## v1.8.7 Full Repository Sync
- Consolidated all current files into one complete repository replacement.
- Added cache-busted references for every JavaScript, CSS, and manifest asset.
- Service worker now activates immediately and deletes prior DetourEats caches.
- App assets now use network-first loading with cached offline fallback.
- Added a visible v1.8.7 deployment marker.
- Added complete GitHub replacement instructions in DEPLOYMENT.md.


## v1.8.6 Route Verification Fix
- Fixed short-route fallback requests exceeding the overall setup timeout.
- Runs bounded local fallback categories concurrently.
- Preserves a verified driving route when restaurant discovery is unavailable.
- Separates driving-route validity from restaurant-provider availability.
- Increased the bounded setup timeout to 70 seconds.
- Replaced misleading route-verification errors with accurate search status.


## v1.8.5 Short Route Fallback
- Added a dedicated local restaurant search for trips shorter than approximately 40 miles.
- Searches compact origin, midpoint, and destination areas.
- Retries Overpass through multiple servers using POST and GET.
- Added a bounded Nominatim fallback when Overpass is unavailable or sparse.
- Restricts fallback results to the actual route corridor.
- Preserves business-status, duplicate, matrix, and exact-route checks.
- Added active provider details to Field Tester Mode.


## v1.8.4 Search Reliability
- Replaced broad route-tube searches with compact waypoint-circle queries.
- Limits practical public-map requests to two points.
- Reduced public-search concurrency to avoid self-throttling.
- Reset restaurant discovery cache.
- Treats partial searches with at least five qualified options as route-ready.
- Hides raw route diagnostics during normal use.
- Keeps full diagnostics in Field Tester Mode.


## v1.8.3 Business Status Hotfix
- Blocked the former Shaker Mill Tavern restaurant listing in West Stockbridge, Massachusetts.
- Keeps Shaker Mill Inn separate as a lodging identity.
- Added a dedicated place-status validation module.
- Upgraded Overpass restaurant results to include element edit metadata.
- Added explicit closed, removed, demolished, abandoned, and disused checks.
- Added status freshness evaluation using check dates, survey dates, source dates, and map edit timestamps.
- Suppresses restaurant records older than six years when no current operating signal is mapped.
- Added high, medium, and low operational-confidence classifications.
- Added conservative Detour Score caps for weakly verified current operation.
- Prevents low-operational-confidence records from exceptional-detour alerts.
- Added a Closed or Stale Listings Filtered route outcome and preview count.
- Closed, wrong-location, and duplicate reports now hide a listing immediately and persistently on that device.
- Includes local place suppressions in field-test JSON exports.


## v1.8.2 Route Pipeline Repair
- Replaced whole-route Overpass queries with independently cached route-section searches.
- Retains successful partial restaurant results when other sections fail.
- Rotates current public Overpass endpoints by route section.
- Calculates restaurant distance to the actual route polyline rather than sparse sample points.
- Added route progress and route-distribution projection for every restaurant.
- Added OSRM Table matrix screening for up to 20 restaurant candidates in one request.
- Limits individual route-through calls to the strongest and most geographically distributed candidates.
- Retains matrix-estimated candidates when exact route confirmation times out.
- Added explicit search outcome states for unavailable, empty, partial, failed routing, no qualifiers, and successful results.
- Added route-section, mapped-record, matrix-screen, exact-route, and estimated-route counts.
- Manual Recheck Route now forces a fresh segmented restaurant search.
- Automatic location refresh retries restaurant discovery after service failure or an empty candidate pool.
- Removed all remaining demo controls, demo labels, and standalone curated-list fallback behavior.
- Removed the hard-coded Myrtle Beach geocode fallback.
- Added matrix-estimate confidence disclosure to Restaurant Intelligence.


## v1.8.1 Hotfix
- Removed the three prepopulated example-trip buttons.
- Removes previously saved copies of the exact old demo trips from Recent Trips.
- Fixed zero live candidates incorrectly switching the app back to demo mode.
- Prevented unrelated curated restaurants from appearing on arbitrary live routes.
- Added strict geocoding, baseline-route, discovery, and candidate-routing time budgets.
- Added request cancellation when a new route starts or the user presses Cancel.
- Runs optional wider discovery searches concurrently.
- Checks candidate detour routes concurrently with a hard total budget.
- Removed sequential re-geocoding of curated restaurants that already have coordinates.
- Added a 36-second overall route-setup hard stop instead of indefinite loading.
- Clears stale route state before checking a newly entered route.


## v1.8 Beta
- Added Mapped, Promising, Verified DetourEats, and Curated Bucket List intelligence classifications.
- Added visible Why This Place Is Special explanations, confidence scores, evidence signals, and data gaps.
- Added a provider-neutral adapter registry for future licensed review, editorial, and forum integrations.
- Explicitly labels that no licensed live review provider is connected in this beta.
- Added conservative assessment for simple machine-readable arrival-hour schedules.
- Added filtering for closed, abandoned, removed, demolished, and disused OpenStreetMap restaurant features.
- Strengthened duplicate detection using restaurant name plus matching address or proximity within roughly 250 meters.
- Preserved additional Wikipedia, Wikidata, award, star, description, website, phone, and hours metadata.
- Added optional Field Tester Mode with recommendation and candidate audit logging.
- Added candidate-level outcome explanations and route snapshot logging.
- Added place-error reporting for closures, hours, location, duplicates, detour accuracy, and recommendation quality.
- Added JSON and CSV field-test exports and local test-data clearing.


## v1.7 Beta
- Added an always-on Exceptional Detour Override across every Eating Priority.
- Added a strict 25-mile rare-place scan even when Eat Soon remains near the route.
- Kept exceptional-only candidates out of the ordinary recommendation pool.
- Added separate potential bucket-list qualification for discovered and curated restaurants.
- Added a 45-minute maximum actual detour for exceptional-only evaluation.
- Added early and decision-point exceptional voice and browser alerts.
- Added a Rare Detour Opportunity card with Add Stop and Keep Current Plan actions.
- Added per-trip dismissal so a rejected exceptional restaurant is not announced again.
- Added a default-on preference for rare-place alerts.
- Added explicit evidence caveats for route-discovered bucket-list candidates.


## v1.6 Beta
- Replaced the fixed five-mile discovery boundary with adaptive practical, extended, and destination search tiers.
- Added evidence-supported restaurant discovery up to about 15 miles from the route for Best Overall.
- Added rare destination-candidate discovery up to about 25 miles from the route for Worth Waiting For and sparse routes.
- Kept Eat Soon focused near the route, with limited automatic widening only when options are sparse.
- Added stronger OpenStreetMap evidence requirements for wider candidates.
- Added actual-detour evaluation ceilings that vary by Eating Priority.
- Added escalating food-quality and evidence thresholds as added time and distance increase.
- Added Practical, Extended Detour, and Destination Detour labels throughout the recommendation card, timeline, route preview, and trust details.
- Added route-preview explanations of which adaptive search stages were used.
- Updated route-preview caching so changing Eating Priority recalculates the appropriate search scope.


## v1.5 Beta
- Replaced isolated 3.1-mile search circles with a continuous route corridor approximately five miles on each side.
- Increased route sampling from a maximum of 14 to 28 points.
- Added spoken recommendation alerts at approaching, soon, and decide-now stages.
- Connected browser notifications to recommendation approach events.
- Added Add Stop & Navigate with Google Maps and Apple Maps multistop handoff.
- Added remembered navigation-app preference.
- Added one-tap post-stop Worth It feedback and optional quick reasons.
- Added local preference learning for cuisine, chain/independent, stop type, local, and regional signals.
- Added learned preference fit to Detour Score while retaining quality guardrails.
- Clearly labeled foreground-only alert limitations pending native conversion.


## v1.4 Beta
- Added address and place autocomplete to Starting Point and Destination.
- Added selectable full-address, street, city, landmark, and business suggestions.
- Added keyboard, mouse, and mobile selection support.
- Added exact-coordinate routing from selected suggestions.
- Added green selected-address confirmation and search status messages.
- Added conservative debouncing, request cancellation, result limits, and browser caching.
- Preserved manual-entry fallback when autocomplete is unavailable.
- Preserved selected coordinates in recent typed trips and through route swapping.
- Fixed Recheck Route for trips that begin from a typed starting point.


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

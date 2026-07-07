# DetourEats App v1.0 Beta

This is the cleaned-up public prototype for DetourEats.com.

## What changed from v0.1

- Switched the brand direction from orange to green.
- Replaced the placeholder DE icon with a green road/fork food icon.
- Simplified the public setup screen around the core action: **Trust Us**.
- Hid simulation/debug controls behind a **Show Demo Controls** toggle.
- Kept the Detour Score prominent on the recommendation card.
- Updated app metadata, theme color, and PWA manifest.

## What it does

- Trip setup screen
- Trust Us / drive mode
- Detour Score recommendation card
- Recommendation tiers:
  - Worth the Detour
  - Best Breakfast Ahead
  - Best Stop Ahead
  - Best Available
  - Keep Driving
- Estimated arrival time by candidate
- Auto meal/daypart logic
- Open-at-arrival logic
- Skip recommendation
- Google Maps handoff
- Browser notification test
- PWA manifest and service worker

## Important limitations

This is still a prototype.

Current placeholder assumptions:
- Route position is simulated with a hidden demo slider.
- Candidate ETA assumes about 45 minutes between candidate sequence stops.
- Candidate data is seeded from test-route research.
- Restaurant hours are sample prototype hours, not verified live hours.
- Google Maps handoff opens a restaurant search, not a fully managed route waypoint flow.

Production needs:
- Real routing API
- GPS/current location
- Route polyline
- Route corridor candidate discovery
- Real ETA to each restaurant
- Real added-trip-time calculation
- Live/official hours and special hours
- Stored restaurant intelligence database
- User accounts / saved preferences
- Backend refresh jobs

## How to open locally

Unzip the folder and open `index.html` in Chrome.

## How to deploy to DetourEats.com

Upload the contents of this folder to the GitHub repo connected to Vercel, then redeploy.

If the service worker caches the old version, hard refresh the browser or unregister the service worker from DevTools.


## v0.2.3 note
The illustrated icon was replaced with a clean temporary DE mark so the live site looks stable while the final logo is still being developed.


## v0.3 focus

This version improves the product behavior without changing the live logo direction.

New / improved:
- Clearer trip states:
  - Keep Driving
  - Found Something
  - This Is Your Stop
  - Bucket List Stop
  - Best Available
- Stronger recommendation language.
- Better "why this stop" copy.
- Better fallback behavior if the recommendation engine changes.
- Cleaner handling of skipped recommendations.
- Keeps debug controls hidden from normal user flow.

Still simulated:
- Route data
- Restaurant data
- ETA / added trip time
- Live hours


## v0.3.1 fix

- Fixed candidate data not being available to the app layer in some browser deployments.
- Fixed field-name mismatches between app.js and data.js.
- Fixed issue where the app could show "Keep Driving" immediately even though prototype candidates exist.


## v0.3.2 copy fix

- Removed language implying the driver has to guess.
- Updated Best Available language to reinforce the product promise: DetourEats makes the call.


## v0.4 focus: Detour Score Engine

This version makes Detour Score more explicit and explainable.

New:
- Dedicated Detour Score engine in `engine.js`
- Richer sample route data in `data.js`
- Score components:
  - Restaurant quality
  - Trip fit
  - Added-time fit
  - Scarcity / better-option-ahead logic
- Guardrail: convenience cannot make mediocre food look elite
- Best Available rule: the app still recommends the strongest available stop when food timing matters
- Score explanation shown in the details panel

Detour Score now means:

> How good of a food decision is this stop for this traveler on this trip right now?


## v0.5: Real curated corridor

The prototype now uses actual restaurants along a manually curated
Amsterdam, NY → Myrtle Beach, SC test corridor.

Added:
- Real restaurant identities and locations
- Current published hours and menu specialties
- Verification source links
- Data-confidence labels
- Last-checked dates
- Operational warnings such as limited hours, sellout risk, or cash-only policies
- Explicit separation between verified facts and DetourEats editorial judgment

Important limitations:
- Added-trip time remains an estimate
- Arrival time remains simulated
- Route position remains manually sequenced
- Opening status is based on the simulated trip time, not live navigation
- The prototype should not be treated as live routing software


## v0.5.1: Style selector fix

The trip style now materially changes scoring:
- Hungry Soon favors earlier acceptable stops and penalizes waiting.
- Balanced weighs food quality and trip cost together.
- Food Adventure tolerates more waiting and detour time for destination-worthy food.


## v0.5.2: Hungry Soon behavior correction

- Added Park Diner & Restaurant in Binghamton as a real earlier open corridor stop.
- Hungry Soon now selects the earliest open candidate that clears a minimum quality bar.
- This is a decision rule, not merely a small scoring preference.


## v0.6: Meal urgency and route scarcity

Added:
- Meal urgency states:
  - No rush
  - Start looking
  - Eat soon
  - Stop now
- Route scarcity analysis:
  - Healthy
  - Better later
  - Limited
  - Sparse
  - Last strong option
- Decision language that explains whether to:
  - keep driving
  - eat soon
  - stop now
- Trip-context panel showing urgency and route outlook


## v0.6.1: Urgency consistency fix

- Hungry Soon now forces meal urgency to at least Eat Soon.
- Food Adventure can reduce urgency when the user is willing to wait for a stronger stop.
- Trip Context now shows which style was applied.


## v0.7: Preferences and adaptive skipping

Optional trip preferences:
- Quick stop, sit-down meal, or either
- Anything good, local favorite, or regional specialty
- Avoid chains, chains as fallback, or allow all
- Inexpensive-stop preference
- Easy family-stop preference

Skip now asks why and changes the next decision:
- Too far tightens the detour limit
- Not hungry yet pushes recommendations later
- Wrong cuisine excludes that cuisine
- Too expensive enables budget mode
- Need something faster prioritizes quick stops
- Show me something better raises the minimum Detour Score

The Trip Context panel shows active preferences and the latest adjustment.


## v0.8: Driver Mode and decision timing

Added:
- Simulated route progress bar and remaining-trip estimate
- Next strong food-zone indicator
- Decision countdown for the current recommendation
- Cleaner at-a-glance recommendation card
- High, medium, and timing-risk confidence indicators
- Tell Me Why control with scoring and verification details hidden by default
- Find Something Faster control that immediately applies quick-stop logic
- Smaller Detour Score treatment so the driving decision leads the screen

Important:
- Route progress, remaining time, and decision countdown remain prototype estimates.
- Live GPS, exits, traffic, and route calculations are planned for a later version.


## v0.8.1: Eating Priority and Eat Sooner fix

Changes:
- Renamed Style to Eating Priority
- Renamed options:
  - Best overall
  - Eat soon
  - Worth waiting for
- Added Eating Priority controls directly to Driver Mode
- Replaced Find Something Faster with Eat Sooner
- Eat Sooner no longer skips the current stop automatically
- Eat Sooner now selects the earliest open restaurant that clears the quality bar
- If two candidates are at the same route position, the smaller estimated detour wins


## v0.9: Decision Consequences

This version adds visible product functionality without requiring any outside API or account.

New:
- Stop Here versus Skip and Wait comparison
- Name and score of the next qualifying restaurant
- Estimated wait until the next option
- Clear indication when the next option is stronger, weaker, or similar
- Route-outlook states:
  - Another option is close
  - Stronger option later
  - Current stop is stronger
  - Long gap ahead
  - Weak stretch ahead
- Decision messaging now considers the consequence of skipping
- Trip preferences are remembered on the same browser

The route timing is still simulated, but the new logic changes the recommendation explanation and gives the driver a concrete reason to stop or wait.


## v1.0 Beta: one combined route-intelligence update

This update combines the planned route timeline, food zones, real device location,
automatic progress, passed-stop removal, and live route calculations.

### Works immediately

- Trip timeline with the next six qualifying stops
- Best decision now
- Best option if the traveler waits
- Reasonable backup
- Food-zone summaries
- Long-gap and weak-stretch warnings
- Current preferences and adaptive skipping
- Full curated demo fallback

### Use My Location beta

After the traveler selects **Use My Location** and grants browser permission:

- Current GPS coordinates become the trip origin
- The destination and restaurant addresses are located
- A real driving route is calculated
- Each restaurant is tested as a route waypoint
- Added trip time, drive time ahead, ETA, route order, and decision timing update
- Restaurants behind the driver or far outside the corridor are removed
- The route refreshes after roughly two miles of movement or five minutes
- No account, API token, or paid service is required

### Prototype service limitation

The no-account beta uses the public OpenStreetMap Nominatim geocoder and the
public Project OSRM routing server. Requests are cached and controlled, and the
app automatically returns to the curated route if either service is unavailable.

These public endpoints are appropriate for prototype testing, not a production
navigation service-level agreement. A production release should eventually use
a dedicated hosted geocoder/routing provider or a self-hosted service.

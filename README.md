# DetourEats App v1.8.12 Restaurant Snapshot Cleanup

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


## v1.1 Beta: Score and Trust

This version makes Detour Score one of the primary driver-facing elements.

Added:
- Large Detour Score display on the main recommendation card
- Plain-English score meaning
- Direct comparison with the next qualifying stop
- Food, Trip Fit, and Time Fit shown without opening details
- Trust Snapshot showing:
  - live or curated route mode
  - restaurant-data confidence
  - open-at-arrival status
  - last verification date
  - operational warnings
- More prominent Detour Scores in the trip timeline
- Recheck Route button during live-location trips

The full six-factor score breakdown remains available under Tell Me Why.


## v1.2 Beta: Restaurants for Any Route

When live location is active, DetourEats now searches the driving corridor for
OpenStreetMap food venues rather than relying only on the Amsterdam-to-Myrtle
Beach curated database.

### New route-discovery behavior

- Samples food zones across the current route
- Searches for restaurants, fast-food venues, and cafes near those zones
- Distributes candidates across the trip instead of concentrating near one city
- Combines route-discovered options with curated DetourEats recommendations
- Removes duplicates and restaurants that create excessive backtracking
- Uses actual route-through-restaurant calculations before recommending a stop
- Identifies common chains from available brand/name metadata
- Captures cuisine, address, website, phone, published hours, and source links when available
- Caches discovery results for six hours to reduce public-service load

### Trust and scoring guardrails

Every recommendation is labeled:

- **Curated**: reviewed for the DetourEats test database
- **Route-discovered**: found automatically from OpenStreetMap along the current route

Route-discovered options use conservative quality estimates and cannot receive
an elite Detour Score. Medium-confidence discovery options are capped at 86;
lower-confidence options are capped at 81. Hours are shown as unverified unless
they have been independently evaluated against arrival time.

### Fallback

If route discovery is unavailable, live routing continues with relevant curated
stops. If live routing also fails, the full curated demo remains available.


## v1.3 Beta: Choose Any Trip

The app is no longer functionally tied to Amsterdam, New York, or Myrtle Beach.

### New trip setup

- Enter any U.S. starting city, address, or landmark
- Enter any U.S. destination
- Use current device location as the starting point
- Swap typed origin and destination
- Select example routes for quick testing
- Reuse up to five recent trips
- Clear recent-trip history from the setup screen

### Route preview

Before Driver Mode starts, DetourEats now verifies the selected trip and shows:

- Resolved origin and destination
- Approximate drive time
- Approximate driving distance
- Number of route-relevant food options
- Route-discovered versus curated option count

Selecting **Trust Us** automatically performs the preview when needed, so the
preview button is optional.

### Accuracy and fallback behavior

A typed route uses the same live beta geocoding, routing, corridor discovery,
detour calculations, and score guardrails as a current-location route.

For arbitrary routes, DetourEats no longer silently substitutes the old
Amsterdam-to-Myrtle Beach curated corridor. If a route cannot be verified, the
app stays on setup and explains that the locations should be checked.


## v1.4 Beta: Address Search

Both Starting Point and Destination now support type-ahead place search.

### Search behavior

- Suggestions begin after three characters
- Searches wait briefly while the user types instead of querying on every keystroke
- Up to six U.S. matches are shown
- Results can include:
  - full addresses
  - streets
  - cities and towns
  - landmarks
  - named businesses and places
- Keyboard controls:
  - Up/Down selects a suggestion
  - Enter confirms it
  - Escape closes the list
- Mobile users can tap a suggestion
- The selected result stores exact longitude and latitude for route calculation
- Selected addresses show a green confirmation state
- Manual text entry remains available as a fallback
- Recent trips retain selected endpoint coordinates when available

### Prototype provider

Autocomplete uses the public Photon demo service with conservative request
controls, aborted superseded searches, and 24-hour browser caching. It does not
require an account or API token.

Photon is appropriate for beta testing but does not provide an availability
guarantee. A production release should use a dedicated hosted or self-hosted
autocomplete service.


## v1.5 Beta: Seamless Driver Loop

### Continuous restaurant-search corridor

v1.4 searched within 5,000 meters of isolated route samples. v1.5 replaces
those separate circles with an Overpass polyline search covering a continuous
8,000-meter corridor on either side of the sampled route.

The app now:

- Samples the route more densely, up to 28 route points
- Searches continuously along the lines connecting those points
- Looks approximately five miles to either side of the route
- Still calculates the actual route through every shortlisted restaurant
- Still rejects excessive added time and backtracking

The eight-kilometer discovery corridor is only the initial candidate search.
A restaurant is not recommended solely because it falls inside that corridor.

### Voice and approach alerts

- Voice guidance can be enabled with one tap
- Strong recommendations can trigger around 20 minutes, 5 minutes, and the immediate decision point
- System notifications use the same route events when permission is granted
- Duplicate announcements for the same restaurant and stage are suppressed

These alerts require the browser/PWA to remain active. Reliable locked-screen
and background monitoring still requires the planned native-app conversion.

### Add Stop and Navigate

The primary action now opens Google Maps or Apple Maps with the recommended
restaurant inserted before the original destination. The user's navigation
choice can be remembered.

### Preference learning

After a navigation handoff, DetourEats can ask:

**Was this stop worth the detour?**

Positive and negative ratings update a local preference profile for cuisine,
chains versus independent places, quick versus sit-down stops, local favorites,
and regional specialties. Learned preferences influence preference fit without
overriding food-quality and route-fit guardrails.


## v1.6 Beta: Worth the Detour

The five-mile route corridor is no longer a hard discovery boundary.

### Adaptive search tiers

DetourEats now searches in stages:

- **Practical corridor:** approximately five miles from the route
- **Extended discovery:** promising restaurants up to approximately 15 miles from the route
- **Destination discovery:** rare, stronger-evidence candidates up to approximately 25 miles from the route

The Eating Priority controls the strategy automatically:

- **Eat soon** searches the practical corridor first and widens only when the route is sparse
- **Best overall** includes evidence-supported extended detours
- **Worth waiting for** also checks the destination tier
- Sparse routes can trigger a wider search without requiring the user to change settings

### Quality requirements rise with detour cost

A wider restaurant is not recommended merely because it was discovered.

As route distance and actual added drive time increase, the scoring engine raises
the food-quality and evidence threshold. Weak farther-away options receive a
score penalty and a hard score ceiling.

Route-discovered destination candidates require stronger OpenStreetMap evidence,
such as Wikipedia/Wikidata references, award or star tags, a website plus a
description, or a combination of other useful metadata. This is still not a
substitute for independent food reviews, so the app labels the evidence level
and retains conservative score caps.

### Candidate routing allowances

The route service can now evaluate farther candidates before scoring:

- Eat soon: generally up to about 25 added minutes
- Best overall: generally up to about 50 added minutes
- Worth waiting for: generally up to about 75 added minutes

These are evaluation ceilings, not automatic recommendations. The user's
selected Max Added Time remains a major scoring input, and farther candidates
must demonstrate a stronger reason to justify the trip cost.


## v1.7 Beta: Exceptional Detour Override

A strict rare-place scan now runs on every route regardless of the selected
Eating Priority.

### Separate from the normal recommendation

The exceptional override does not replace the ordinary DetourEats decision.

While using **Eat soon**, for example:

- The main recommendation can remain a convenient nearby stop
- A separate rare-opportunity card can identify a potential bucket-list place
- The driver chooses **Add Stop** or **Keep Current Plan**
- Dismissing it prevents another alert for that restaurant during the trip

### Strict qualification

The rare-place scan checks up to approximately 25 miles from the route.

A route-discovered candidate must have strong available map evidence, no
common-chain classification, high destination-worthiness, meaningful
uniqueness, acceptable estimated food reputation, no closed-at-arrival signal,
and no more than 45 minutes of actual added trip time.

Curated candidates use a separate high food-quality, uniqueness, and
destination-worthiness threshold.

### Alert timing

An exceptional opportunity can produce:

- an early rare-place alert within approximately 45 minutes of the route decision
- a final decision alert within approximately 5 minutes

Voice, browser notifications, and the on-screen alert use the same opportunity.
The normal recommendation remains active unless the user selects **Add Stop**.

### Evidence limitation

For route-discovered restaurants, exceptional means the candidate cleared a
strict available-data threshold. It does not mean DetourEats independently
verified national reputation, awards, food quality, or operating hours.


## v1.8 Beta: Restaurant Intelligence & Field Testing

### Intelligence classifications

Every restaurant is now classified as one of:

- **Mapped restaurant**: route and identity data are available, but food quality is not verified
- **Promising restaurant**: stronger map metadata and destination signals are present
- **Verified DetourEats recommendation**: manually curated with a traceable source
- **Curated bucket-list place**: curated food quality, uniqueness, and destination-worthiness clear a higher threshold

Each recommendation displays:

- why the place appears special
- intelligence confidence
- signals used
- known data gaps
- arrival-hours status
- source summary
- whether licensed live review feeds are connected

### No fabricated review data

This beta does not invent ratings or scrape review platforms. It uses:

- the curated DetourEats dataset
- OpenStreetMap business metadata
- live route calculations
- user feedback
- field-test reports

A provider-neutral adapter registry is included for future licensed Google,
Tripadvisor, Yelp, editorial, or forum data sources.

### Stronger business hygiene

- Filters common OpenStreetMap lifecycle tags for closed, abandoned, removed,
  demolished, or disused restaurant features
- Merges same-name records only when the address matches or coordinates are
  within approximately 250 meters
- Preserves mapped Wikipedia, Wikidata, award, star, description, website,
  hours, and phone metadata for intelligence analysis
- Stores arrival timestamps for conservative schedule assessment

### Field tester mode

Optional Field Tester Mode records:

- route and active settings
- selected normal recommendation
- exceptional opportunity
- up to 30 evaluated candidates
- Detour Score
- added minutes
- intelligence classification and confidence
- candidate outcome or rejection explanation
- place issue reports

Test data can be exported as JSON or candidate-level CSV. It remains stored
locally in the browser until cleared.

### Hours limitation

The beta evaluates only simple machine-readable OpenStreetMap schedules and
24/7 listings. It labels those results as schedule-based rather than verified.
Holiday changes, sellouts, temporary closures, and timezone transitions remain
explicit data gaps.


## v1.8.1 Hotfix: Route Correctness and Responsiveness

### Fixed unrelated restaurant fallback

A successful live route with zero completed restaurant candidates previously
changed the app back to demo mode. That allowed the global curated test list to
appear on unrelated routes, including Virginia restaurants on a New York to New
Hampshire trip.

The app now remains in live-route mode whenever the route itself succeeds.
Zero candidates means zero route-verified recommendations. It never substitutes
the old national demo list.

### Faster failure and cancellation

- Geocoding requests time out after approximately 8 seconds
- Main route requests time out after approximately 9 seconds
- Restaurant discovery tiers have strict 5.5 to 8.5 second budgets
- Optional extended and exceptional searches run concurrently
- Candidate detour routes are checked with five concurrent workers
- Candidate routing has a total approximately 13-second budget
- The full setup has a 36-second hard stop
- The user can cancel an active route check
- Starting a new check cancels old in-flight requests

### Cleaner setup

The three prepopulated example-trip buttons were removed. Previously saved
copies of those exact sample trips are also removed from Recent Trips.
User-created recent trips remain available.


## v1.8.2: Route Pipeline Repair

This version replaces the previous single-query, exact-route-only workflow.

### Segmented restaurant discovery

- The route geometry is split into approximately 30-mile practical search sections
- Extended and exceptional searches use larger, lower-count sections
- Up to three practical sections and two optional sections are checked concurrently
- Each section is cached independently
- Failed sections do not erase successful sections
- A failed restaurant service is explicitly different from a legitimate zero result
- Current public Overpass endpoints are rotated by section

### Actual distance to the route

Restaurant distance is calculated to the nearest point on the route polyline,
not merely to one of a few sampled route points. The projection also provides
route progress and route-distribution buckets.

### OSRM matrix screening

Up to 20 shortlisted restaurants are screened in one OSRM Table request using:

- origin to restaurant duration and distance
- restaurant to final destination duration
- baseline trip duration
- calculated added trip time

Only the strongest and most geographically distributed candidates receive
individual exact route-through checks.

### Exact-route fallback behavior

If an individual exact route check times out, the restaurant is retained with a
clearly labeled matrix-estimated added time. It is no longer silently discarded.

### Search-result states

The interface distinguishes:

- restaurant search unavailable
- no mapped restaurants returned
- restaurants found but route timing unavailable
- restaurants found but none met active limits
- partial results retained
- restaurants found and routed

### Demo removal

All remaining demo controls were removed. The global curated restaurant list is
only used as a source pool for route-relevance filtering and can never appear as
a standalone fallback route.


## v1.8.3: Business Status Validation

### Shaker Mill Tavern correction

The former Shaker Mill Tavern restaurant listing in West Stockbridge,
Massachusetts is blocked by a confirmed status override. Shaker Mill Inn remains
a separate lodging identity and is not treated as the same business.

### Current-operation validation

OpenStreetMap queries now request edit timestamps and metadata. Before a mapped
restaurant can reach route screening, DetourEats checks:

- explicit closed, removed, demolished, abandoned, and disused tags
- confirmed status corrections
- local tester reports
- `check_date`, opening-hours check date, survey date, source date, and map edit date
- mapped hours, phone, website, and social contact signals

Records more than six years old with no current operating signal are suppressed.

### Operational confidence

Allowed route-discovered restaurants receive high, medium, or low operational
confidence. Low-confidence records cannot trigger exceptional-place alerts and
their Detour Score is capped below the normal automatic-alert threshold.
Medium-confidence records receive a conservative score ceiling.

### Persistent local corrections

A tester report of Closed, Wrong Location, or Duplicate now hides the listing
immediately on that device. Local suppressions are included in JSON field-test
exports and applied to future routes.


## v1.8.4: Search Reliability and Cleaner Driver Status

Restaurant discovery now uses compact waypoint circles rather than broad
around-polyline route tubes. Practical points are spaced roughly 20 miles
apart, and no practical public-map request contains more than two points.
Concurrency is lower to reduce throttling.

Normal drivers see a simple route-ready summary. Raw mapped records, failed
sections, exact routes, and matrix estimates appear only in Field Tester Mode.
A partial search with at least five qualified options is treated as route-ready.


## v1.8.5: Short Route Restaurant Fallback

Trips shorter than approximately 40 miles now use a dedicated local restaurant
search rather than the long-route segmented workflow.

The short-route search checks compact origin, midpoint, and destination areas,
retries Overpass through multiple servers using POST and GET, and uses a bounded
Nominatim fallback when Overpass is unavailable or sparse. Fallback results are
restricted to the actual route corridor and still pass business-status,
duplicate, matrix, and exact-detour validation.


## v1.8.6: Route Verification Fix

The short-route fallback previously ran three bounded local searches
sequentially. When the primary restaurant provider failed, those requests could
exceed the overall route setup timeout. The app then reported that it could not
verify the route even though the driving route had already been calculated.

This release runs local fallback categories concurrently, preserves a verified
driving route when restaurant discovery fails, and separates driving-route
validity from restaurant-provider availability.


## v1.8.7: Full Repository Sync

This package consolidates all current features and fixes into one complete
repository upload. Cache-busted asset references and an updated service worker
prevent older partially uploaded builds from continuing to run.

The deployed page shows `DetourEats v1.8.8` at the bottom for verification.


## v1.8.8: Unified Closure Validation

The short-route Nominatim fallback previously created restaurant candidates
without passing them through the same known-closure and local-suppression layer
used by the main OpenStreetMap discovery path.

This release:

- blocks G's Famous Lemon Cookies at 44 Main Street in Amsterdam
- applies confirmed closure overrides to both main and fallback providers
- applies locally reported closed, duplicate, and wrong-location suppressions
  to fallback candidates
- preserves conservative operational-confidence fields after validation
- cache-busts every deployed application asset to v1.8.8


## v1.8.9: Hardened Closure Validation

This release closes the remaining path that allowed confirmed closed businesses
to survive when provider records used a name variation, omitted the city, or
were already present in an active candidate session.

Key changes:

- matches unique confirmed-closure name fragments, including provider suffixes
- missing provider city or address data no longer bypasses a confirmed closure
- filters curated, discovered, merged, session, route-screened, snapshot, and
  rendered candidates
- invalidates the previous discovery cache
- preserves active restaurants while removing confirmed closed listings


## v1.8.10: Confirmed Closure Correction

The live G's Famous Lemon Cookies record uses `44 E Main St`, while the
previous override compared it against `44 Main`. The name matched, but the
provider address variation incorrectly vetoed the confirmed closure.

This release:

- treats the unique normalized name `G's Famous Lemon Cookies` as authoritative
- blocks punctuation, apostrophe, capitalization, and suffix variations
- no longer allows city or address formatting to override this confirmed closure
- invalidates the prior restaurant discovery cache
- tests the exact live `44 E Main St` record through final filtering and routing


## v1.8.11: Routing Provider Failover

The app previously depended on a single public OSRM endpoint. When that
endpoint was offline or overloaded, valid selected locations produced a
generic route-verification failure.

This release:

- adds automatic failover from Project OSRM to FOSSGIS OpenStreetMap Routing
- remembers the successful provider for subsequent matrix and exact-route calls
- distinguishes routing-provider outages from invalid locations
- exposes the active routing provider in route metrics
- blocks confirmed-closed Creek Stone in Amsterdam
- invalidates the previous discovery cache


## v1.8.12: Restaurant Snapshot Cleanup

- Corrects `Dair Circus` to `Dairy Circus`.
- Replaces raw map descriptions and company marketing copy with concise,
  structured restaurant snapshots.
- Keeps curated signature dishes and editorial summaries intact.
- Documents that the internal `balanced` value is the visible
  `Eating priority: Best overall` option.
- Invalidates the previous restaurant discovery cache.

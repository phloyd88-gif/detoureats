# Changelog

## v2.0.2 — Eligibility Rescue and Denser Route Scan

- Adds a final hard-eligibility safety net so **Keep driving** cannot appear while a forward, non-backtracking, non-closed restaurant remains.
- Moves quick-stop, sit-down, cuisine, price, and related preferences fully into ranking instead of hard filtering.
- Preserves hard exclusions for skipped places, behind-route candidates, backtracking, confirmed closure, closed-at-arrival status, and explicit **Never show chains**.
- Adds eligibility diagnostics for usable, independent, closed, behind-route, backtracking, and chain-excluded candidates.
- Increases Google route sampling from four points to as many as seven.
- Front-loads route samples in **Eat soon** mode so nearby independent restaurants are checked earlier.
- Increases Google route candidates per sample and extends the discovery timeout.
- Resets browser and service-worker caches for the corrected eligibility logic.

## v2.0.1 — Best-Available Results Guardrail

- Prevents preference combinations from producing a false **Keep driving** screen when an open, forward, route-safe restaurant exists.
- Adds a general best-available fallback that relaxes cuisine and stop-style preferences while preserving safety, direction, closure, skipped-place exclusions, and an explicit **Never show chains** setting.
- Changes the default chain behavior to **Prefer independents**: independent restaurants lead, but a chain can appear rather than returning no result.
- Migrates the previous hard `Avoid chains` default to the new independent-first behavior for existing browser users.
- Reserves **Keep driving** for cases where no open, forward restaurant is actually available in the checked route window.
- Replaces misleading `qualified` and `quality bar` language with `route-fit` and factual availability messages.

## v2.0.0 — Results and Driver Interface Rebuild

### Restaurant discovery

- Added `api/route-places.js` for server-side Google Places discovery around sampled route points.
- Merged Google Places and OpenStreetMap candidates before route screening.
- Added Google place IDs, categories, review counts, business status, city, price level, and mapped hours to discovery records.
- Increased the evidence shortlist from five to eight candidates and diversified it across score, proximity, and route position.
- Preserved public-map fallback behavior when Google route discovery is unavailable.

### Food evidence and ranking

- Place Details now uses a known Google place ID whenever available instead of repeating fuzzy text matching.
- Tightened fallback business-identity matching.
- Parallelized shortlisted evidence requests.
- Reduced the influence of tiny or low-confidence rating samples by shrinking the Food score toward a neutral baseline.
- Requires repeated mentions before labeling a food theme or concern as recurring.
- Added Google regular-hours evaluation at the candidate’s expected arrival time.
- Added evidence confidence and review-backed status as ranking tie-breakers.
- Applies a modest provisional-data penalty when multiple review-backed alternatives are available.
- Reset the review-evidence cache.

### Interface

- Rebuilt Drive Mode around one compact recommendation card.
- Added a fixed bottom action bar with **Add Stop**, **Skip**, **Why**, and **More**.
- Moved detailed evidence to a **Why** bottom sheet.
- Moved secondary trip controls to a **More** bottom sheet.
- Converted Road Ahead to a horizontal, swipeable, selectable carousel.
- Removed automatic page jumping when a Road Ahead alternative is selected.
- Collapsed Drive Readiness on the setup screen.
- Added a visible **Checking strongest options** state and temporarily disables **Add Stop** while live evidence is resolving.
- Reduced routine diagnostic text in normal Drive Mode.

### Branding and mobile behavior retained

- Preserved the approved DetourEats road-and-fork logo and installed-app icons.
- Preserved PWA installation, safe-area handling, wake lock, offline notices, and service-worker notifications from v1.9.6–v1.9.7.

## v1.9.7

- Added the approved DetourEats logo throughout the app and installed-app assets.

## v1.9.6

- Added installable PWA behavior, Drive Readiness, wake lock, offline notices, and mobile safe-area improvements.

## v1.9.5

- Added city and food-focus information, removed duplicate rating display, and clarified added driving time.

## v1.9.4

- Corrected Road Ahead time-gap calculations and soft-fallback behavior after **Wait for something better**.

## v1.9.3

- Added skip-reason integrity checks and labeled best-available fallbacks.

## v1.9.2

- Added a neutral **Other** skip reason, clickable Road Ahead choices, and in-place skip reasons.

## v1.9.1

- Improved closure handling and condensed review-backed evidence copy.

## v1.9.0

- Added the server-side Google/Yelp/optional Reddit restaurant-evidence framework and review-backed Food scoring.

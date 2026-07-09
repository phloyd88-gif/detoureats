# DetourEats v2.0.2

## v2.0.2 route-availability correction

Version 2.0.2 fixes the false **Keep driving** condition at the eligibility layer. DetourEats now has a second, independent safety-net pass that keeps the strongest usable restaurant visible whenever any forward, non-backtracking, non-closed option exists. Quick versus sit-down, cuisine, price, and similar choices affect ranking rather than deleting the candidate pool.

The route discovery scan is also denser and more front-loaded. Long routes now check up to seven Google route points, including several near the beginning of the trip, so **Eat soon** is less likely to miss nearby independent restaurants.

## What changed in v2.0.2

### Availability and fallback integrity

- Added an engine-level hard-eligibility diagnostic pass.
- Added an app-level final safety net so a usable restaurant cannot disappear because of a scoring or preference mismatch.
- Preserved hard exclusions only for skipped places, behind-route options, backtracking, confirmed closures, closed-at-arrival results, and an explicit **Never show chains** setting.
- Removed quick-stop, sit-down, cuisine, and similar preference checks from the hard candidate filter.
- Allows extended or exceptional route candidates to become the best-available fallback when no ordinary option survives.
- Keeps independent restaurants first under **Prefer independents** without requiring a chain fallback.

### Denser route discovery

- Increased Google route sampling from four points to as many as seven.
- Added early-route samples for **Eat soon** mode.
- Increased the per-route Google candidate request limit while retaining OpenStreetMap fallback discovery.
- Extended the route-discovery timeout to accommodate the denser scan.

### Existing v2.0 interface retained

- Compact driver card and fixed bottom controls.
- Selectable horizontal Road Ahead carousel.
- Review-backed Food scoring and Google Places identity matching.
- Approved DetourEats branding and installable PWA behavior.

## Data flow

1. Build the baseline driving route.
2. Sample several points along the route.
3. Discover restaurants through Google Places and OpenStreetMap.
4. Remove closures, duplicates, off-route places, and backtracking options.
5. Calculate or estimate route-through added driving time.
6. Research a geographically and competitively diverse shortlist.
7. Combine food evidence with trip fit to make the recommendation.

## Required configuration

The existing Vercel environment variable is still used:

```text
GOOGLE_PLACES_API_KEY
```

The key must allow **Places API (New)**. No new variable is required for v2.0.2.

Optional integrations remain supported:

```text
YELP_API_KEY
REDDIT_ENABLED
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT
```

See `API_SETUP.md` for details.

## Important limitations

- Results still depend on third-party map, routing, hours, and review data. No automated recommendation system can guarantee that every listing or hour is current.
- Google supplies only a limited review sample through the Places API, so the app can identify recurring signals only within the evidence returned.
- Public routing services do not provide dependable live traffic. **Added driving time** is route-based driving impact and excludes eating, parking, and waiting.
- DetourEats must remain open for dependable browser-based location monitoring and alerts. True locked-screen background tracking requires the later native-app release.
- New routes require an internet connection.

## Local use

The static interface can be opened from `index.html`, but Vercel serverless functions and live API calls require a deployed environment or an appropriate local Vercel development setup.

## Deployment

Use the complete ZIP as a repository-root replacement. See `DEPLOYMENT.md`.

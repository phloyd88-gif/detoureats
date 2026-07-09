# DetourEats v2.0.0

DetourEats recommends worthwhile food stops along a live driving route. Version 2.0.0 is a structural results-and-interface release: it improves which restaurants enter the candidate pool, waits for review evidence before enabling the primary decision, and replaces the long scrolling recommendation page with a compact driver-oriented layout.

## What changed in v2.0.0

### Stronger and more consistent results

- Google Places now supplements OpenStreetMap during restaurant discovery along the route. Previously, Google was used only after a map candidate had already been found.
- Google and OpenStreetMap candidates are merged, deduplicated, screened against the route, and ranked together.
- The app evaluates a diversified shortlist of up to eight candidates rather than researching only the first few provisional winners.
- Google place IDs are carried directly into the evidence request, reducing false identity matches.
- Review-backed Food scores are shrunk toward a neutral baseline when evidence is thin.
- Food themes and concerns are described as repeated only when they appear more than once in the available review text.
- Google operating hours can update open-at-arrival status when sufficient hours data is returned.
- When at least two review-backed choices exist, an incomplete provisional map listing cannot win solely because it is convenient.
- Review evidence requests run in parallel, reducing the chance that one slow restaurant blocks the entire result set.

### Cleaner driver interface

- The recommendation is condensed into one primary card with restaurant, city, food focus, score, rating, added driving time, and the main decision reason.
- Primary actions remain fixed at the bottom of the screen: **Add Stop**, **Skip**, **Why**, and **More**.
- **Why** opens the detailed evidence in a bottom sheet instead of extending the page.
- **More** opens trip tools in a bottom sheet.
- **Road Ahead** is a horizontal, swipeable list of selectable alternatives.
- Drive Readiness is collapsed on the setup screen until needed.
- The app does not automatically jump the page when a Road Ahead option is selected.
- While the strongest candidates are still being checked, **Add Stop** is temporarily disabled and the app shows **Checking strongest options**.

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

The key must allow **Places API (New)**. No new variable is required for v2.0.0.

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

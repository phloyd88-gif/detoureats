# DetourEats Review Evidence Setup

DetourEats v1.9.5 includes a Vercel Function at:

`/api/restaurant-evidence`

API keys stay in Vercel environment variables. Never place keys in browser
JavaScript, GitHub, or any file served directly to users.

## Google Places

Environment variable:

`GOOGLE_PLACES_API_KEY`

Create or select a Google Cloud project, enable Places API (New), attach a
billing account, create an API key, and restrict it to Places API (New).

The integration requests ratings, rating count, limited review data, business
status, place identity, and source links. Google bills according to the highest
requested Places field tier.

Official documentation:

- https://developers.google.com/maps/documentation/places/web-service
- https://developers.google.com/maps/documentation/places/web-service/data-fields

## Yelp

Environment variable:

`YELP_API_KEY`

The Base plan can provide ratings, review count, business identity, and closure
status. Review excerpts require an Enhanced or Premium Yelp Places plan. The
code automatically falls back to rating-only evidence if review excerpt access
is denied.

Official documentation:

- https://docs.developer.yelp.com/docs/places-intro
- https://docs.developer.yelp.com/docs/plans

## Reddit forum evidence

Reddit is optional and disabled by default.

Environment variables:

- `REDDIT_ENABLED=true`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`

Do not enable the Reddit adapter until Reddit approves and registers DetourEats
for external Data API use. Reddit requires OAuth, an identifiable User-Agent,
and compliance with its Developer Terms, Data API Terms, and Responsible
Builder Policy.

Official documentation:

- https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki
- https://www.reddit.com/dev/api/oauth/

## Add environment variables in Vercel

1. Open the `detoureats-live` Vercel project.
2. Open **Settings**.
3. Open **Environment Variables**.
4. Add each key for Production, Preview, and Development as needed.
5. Save.
6. Redeploy the latest production deployment.

The browser caches normalized restaurant evidence for seven days to limit
repeat API calls. Use a new incognito session or clear site storage after adding
or changing credentials.

## Scoring

When review evidence is ready, the Food score uses:

- 50% Bayesian-adjusted star rating
- 25% food-specific review sentiment
- 15% cross-source and review consistency
- 5% review recency
- 5% available forum evidence

Unavailable components are omitted and the remaining weights are normalized.

The visible Best overall Detour Score then uses:

- 64% Food score
- 36% Trip fit

Without a confident provider match, the existing map-based provisional Food
estimate remains active and is labeled accordingly.

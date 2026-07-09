# DetourEats API Setup — v2.0.3

## Required: Google Places

DetourEats uses one server-side key for two functions:

- `api/route-places.js` discovers stronger restaurant candidates near sampled points along the route.
- `api/restaurant-evidence.js` retrieves rating, review, category, business-status, and hours evidence for shortlisted restaurants.

### Vercel variable

```text
GOOGLE_PLACES_API_KEY
```

The variable should be enabled for **Production** and **Preview**. The Google Cloud key should be restricted to **Places API (New)**.

Do not place the key in browser JavaScript, GitHub, screenshots, or chat messages.

### No additional Google setup for this release

If review-backed Google results already worked in v1.9.7, the same key should work in v2.0.3. Redeploying the repository is sufficient.

### Usage monitoring

Because v2.0.3 adds Google-powered route discovery, it can make more Places requests than earlier releases. During beta testing:

- Enable a Google Cloud billing budget and alerts.
- Review Places API usage after several test routes.
- Keep the API key restricted to Places API (New).
- Do not expose the key to the client.

## Optional: Yelp

```text
YELP_API_KEY
```

When configured, Yelp can contribute rating and review-count evidence. Review excerpts depend on the access level available to the Yelp account. The app continues to work without Yelp.

## Optional: Reddit

```text
REDDIT_ENABLED=true
REDDIT_CLIENT_ID
REDDIT_CLIENT_SECRET
REDDIT_USER_AGENT
```

Reddit remains disabled unless all required credentials are present and `REDDIT_ENABLED` is set to `true`. Only use this integration under an approved and compliant Reddit API setup.

## Troubleshooting

### Cards remain provisional

- Confirm `GOOGLE_PLACES_API_KEY` exists in the same Vercel project serving the site.
- Confirm it is enabled for Production.
- Redeploy after changing an environment variable.
- Confirm Places API (New) is enabled in the Google Cloud project.
- Check the Vercel Function logs for `restaurant-evidence` or `route-places` errors.

### Route discovery works but review evidence does not

The Places key may be valid while a field, quota, billing, or restriction issue blocks the more detailed Place Details request. Check the Vercel Function log and Google Cloud API metrics.

### Old interface remains visible

Confirm the footer reads `DetourEats v2.0.3`, then use a private window or remove and reinstall the home-screen app.

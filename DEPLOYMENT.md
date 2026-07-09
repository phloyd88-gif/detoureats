# Deploy DetourEats v2.0.4

This package is a complete replacement for the current DetourEats GitHub repository contents.

## Upload

1. Extract the ZIP on your computer.
2. Open the GitHub repository connected to the DetourEats Vercel project.
3. Upload every extracted file and folder to the repository root, replacing existing versions.
4. Confirm that `index.html` is directly in the repository root, not inside an extra folder.
5. Confirm that both serverless functions are present:
   - `api/restaurant-evidence.js`
   - `api/route-places.js`
6. Commit the changes.
7. Wait for the Vercel deployment to show **Ready**.
8. Open DetourEats in a new private/incognito window.
9. Confirm the footer reads `DetourEats v2.0.4`.

The existing `GOOGLE_PLACES_API_KEY` environment variable remains in Vercel. It does not need to be entered again.

## Files and folders that must be present

```text
api/
  restaurant-evidence.js
  route-places.js
assets/
icons/
address-search.js
app.js
data.js
engine.js
index.html
live-route.js
manifest.webmanifest
place-status.js
restaurant-intelligence.js
review-evidence.js
service-worker.js
styles.css
```

## First test

1. Run a route with several plausible restaurant towns along the way.
2. Wait while the banner says **Checking strongest options**.
3. Confirm **Add Stop** becomes available after the evidence pass finishes.
4. Confirm the main recommendation shows its city and a clear **Known for** or **Food type** line.
5. Swipe through **Road Ahead** and select an alternative.
6. Open **Why** and confirm the detailed review evidence appears in a bottom sheet.
7. Open **More** and confirm the trip tools appear without requiring a long page scroll.
8. Test **Skip** and verify the replacement makes sense for the reason selected.

## Cache handling

Version 2.0.4 uses new JavaScript/CSS query strings and a new service-worker cache. Road Ahead is now a non-scrolling full-width row list on phones. It also migrates the former hard chain default to independent-first fallback behavior. A private window is still recommended for the first test. If an installed home-screen app remains stale, remove it and install it again.

## Google usage note

This version uses Google Places during route discovery as well as during review-evidence lookup. It can therefore make more Google Places requests than v1.9.7. Keep billing budgets and usage alerts enabled in Google Cloud while testing.

## Rollback

To roll back, restore the prior repository commit in GitHub and redeploy it from Vercel. Environment variables do not need to be changed.

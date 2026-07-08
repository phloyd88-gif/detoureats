# DetourEats Complete Repository Upload

This package is a complete replacement for the current GitHub repository files.

## Upload exactly this way

1. Open the GitHub repository.
2. Delete the current app files and the existing `icons` folder.
3. Extract this ZIP on your computer.
4. Upload every extracted file and the `icons` folder together.
5. The repository root must directly contain `index.html`.
6. Commit the upload and wait for Vercel to finish deploying.
7. Open the site and scroll to the bottom.

A successful deployment displays:

`DetourEats v1.9.3`

If that version is not visible, the live site is still serving older files or
the package was uploaded inside an extra folder.

## Files that must be present

- index.html
- styles.css
- data.js
- engine.js
- place-status.js
- live-route.js
- address-search.js
- restaurant-intelligence.js
- app.js
- service-worker.js
- manifest.webmanifest
- README.md
- CHANGELOG.md
- DEPLOYMENT.md
- icons/icon-192.svg
- icons/icon-512.svg

## Cache handling

This release changes every CSS and JavaScript reference to include `v=1.9.3`.
Its service worker immediately activates, deletes older DetourEats caches, and
checks the network before using cached app files.


## v1.9.3 serverless function

The repository now includes `api/restaurant-evidence.js`. Vercel should detect it automatically as a Node.js Function while serving the static application from the repository root.

After adding provider credentials in Vercel, redeploy production. Verify:

- `/api/restaurant-evidence` returns `method_not_allowed` for a browser GET rather than a 404
- the footer says `DetourEats v1.9.3`
- a recommendation initially shows a provisional Food estimate and then updates to a review-backed Food score after evidence is returned
## v1.9.3 preference verification

After deployment, test the skip sheet on a route with several options:

1. Select **Need something faster**. A matched result must be no farther away than the skipped stop.
2. If no faster stop exists, the card must say **No truly faster alternative** rather than presenting the fallback as faster.
3. Select **Wait for something better** with no stronger option available. The app must still show the best available restaurant.
4. Confirm **Too far**, **Too expensive**, **Wrong cuisine**, and **Not hungry yet** display either a matched adjustment or a clearly labeled fallback.


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

`DetourEats v1.8.9`

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

This release changes every CSS and JavaScript reference to include `v=1.8.9`.
Its service worker immediately activates, deletes older DetourEats caches, and
checks the network before using cached app files.

# Royal Spices: Saffron Experience

Local preview: http://127.0.0.1:4178/

The website lives in `dist/`. Serve that directory through an HTTP server;
opening the HTML directly cannot load the JavaScript modules and motion cache.
No build step, backend, tracking service, or third-party runtime CDN is required.

## Experience

- Reference-site mountain photograph in the hero, with attribution in the footer.
- Scroll-controlled Three.js saffron sequence in an engraved, Afghan-inspired brass bowl.
- The same scroll position produces the same camera pose and particle state.
- The camera descends into the falling saffron for an edge-to-edge macro moment, then returns to the full bowl.
- Desktop depth of field provides foreground separation; mobile omits that extra rendering pass.
- A long scroll section provides fine control without a timer, smoothing delay, or scroll lock.
- The pause control freezes the scene. Reduced-motion preferences start with a static pose.
- The contact form prepares an email locally; the visitor sends it in their own mail application.

## Implementation

`app.js` handles navigation, enquiries, lazy loading, and scroll progress.
`scene.js` handles the camera, physically based materials, shadows, and instanced strands.
`saffron-motion.json` describes a precomputed Cannon-es rigid-bundle simulation.
`saffron-motion.bin.gz` holds compressed, quantized positions and rotations.
The browser interpolates these poses in both directions; it does not run physics during scrolling.
The model is a visual approximation of dry saffron, not a flexible-fibre scientific simulation.

All dependencies and fonts are locally served. Their licenses are in `dist/assets/`.
`assets.lock.json` records exact asset hashes; `dependency-audit.json` records the package audit.
`motion-verification.json` records the baked trajectory checks.
See `QA.md` for browser checks and remaining launch work.

## Publication Status

This is a local preview, not a replacement deployed to royalspices.de.
Search indexing is intentionally disabled. Before launch, the owner should approve prices,
image rights, legal pages and contact details; set the final canonical/Open Graph URLs;
review production security headers; then enable indexing and add the production sitemap.
The existing royalspices.de domain has not been changed.

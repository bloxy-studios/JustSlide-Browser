# branding/

Product identity for development builds is set by `patches/chromium/0001-*`:
`PRODUCT_FULLNAME=JustSlide Chromium Dev`, `MAC_BUNDLE_ID=app.justslide.chromium.dev`,
`CrProductDirName=JustSlide Chromium Dev` (isolated `~/Library/Application Support/JustSlide Chromium Dev`).

Missing (must come from the approved Slide design source, not generated):
* App icon set (`.icns`/`Assets.car`) — until provided, the build uses Chromium's
  unbranded icon, which is permitted for Chromium builds but must be replaced before release.
* Blue peeking mascot (SVG preferred) → `branding/mascot/` and wire into `Mascot.tsx`.

Chromium notices and licenses are retained unchanged (about:credits).

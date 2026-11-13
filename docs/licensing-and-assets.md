# Licensing & assets (not legal advice)

## Chromium
BSD-3 + third-party licenses retained (about:credits). Unbranded Chromium build: no Google Chrome branding, API keys, Widevine or proprietary codecs (`proprietary_codecs=false`, `ffmpeg_branding="Chromium"`, `enable_widevine=false`). Google services (sync, Safe Browsing API keys) require separate verification — not enabled.

## Atlassian Design System — **OPEN QUESTION, release blocker**
* Each `@atlaskit/*` npm package declares **Apache-2.0** (audit: `docs/evidence/ui-license-audit.json`).
* The **ADS License Agreement** (https://atlassian.design/license/, updated 2025-03-13) grants use "in connection with … Add-Ons that interoperate or are integrated with Atlassian's software and cloud products", restricts modification/derivatives/distribution, and §8 notes OSS licenses "may grant you additional rights to the OSS code itself and allow you to use the OSS outside of the ADS".
* JustSlide is an independent browser, not an Atlassian Add-On. Whether Apache-2.0 package rights alone permit this use (and which visual assets/icons are covered) needs legal review. We do **not** declare approval. Engineering continues with packages as installed; no ADS code is modified (the Trusted Types policy wraps, not alters, ADS).

## Dependency audit (131 packages in the shipped UI tree)
Apache-2.0 42 · MIT 81 · ISC 4 · BSD-3-Clause 3 · 0BSD 1. Missing LICENSE file (license field only): `@atlaskit/platform-feature-flags`, `@atlaskit/top-layer`, `@compiled/react`, `@statsig/client-core`. No font files shipped by any package. Regenerate: `bun run licenses:ui`.

## Fonts
Atlassian Sans / Mono: Atlassian's typography page says app fonts are available via Atlassian Mosaic and the font setup guide is "Atlassians only". Rights for this product are unestablished → not retrieved or bundled. Charlie Sans (brand font) must not be used as a product font. Current rendering = system fallback from the ADS token stack (labeled). Exact visual parity blocked.

## Product assets
Mascot and app icon: required from the approved Slide source; absent here; nothing generated. No OpenAI/Anthropic logos bundled; favorites use the sites' own favicons at runtime.

# Extension compatibility

Strategy (ADR 0006): keep Chromium's real extension system (`//chrome/browser/extensions`), MV3 first, no imitation `chrome.*`.

## Fixture
`tests/fixtures/extensions/mv3-basic` — service worker (module), content script, `storage.local`, `runtime` messaging, `tabs` events/create/remove/query, action popup, options page.

## Matrix
| Capability | Expected | Outcome |
|---|---|---|
| Unpacked load (developer mode) | works | not run (no native build) |
| Service worker starts, `onInstalled` | works | not run |
| Content script on 127.0.0.1 fixture | `data-justslide-fixture` set | not run |
| Messaging popup→SW→tabs.create(active:false) | tab appears in sidebar (selected workspace), focus unchanged | not run |
| `tabs.query({active, currentWindow})` | matches TabStripModel active tab | not run |
| Extension-created/closed/moved tabs | reflected via TabStripModelObserver | not run |
| Action visibility / popup anchoring | needs a native toolbar action surface next to the sidebar | **design gap** — JustSlide sidebar must host an extensions button anchored with Views |
| Options page | opens in tab | not run |
| Signed CRX install / Web Store | requires store flow + update service audit | not attempted |
| Native messaging / password managers | later | not attempted |

Workspace scoping is UI organisation only; extensions see all tabs of the profile.

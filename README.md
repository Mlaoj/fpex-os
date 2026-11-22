# FPEX OS — ALPHA 0.1

**BUILT TO PLAY.** A premium, original console shell built with plain HTML, CSS and JavaScript (no dependencies). This is a **web prototype** of the FPEX interface, not an operating system. The dedicated console will boot straight into this shell on a Linux base in a later phase.

## Run

ES modules need http (not `file://`):

```
python3 -m http.server 8080
```

or enable **GitHub Pages** (Settings → Pages → Deploy from branch `main`, `/ (root)`) and open the Pages URL on the tablet.

## What works in Alpha 0.1

- Cinematic dashboard: selected game artwork becomes the full-screen background with subtle blur, dark overlay and slow crossfade; UI elements never move.
- Library: favorites, installed status, recently played/added, search, add/remove your own games (with optional artwork URL).
- Navigation: keyboard (arrows, Enter, Esc, F, `/`), gamepad (D-pad/left stick, A, B, X, Y, Start, Select) and touch, with visible focus.
- Settings that actually apply: display scaling, blur, darkness, animations, boot animation, clock format, volume/interface sounds, display name, plus live display/controller/network/system info.
- Boot animation (can be disabled).

## Honest limits

- **Games, "recently played" and the store catalog are sample data** with generated placeholder artwork. Nothing launches.
- **Steam** is a status page only: no account, no library, no launching. Steam cannot run on Android.
- **FPEX Store**: no payments or downloads.
- **FPEX AI** handles a few local text commands. ElevenLabs voice and conversational AI need a backend that keeps API keys in environment variables (Alpha 0.3).
- Not yet tested on real controllers or in multiple browsers.

## Structure

```
index.html
css/styles.css
js/data.js    sample data + placeholder artwork
js/input.js   keyboard + gamepad spatial navigation
js/app.js     views, settings, dialogs, state
```

## Roadmap

Alpha 0.2 store, Steam prep, profiles, notifications · Alpha 0.3 voice assistant and Node backend · Beta Linux shell, auto-start, hardware detection, real Steam.

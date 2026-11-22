# FPEX OS — ALPHA 0.2 (Playable Games)

**BUILT TO PLAY.** An original console shell in plain HTML, CSS and JavaScript (no dependencies). This is a **web prototype**, not an operating system. The dedicated console will boot straight into this shell on a Linux base later.

Live: https://mlaoj.github.io/fpex-os/ (enable Pages: Settings → Pages → `main` / root).
Local: `python3 -m http.server 8080` (ES modules need http, not `file://`).

## Playable games (all original, MIT)

| Game | What it is |
|---|---|
| FPEX Racing | Top-down racing: 3 tracks, 3 laps, speed/grip physics, off-track slowdown, lap timer, best times saved, restart |
| FPEX Adventure | Tile platformer: 3 levels, jumping, coins, patrolling enemies (stompable), spikes, lives, exit unlocked by coins, progress saved |
| FPEX Chess | Full rules for two local players: legal moves, castling, en passant, promotion choice, check, checkmate, stalemate, draws, take-back, restart |
| FPEX Puzzle | Sliding tiles: Easy 3×3, Medium 4×4, Hard 5×5, score, best results, unfinished puzzle saved |

Press **Play** on a game (Home, Library, Store or details). The player gives you a full-screen canvas, a pause menu (Resume, Restart, Fullscreen, Game settings, Exit), keyboard, gamepad and on-screen touch controls.

## Controls

Shell: arrows / D-pad / left stick, Enter / A select, Esc / B back, F / X favorite, `/` / Y search, Start menu.
Games: see each game's details screen. Start / Esc / P pauses.

## Store and installation

The store lists only games that can be legally distributed, each with its license. Install adds a game to your library (stored locally); Uninstall removes it. Entries are described in `js/data.js` (`entry`, `license`, `source`, `attribution`). Today every game is bundled in this repo. The launcher imports a game module on Play, so adding a new open-source browser game means: add its files and license text, add an entry with its license and attribution, and keep the original license intact. No commercial game files are distributed.

## Steam

No Steam account, library or installation status is shown, because none is read. The Steam page can hand an AppID to the local Steam client through a `steam://` link on machines that have it. FPEX cannot confirm that Steam launched. Steam games do not run in the browser or on Android. Real integration (Web API through a server-side key, Proton on Linux) is for the Linux/desktop build.

## Structure

```
index.html  css/styles.css
js/app.js     shell: views, store, settings, dialogs
js/player.js  game player, input, pause menu, touch controls
js/input.js   shell keyboard + gamepad navigation
js/data.js    catalog + generated artwork
js/games/     racing.js adventure.js chess.js puzzle.js
```

## Honest status

Written without a browser or controller test run. Expect bugs. FPEX AI only handles local text commands; ElevenLabs voice needs a backend (Alpha 0.3). No payments, accounts or friends yet.

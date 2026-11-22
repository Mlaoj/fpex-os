// FPEX catalog. Every entry is a real, playable game bundled in this repository.
// Entry types: 'builtin' (ES module in js/games/) — 'html' (sandboxed iframe) is reserved for future open-source packages.
const MOTIF = {
  racing: '<path d="M330 640C260 400 520 240 800 250S1320 330 1270 560 980 700 700 690 380 740 330 640Z" fill="none" stroke="#fff" stroke-width="84" stroke-linejoin="round" opacity=".13"/><path d="M330 640C260 400 520 240 800 250S1320 330 1270 560 980 700 700 690 380 740 330 640Z" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="26 26" opacity=".3"/>',
  adventure: '<rect x="120" y="640" width="520" height="44" rx="8" fill="#fff" opacity=".18"/><rect x="760" y="520" width="280" height="44" rx="8" fill="#fff" opacity=".18"/><rect x="1130" y="400" width="300" height="44" rx="8" fill="#fff" opacity=".18"/><circle cx="900" cy="470" r="22" fill="#fff" opacity=".35"/><circle cx="1260" cy="350" r="22" fill="#fff" opacity=".35"/><rect x="300" y="560" width="46" height="80" rx="12" fill="#fff" opacity=".35"/>',
  chess: (() => { let s = ''; for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) if ((r + c) % 2) s += `<rect x="${340 + c * 90}" y="${200 + r * 90}" width="90" height="90" fill="#fff" opacity=".1"/>`; return s + '<text x="720" y="560" font-size="300" fill="#fff" opacity=".25" font-family="serif">\u265E\uFE0E</text>'; })(),
  puzzle: (() => { let s = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r * 3 + c < 8) s += `<rect x="${560 + c * 150}" y="${190 + r * 150}" width="136" height="136" rx="14" fill="#fff" opacity="${.08 + ((r * 3 + c) % 3) * .05}"/>`; return s; })()
};

export const GAMES = [
  { id: 'racing', title: 'FPEX Racing', cat: 'Racing', version: '0.2.0', motif: 'racing', hue: 40, entry: './games/racing.js',
    desc: 'Three tracks, three laps, and your best times saved. Master the racing line and keep it on the tarmac.',
    controls: [['Keyboard', 'Arrows or WASD to steer, accelerate and brake. Space also accelerates.'], ['Controller', 'Left stick or D-pad steers. RT or A accelerates. LT or B brakes.'], ['Touch', 'On-screen steering, gas and brake buttons.']],
    touch: ['left', 'right', 'b', 'a'], touchLabels: { a: 'GAS', b: 'BRAKE' } },
  { id: 'adventure', title: 'FPEX Adventure', cat: 'Platformer', version: '0.2.0', motif: 'adventure', hue: 200, entry: './games/adventure.js',
    desc: 'Run, jump and stomp through three levels. Collect enough coins to unlock the exit flag.',
    controls: [['Keyboard', 'Left/Right or A/D to move. Space, Up, W or Z to jump.'], ['Controller', 'Left stick or D-pad to move. A to jump.'], ['Touch', 'On-screen move and jump buttons.']],
    touch: ['left', 'right', 'a'], touchLabels: { a: 'JUMP' } },
  { id: 'chess', title: 'FPEX Chess', cat: 'Board', version: '0.2.0', motif: 'chess', hue: 120, entry: './games/chess.js',
    desc: 'Full chess for two players on one screen: every legal move, castling, en passant, promotion, check and checkmate.',
    controls: [['Pointer / touch', 'Tap a piece, then a highlighted square.'], ['Keyboard', 'Arrows move the cursor. Enter or Space selects. X cancels. C takes back a move.'], ['Controller', 'D-pad moves the cursor. A selects. B cancels. X takes back a move.']] },
  { id: 'puzzle', title: 'FPEX Puzzle', cat: 'Puzzle', version: '0.2.0', motif: 'puzzle', hue: 230, entry: './games/puzzle.js',
    desc: 'Slide the tiles back into order on three difficulty levels. Your score, best results and unfinished puzzle are saved.',
    controls: [['Pointer / touch', 'Tap a tile in line with the empty space to slide it.'], ['Keyboard', 'Arrow keys slide a tile into the empty space.'], ['Controller', 'D-pad or left stick slides a tile. A confirms in menus.']] }
].map(g => ({ ...g, license: 'MIT \u00b7 original FPEX game', source: 'Bundled in this repository (js/games/)', attribution: 'No third-party code or assets.', year: 2026 }));

const hueOf = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

// Original, neutral artwork generated as SVG.
export function artFor(item) {
  const h = item.hue ?? hueOf(item.title), m = MOTIF[item.motif];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},12%,26%)"/><stop offset="1" stop-color="hsl(${h},8%,7%)"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1150" cy="340" r="330" fill="hsl(${h},14%,38%)" opacity=".18"/>${m || ''}<path d="M0 780 L380 640 L700 730 L1080 590 L1600 760 V900 H0Z" fill="hsl(${h},8%,8%)" opacity=".85"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

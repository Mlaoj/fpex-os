// Sample data only. Artwork is generated placeholder art (no licensed assets).
const DAY = 864e5, NOW = Date.now();
const ago = d => (d == null ? 0 : NOW - d * DAY);

export const GAMES = [
  { id: 'ashfall', title: 'Ashfall', cat: 'Action', year: 2025, hue: 18, installed: true, played: 0.2, added: 60, featured: true, desc: 'Cross a burning continent on foot. Every ember you leave behind changes who follows you.' },
  { id: 'harbor-light', title: 'Harbor Light', cat: 'Adventure', year: 2024, hue: 200, installed: true, played: 1, added: 90, featured: true, desc: 'Restore a failing lighthouse and uncover the quiet town that depends on it.' },
  { id: 'iron-meridian', title: 'Iron Meridian', cat: 'Strategy', year: 2023, hue: 120, installed: true, played: 3, added: 120, featured: false, desc: 'Command a railway empire across a divided continent, one track at a time.' },
  { id: 'quiet-orbit', title: 'Quiet Orbit', cat: 'Puzzle', year: 2024, hue: 230, installed: true, played: 6, added: 30, featured: true, desc: 'Fix a silent station with physics puzzles that reward patience.' },
  { id: 'last-signal', title: 'Last Signal', cat: 'Horror', year: 2025, hue: 350, installed: false, played: null, added: 10, featured: false, desc: 'A radio operator, a storm, and something answering on a dead channel.' },
  { id: 'northbound', title: 'Northbound', cat: 'Racing', year: 2022, hue: 45, installed: false, played: null, added: 5, featured: true, desc: 'Endurance racing from the coast to the arctic circle in a single run.' },
  { id: 'ember-court', title: 'Ember Court', cat: 'RPG', year: 2025, hue: 25, installed: true, played: 12, added: 150, featured: false, desc: 'Win a throne through favors, duels and carefully chosen betrayals.' },
  { id: 'tidebreaker', title: 'Tidebreaker', cat: 'Simulation', year: 2023, hue: 175, installed: false, played: null, added: 2, featured: false, desc: 'Run a coastal port through storms, strikes and shifting trade routes.' }
].map(({ played, added, ...g }) => ({ ...g, lastPlayed: ago(played), addedAt: ago(added) }));

export const STORE = [
  { id: 's1', title: 'Gridlock Run', cat: 'Racing', price: 14.99, hue: 40, desc: 'Arcade city racing with tight, readable handling.' },
  { id: 's2', title: 'Paper Kingdoms', cat: 'Strategy', price: 0, hue: 100, desc: 'Free tabletop-style strategy for short sessions.' },
  { id: 's3', title: 'Lantern Deep', cat: 'Adventure', price: 19.99, hue: 205, desc: 'Explore flooded ruins with a single lamp.' },
  { id: 's4', title: 'Hollow Frequency', cat: 'Horror', price: 24.99, hue: 340, desc: 'Signal-hunting horror set inside a radio observatory.' },
  { id: 's5', title: 'Slate & Sparrow', cat: 'Puzzle', price: 9.99, hue: 220, desc: 'Calm tile puzzles with hand-drawn art.' },
  { id: 's6', title: 'Overhaul 88', cat: 'Action', price: 29.99, hue: 15, desc: 'Fast, close-quarters action in a collapsing factory.' },
  { id: 's7', title: 'Salt Road', cat: 'RPG', price: 0, hue: 55, desc: 'Free caravan RPG across a dried-out sea.' },
  { id: 's8', title: 'Pitchside Manager', cat: 'Sports', price: 39.99, hue: 140, desc: 'Football management with deep scouting.' }
];

const hueOf = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

// Neutral, low-saturation placeholder artwork as an SVG data URI.
export function artFor(item) {
  if (item.art) return item.art.replace(/'/g, '%27').replace(/"/g, '%22');
  const h = item.hue ?? hueOf(item.title), ch = (item.title[0] || 'F').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},12%,26%)"/><stop offset="1" stop-color="hsl(${h},8%,7%)"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1150" cy="340" r="330" fill="hsl(${h},14%,38%)" opacity=".22"/><path d="M0 740 L380 540 L700 670 L1080 450 L1600 720 V900 H0Z" fill="hsl(${h},8%,9%)" opacity=".85"/><text x="110" y="560" font-family="Arial,sans-serif" font-weight="700" font-size="560" fill="#fff" opacity=".07">${ch}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

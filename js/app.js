import { GAMES, STORE, artFor } from './data.js';
import { initInput, beep, setVolume } from './input.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = localStorage.getItem('fpex.' + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('fpex.' + k, JSON.stringify(v)); } catch {} };
const price = p => (p === 0 ? 'Free' : '$' + p.toFixed(2));

const S = {
  view: 'home', filter: 'all', storeCat: 'All', settingsTab: 'General', chat: [], sel: null, dlgFn: null,
  games: load('games', null) || GAMES.map(g => ({ ...g })),
  fav: load('fav', ['ashfall']), wish: load('wish', []),
  notes: load('notes', [
    { t: 'Welcome to FPEX OS Alpha 0.1', d: 'This is a web prototype of the console shell. Game launching is not available yet.' },
    { t: 'Controller ready', d: 'Connect an Xbox-compatible or generic Bluetooth controller and press any button.' }
  ]),
  settings: { blur: 3, dark: 45, anim: true, boot: true, scale: 100, clock24: true, volume: 60, sound: true, name: 'Player One', lang: 'English', region: 'Auto', ...load('settings', {}) }
};
const saveGames = () => save('games', S.games);
const sel = () => S.games.find(g => g.id === S.sel) || S.games[0];
let storTxt = 'Storage n/a';

/* ---------- background ---------- */
let bgIdx = 0, bgKey = '';
function setBg(src) {
  if (src === bgKey) return;
  bgKey = src;
  const l = document.querySelectorAll('.bg-layer'), n = l[bgIdx ^ 1];
  n.style.backgroundImage = `url("${src}")`;
  n.classList.add('on'); l[bgIdx].classList.remove('on'); bgIdx ^= 1;
}

function applySettings() {
  const s = S.settings, r = document.documentElement;
  r.style.setProperty('--blur', s.blur + 'px');
  r.style.setProperty('--dark', s.dark / 100);
  r.style.fontSize = s.scale + '%';
  document.body.classList.toggle('noanim', !s.anim);
  setVolume(s.volume, s.sound);
  $('#pname').textContent = s.name || 'Player';
  tick();
}

/* ---------- helpers ---------- */
const keyOf = e => [e.dataset.act, e.dataset.id, e.dataset.filter, e.dataset.cat, e.dataset.tab, e.id].join('|');
function restore(root, key) {
  const el = [...root.querySelectorAll('[data-f]')].find(e => keyOf(e) === key);
  (el || root.querySelector('[data-f]'))?.focus({ preventScroll: true });
}
function refresh() {
  const a = document.activeElement, inView = a && $('#view').contains(a), key = inView ? keyOf(a) : null;
  render();
  if (key) restore($('#view'), key);
}
function after() { refresh(); if ($('#dlg').open && S.dlgFn) { const a = document.activeElement, key = keyOf(a); S.dlgFn(); restore($('#dlg'), key); } }
function openDlg(html, fn) { const d = $('#dlg'); S.dlgFn = fn || null; d.innerHTML = `<div class="dlg-in">${html}</div>`; if (!d.open) d.showModal(); (d.querySelector('[autofocus]') || d.querySelector('[data-f]'))?.focus(); }
const closeDlg = () => { const d = $('#dlg'); if (d.open) d.close(); };
function focusFirst() { ($('#view .tile') || $('#view [data-f]'))?.focus({ preventScroll: true }); }

const tile = g => `<button class="tile" data-f data-act="details" data-id="${g.id}" data-game="${g.id}" style="background-image:url('${artFor(g)}')"><span>${esc(g.title)}</span></button>`;

function updateHero() {
  const g = sel(); if (!g) return;
  setBg(artFor(g));
  const set = (id, t) => { const e = $('#' + id); if (e) e.textContent = t; };
  set('h-cat', g.cat + (g.installed ? ' \u00b7 Installed' : ' \u00b7 Not installed'));
  set('h-title', g.title); set('h-desc', g.desc);
  set('h-fav', S.fav.includes(g.id) ? 'Remove favorite' : 'Add favorite');
  $('#h-det')?.setAttribute('data-id', g.id); $('#h-fav')?.setAttribute('data-id', g.id);
}

/* ---------- views ---------- */
const R = {
  home() {
    const recent = S.games.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed);
    const feat = S.games.filter(g => g.featured);
    return `<section class="hero"><p class="eyebrow" id="h-cat"></p><h1 id="h-title"></h1><p class="lead" id="h-desc"></p>
      <div class="acts"><button class="btn primary" id="h-det" data-f data-act="details">Details</button><button class="btn" id="h-fav" data-f data-act="fav"></button></div></section>
      <section><h2>Recently played</h2><div class="row">${recent.map(tile).join('') || '<p class="mut">Nothing played yet.</p>'}</div></section>
      <section><h2>Featured</h2><div class="row">${feat.map(tile).join('')}</div></section>`;
  },
  games() {
    const f = S.filter, L = {
      all: S.games, installed: S.games.filter(g => g.installed), favs: S.games.filter(g => S.fav.includes(g.id)),
      recent: S.games.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed),
      added: [...S.games].sort((a, b) => b.addedAt - a.addedAt).slice(0, 6)
    };
    const chips = [['all', 'All'], ['installed', 'Installed'], ['favs', 'Favorites'], ['recent', 'Recently played'], ['added', 'Recently added']]
      .map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-f data-act="filter" data-filter="${k}">${n}</button>`).join('');
    return `<div class="page-h"><h2>Library</h2><div class="chips">${chips}<button class="chip" data-f data-act="addgame">+ Add game</button></div></div>
      <div class="grid">${L[f].map(tile).join('') || '<p class="mut">No games here yet.</p>'}</div>`;
  },
  store() {
    const cats = ['All', 'Free', 'Wishlist', ...new Set(STORE.map(s => s.cat))];
    const c = S.storeCat;
    const items = STORE.filter(s => c === 'All' || (c === 'Free' ? s.price === 0 : c === 'Wishlist' ? S.wish.includes(s.id) : s.cat === c));
    return `<div class="page-h"><h2>FPEX Store</h2><p class="mut">Sample catalog. Purchases and downloads are not implemented yet.</p>
      <div class="chips">${cats.map(x => `<button class="chip ${c === x ? 'on' : ''}" data-f data-act="cat" data-cat="${x}">${x}</button>`).join('')}</div></div>
      <div class="grid">${items.map(s => `<button class="tile" data-f data-act="sdetails" data-id="${s.id}" data-store="${s.id}" style="background-image:url('${artFor(s)}')"><em>${price(s.price)}</em><span>${esc(s.title)}</span></button>`).join('') || '<p class="mut">Nothing here.</p>'}</div>`;
  },
  steam() {
    return `<div class="page-h"><h2>Steam</h2></div><div class="two"><section class="panel"><h3>Not connected</h3>
      <p class="mut">No Steam account is linked and no Steam library is loaded. Steam cannot run on Android, so this section only prepares the integration for the Linux console build.</p>
      <div class="list"><div class="srow"><span>Steam account</span><span class="val">Not linked</span></div><div class="srow"><span>Library</span><span class="val">Unavailable</span></div><div class="srow"><span>Game launching</span><span class="val">Needs Steam client (Linux)</span></div></div></section>
      <aside class="panel"><h3>Planned</h3><p class="mut">Steam client on the Linux shell, Proton compatibility checks, library via the Steam Web API through a server-side key, controller-first navigation, and install management.</p></aside></div>`;
  },
  ai() {
    const log = S.chat.map(m => `<p class="msg ${m.r}">${esc(m.t)}</p>`).join('') || '<p class="mut">Try: "open settings", "find ashfall", "show favorites" or "system info".</p>';
    const sug = ['open settings', 'show favorites', 'system info'].map(q => `<button class="chip" data-f data-act="ask" data-q="${q}">${q}</button>`).join('');
    return `<div class="page-h"><h2>FPEX AI</h2></div><div class="two"><section class="panel"><div class="log">${log}</div>
      <form data-form="ai" class="askrow"><input type="text" id="aiq" data-f placeholder="Type a command" autocomplete="off"><button class="btn primary" data-f>Send</button></form></section>
      <aside class="panel"><h3>Status</h3><div class="srow"><span>Text commands</span><span class="val">Local</span></div><div class="srow"><span>Conversational AI</span><span class="val">Not connected</span></div><div class="srow"><span>Voice (ElevenLabs)</span><span class="val">Needs backend</span></div>
      <p class="mut" style="margin-top:.8rem">Voice and conversation need a server holding the API keys (planned for Alpha 0.3). No keys ever go in this frontend.</p><div class="chips">${sug}</div></aside></div>`;
  },
  friends() {
    return `<div class="page-h"><h2>Friends</h2></div><section class="panel"><h3>No friends yet</h3><p class="mut">Friends and presence arrive with online accounts in Alpha 0.2.</p></section>`;
  },
  settings() {
    const T = ['General', 'Display', 'Audio', 'Controller', 'Network', 'System', 'Appearance'], s = S.settings, t = S.settingsTab;
    const row = (l, c, n = '') => `<div class="srow"><div>${l}${n ? `<small>${n}</small>` : ''}</div><div class="val">${c}</div></div>`;
    const rng = (k, min, max, u) => `<input type="range" data-f data-set="${k}" min="${min}" max="${max}" value="${s[k]}" data-unit="${u}"> <span>${s[k]}${u}</span>`;
    const chk = k => `<input type="checkbox" data-f data-set="${k}" ${s[k] ? 'checked' : ''}>`;
    const opt = (k, arr) => `<select data-f data-set="${k}">${arr.map(o => `<option ${s[k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    const conn = navigator.connection || {}, pads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
    const P = {
      General: () => row('Display name', `<input type="text" data-f data-set="name" value="${esc(s.name)}">`, 'Local profile. Online accounts arrive in Alpha 0.2.') +
        row('Language', opt('lang', ['English', 'T\u00fcrk\u00e7e']), 'Stored only. UI translations are not implemented yet.') + row('Region', opt('region', ['Auto', 'Europe', 'North America', 'Asia', 'Other'])) +
        row('24-hour clock', chk('clock24')) + row('Date and time', `<span id="dt">${new Date().toLocaleString()}</span>`, 'From the device clock.'),
      Display: () => row('Resolution', `${screen.width * devicePixelRatio | 0} \u00d7 ${screen.height * devicePixelRatio | 0}`, `Viewport ${innerWidth} \u00d7 ${innerHeight}`) +
        row('Refresh rate', '<span id="hz">measuring\u2026</span>', 'Measured from the browser frame rate.') + row('Display scaling', rng('scale', 80, 130, '%')) +
        row('HDR', matchMedia('(dynamic-range: high)').matches ? 'Available' : 'Not detected'),
      Audio: () => row('Output device', 'Browser default', 'Device selection is not exposed to web apps in this prototype.') + row('Volume', rng('volume', 0, 100, '%'), 'Applies to interface sounds.') + row('Interface sounds', chk('sound')),
      Controller: () => row('Connected controllers', pads.length ? pads.map(p => esc(p.id)).join('<br>') : 'None. Connect one and press a button.') +
        row('Vibration', `<button class="btn" data-f data-act="rumble">Test</button>`, pads[0]?.vibrationActuator ? 'Supported by the first controller.' : 'Not reported by the browser/controller.') +
        row('Button mapping', 'A select \u00b7 B back \u00b7 X favorite \u00b7 Y search<br>Start menu \u00b7 Select details', 'Read-only for now. Keyboard: arrows, Enter, Esc, F, /'),
      Network: () => row('Connection', navigator.onLine ? 'Online' : 'Offline') + row('Type', conn.effectiveType || 'Not reported') + row('Downlink', conn.downlink ? conn.downlink + ' Mbps' : 'Not reported') + row('Latency', conn.rtt != null ? conn.rtt + ' ms' : 'Not reported'),
      System: () => row('FPEX OS version', 'Alpha 0.1 (web prototype)') + row('Platform', esc(navigator.userAgentData?.platform || navigator.platform || 'Unknown')) +
        row('CPU threads', navigator.hardwareConcurrency || 'Unknown') + row('Memory', navigator.deviceMemory ? '\u2265 ' + navigator.deviceMemory + ' GB' : 'Not reported') +
        row('Storage', storTxt, 'Browser storage quota, not the device disk.') + row('Updates', 'Not available', 'Updates ship with the Linux shell.') +
        row('Reset', `<button class="btn" data-f data-act="reset">Reset local data</button>`),
      Appearance: () => row('Background blur', rng('blur', 0, 10, 'px')) + row('Background darkness', rng('dark', 0, 80, '%')) + row('Animations', chk('anim')) + row('Boot animation', chk('boot'))
    };
    return `<div class="page-h"><h2>Settings</h2></div><div class="set"><nav class="tabs">${T.map(x => `<button data-f data-act="tab" data-tab="${x}" class="${t === x ? 'on' : ''}">${x}</button>`).join('')}</nav><section class="panel">${P[t]()}</section></div>`;
  }
};

function render() {
  $('#view').className = 'v-' + S.view;
  $('#view').innerHTML = R[S.view]();
  document.querySelectorAll('[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === S.view ? 'page' : 'false'));
  updateHero();
  if (S.view === 'settings' && S.settingsTab === 'Display') measureHz();
  const l = $('.log'); if (l) l.scrollTop = l.scrollHeight;
}
function go(v) { S.view = v; render(); focusFirst(); }

function measureHz() {
  let n = 0, t0 = 0;
  const f = t => { t0 = t0 || t; n++; if (t - t0 < 600) requestAnimationFrame(f); else { const e = $('#hz'); if (e) e.textContent = Math.round(n * 1000 / (t - t0)) + ' Hz'; } };
  requestAnimationFrame(f);
}

/* ---------- dialogs ---------- */
function openDetails(id) {
  const g = S.games.find(x => x.id === id); if (!g) return;
  const fav = S.fav.includes(id);
  openDlg(`<div class="banner" style="background-image:url('${artFor(g)}')"></div><h2 style="margin:0">${esc(g.title)}</h2><p class="mut">${esc(g.cat)}${g.year ? ' \u00b7 ' + g.year : ''} \u00b7 ${g.installed ? 'Installed' : 'Not installed'}</p>
    <p style="margin:.8rem 0">${esc(g.desc)}</p><p class="mut" style="margin-bottom:1rem">Game launching is not available in the web prototype.</p>
    <div class="acts"><button class="btn primary" data-f data-act="fav" data-id="${id}">${fav ? 'Remove favorite' : 'Add favorite'}</button>
    <button class="btn" data-f data-act="installed" data-id="${id}">${g.installed ? 'Mark as not installed' : 'Mark as installed'}</button>
    ${g.custom ? `<button class="btn" data-f data-act="remove" data-id="${id}">Remove</button>` : ''}<button class="btn" data-f data-act="close">Close</button></div>`, () => openDetails(id));
}
function openStore(id) {
  const s = STORE.find(x => x.id === id); if (!s) return;
  const w = S.wish.includes(id);
  openDlg(`<div class="banner" style="background-image:url('${artFor(s)}')"></div><h2 style="margin:0">${esc(s.title)}</h2><p class="mut">${esc(s.cat)} \u00b7 ${price(s.price)}</p><p style="margin:.8rem 0">${esc(s.desc)}</p>
    <p class="mut" style="margin-bottom:1rem">Purchases and downloads are not implemented yet.</p>
    <div class="acts"><button class="btn primary" data-f data-act="wish" data-id="${id}">${w ? 'Remove from wishlist' : 'Add to wishlist'}</button><button class="btn" data-f data-act="close">Close</button></div>`, () => openStore(id));
}
function openAdd() {
  const cats = ['Action', 'Adventure', 'Strategy', 'Puzzle', 'Horror', 'Racing', 'RPG', 'Simulation', 'Sports', 'Other'];
  openDlg(`<h2 style="margin:0 0 .4rem">Add game</h2><form data-form="addgame"><label>Title</label><input type="text" name="title" data-f required autofocus>
    <label>Category</label><select name="cat" data-f>${cats.map(c => `<option>${c}</option>`).join('')}</select><label>Description</label><input type="text" name="desc" data-f>
    <label>Artwork URL (optional, https or data:image)</label><input type="text" name="art" data-f><label><input type="checkbox" name="inst" data-f> Installed</label>
    <div class="acts" style="margin-top:1rem"><button class="btn primary" data-f>Add</button><button type="button" class="btn" data-f data-act="close">Cancel</button></div></form>`);
}
function openSearch() {
  openDlg(`<input type="text" id="q" data-f data-search autofocus placeholder="Search library and store" autocomplete="off"><div class="list" id="res"></div>`);
  runSearch('');
}
function runSearch(q) {
  q = q.trim().toLowerCase();
  const a = S.games.filter(g => !q || (g.title + g.cat).toLowerCase().includes(q)).map(g => `<button data-f data-act="details" data-id="${g.id}">${esc(g.title)} <span class="mut">\u00b7 Library \u00b7 ${esc(g.cat)}</span></button>`);
  const b = q ? STORE.filter(s => (s.title + s.cat).toLowerCase().includes(q)).map(s => `<button data-f data-act="sdetails" data-id="${s.id}">${esc(s.title)} <span class="mut">\u00b7 Store \u00b7 ${price(s.price)}</span></button>`) : [];
  $('#res').innerHTML = [...a, ...b].join('') || '<p class="mut">No results.</p>';
}
function openNotes() {
  openDlg(`<h2 style="margin:0 0 .4rem">Alerts</h2><div class="list">${S.notes.map(n => `<div class="panel"><strong>${esc(n.t)}</strong><p class="mut">${esc(n.d)}</p></div>`).join('') || '<p class="mut">No alerts.</p>'}</div><div class="acts" style="margin-top:1rem"><button class="btn" data-f data-act="close" autofocus>Close</button></div>`);
}

/* ---------- FPEX AI (local commands only) ---------- */
function ask(q) {
  q = q.trim(); if (!q) return;
  S.chat.push({ r: 'me', t: q });
  const s = q.toLowerCase(); let a, nav, open;
  const hit = S.games.filter(g => s.includes(g.title.toLowerCase()));
  if (hit.length === 1) { a = `Opening ${hit[0].title}.`; open = hit[0].id; }
  else if (/\bsettings?\b/.test(s)) { nav = 'settings'; a = 'Opening Settings.'; }
  else if (/\bstore\b/.test(s)) { nav = 'store'; a = 'Opening the FPEX Store.'; }
  else if (/\bsteam\b/.test(s)) { nav = 'steam'; a = 'Opening Steam.'; }
  else if (/\bfriends?\b/.test(s)) { nav = 'friends'; a = 'Opening Friends.'; }
  else if (/\bhome\b/.test(s)) { nav = 'home'; a = 'Going home.'; }
  else if (/\bfavou?rites?\b/.test(s)) { S.filter = 'favs'; nav = 'games'; a = 'Showing your favorites.'; }
  else if (/\b(library|games)\b/.test(s)) { S.filter = 'all'; nav = 'games'; a = 'Opening your library.'; }
  else if (/\b(system|info|storage|network)\b/.test(s)) a = `FPEX OS Alpha 0.1 \u00b7 ${navigator.onLine ? 'Online' : 'Offline'} \u00b7 ${S.games.filter(g => g.installed).length} of ${S.games.length} games installed \u00b7 ${storTxt}`;
  else {
    const m = s.match(/^(?:find|search(?: for)?)\s+(.+)$/), r = m ? S.games.filter(g => g.title.toLowerCase().includes(m[1])) : [];
    a = m ? (r.length ? 'Found: ' + r.map(g => g.title).join(', ') : `No library games match "${m[1]}".`) : 'I only understand local commands in this build: open a section, find a game, show favorites, or system info.';
  }
  S.chat.push({ r: 'ai', t: a });
  if (nav) go(nav); else { render(); $('#aiq')?.focus(); if (open) openDetails(open); }
}

/* ---------- actions ---------- */
const toggle = (arr, id) => { const i = arr.indexOf(id); i < 0 ? arr.push(id) : arr.splice(i, 1); };
const ACT = {
  details: id => openDetails(id), sdetails: id => openStore(id), close: closeDlg, search: openSearch, notes: openNotes, addgame: openAdd,
  fav: id => { toggle(S.fav, id || S.sel); save('fav', S.fav); updateHero(); after(); },
  installed: id => { const g = S.games.find(x => x.id === id); g.installed = !g.installed; saveGames(); updateHero(); after(); },
  wish: id => { toggle(S.wish, id); save('wish', S.wish); after(); },
  remove: id => { S.games = S.games.filter(g => g.id !== id); S.fav = S.fav.filter(x => x !== id); saveGames(); save('fav', S.fav); S.sel = null; closeDlg(); refresh(); },
  profile: () => { S.settingsTab = 'General'; go('settings'); },
  filter: (_, t) => { S.filter = t.dataset.filter; refresh(); },
  cat: (_, t) => { S.storeCat = t.dataset.cat; refresh(); },
  tab: (_, t) => { S.settingsTab = t.dataset.tab; refresh(); },
  ask: (_, t) => ask(t.dataset.q),
  rumble: () => { const p = [...(navigator.getGamepads?.() || [])].find(Boolean); p?.vibrationActuator?.playEffect('dual-rumble', { duration: 300, strongMagnitude: .6, weakMagnitude: .6 }); },
  reset: () => { if (confirm('Reset all local FPEX data (library changes, favorites, settings)?')) { Object.keys(localStorage).filter(k => k.startsWith('fpex.')).forEach(k => localStorage.removeItem(k)); location.reload(); } }
};

document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (t) { beep(); ACT[t.dataset.act]?.(t.dataset.id, t, e); } });
document.addEventListener('click', e => { const n = e.target.closest('[data-nav]'); if (n) { beep(); go(n.dataset.nav); } });
document.addEventListener('focusin', e => {
  const d = e.target.dataset || {};
  if (d.game && d.game !== S.sel) { S.sel = d.game; updateHero(); }
  if (d.store) { const it = STORE.find(x => x.id === d.store); if (it) setBg(artFor(it)); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.search !== undefined) return runSearch(t.value);
  const k = t.dataset.set; if (!k) return;
  S.settings[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
  save('settings', S.settings); applySettings();
  if (t.type === 'range' && t.nextElementSibling) t.nextElementSibling.textContent = t.value + (t.dataset.unit || '');
  if (k === 'clock24') tick();
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  if (f.dataset.form === 'ai') { const i = $('#aiq'); const v = i.value; i.value = ''; ask(v); }
  if (f.dataset.form === 'addgame') {
    const d = new FormData(f), title = String(d.get('title') || '').trim(); if (!title) return;
    let art = String(d.get('art') || '').trim(); if (!/^(https?:|data:image\/)/i.test(art)) art = '';
    S.games.push({ id: 'u' + Date.now(), title, cat: d.get('cat'), desc: String(d.get('desc') || '').trim() || 'Added by you.', art, installed: !!d.get('inst'), custom: true, lastPlayed: 0, addedAt: Date.now() });
    saveGames(); closeDlg(); refresh();
  }
});
$('#dlg').addEventListener('click', e => { if (e.target === e.currentTarget) closeDlg(); });

/* ---------- status ---------- */
function tick() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !S.settings.clock24 });
  const dt = $('#dt'); if (dt) dt.textContent = now.toLocaleString();
}
function net() { $('#net').textContent = (navigator.onLine ? '\u25cf Online' : '\u25cb Offline'); }
async function stor() {
  try { const e = await navigator.storage.estimate(); storTxt = `Storage ${(e.usage / e.quota * 100).toFixed(1)}% used`; } catch { storTxt = 'Storage n/a'; }
  $('#stor').textContent = storTxt;
}
addEventListener('online', net); addEventListener('offline', net);
addEventListener('gamepadconnected', e => { S.notes.unshift({ t: 'Controller connected', d: e.gamepad.id }); save('notes', S.notes); if (S.view === 'settings') refresh(); });
addEventListener('gamepaddisconnected', () => { if (S.view === 'settings') refresh(); });

/* ---------- start ---------- */
initInput({
  back: () => { const d = $('#dlg'); if (d.open) { d.close(); return; } if (S.view !== 'home') go('home'); },
  search: () => { if (!$('#dlg').open) openSearch(); },
  fav: () => { if (!$('#dlg').open) ACT.fav(document.activeElement?.dataset?.game || S.sel); },
  menu: () => { closeDlg(); $('#nav [aria-current=page]')?.focus(); },
  context: () => { const id = document.activeElement?.dataset?.game; if (id) openDetails(id); }
});
applySettings(); net(); stor(); setInterval(tick, 1000);
S.sel = (S.games.filter(g => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)[0] || S.games[0])?.id;
render();
const boot = $('#boot');
function endBoot() { if (!boot.isConnected) return; boot.classList.add('out'); setTimeout(() => boot.remove(), 750); focusFirst(); }
if (S.settings.boot) { setTimeout(endBoot, 2600); addEventListener('keydown', endBoot, { once: true }); boot.addEventListener('click', endBoot); } else { boot.remove(); focusFirst(); }

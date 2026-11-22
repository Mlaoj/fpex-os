// Keyboard + gamepad navigation. Spatial focus movement across [data-f] elements.
let volume = 0.6, soundOn = true, ctx = null;
export const setVolume = (v, on) => { volume = v / 100; soundOn = on; };

export function beep() {
  if (!soundOn || volume <= 0) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 520; g.gain.value = 0.05 * volume;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.03);
  } catch {}
}

const visible = e => e.offsetParent !== null && !e.disabled;
const root = () => { const d = document.getElementById('dlg'); return d.open ? d : document.body; };

export function move(dir) {
  const els = [...root().querySelectorAll('[data-f]')].filter(visible);
  const cur = document.activeElement;
  if (!els.includes(cur)) { els[0]?.focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const horiz = dir === 'left' || dir === 'right';
  let best = null, bs = Infinity;
  for (const e of els) {
    if (e === cur) continue;
    const b = e.getBoundingClientRect(), dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
    const ok = dir === 'right' ? dx > 1 : dir === 'left' ? dx < -1 : dir === 'down' ? dy > 1 : dy < -1;
    if (!ok) continue;
    const s = (horiz ? Math.abs(dx) : Math.abs(dy)) + (horiz ? Math.abs(dy) : Math.abs(dx)) * 2.2;
    if (s < bs) { bs = s; best = e; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'center' }); }
}

export function initInput(h) {
  const dirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  addEventListener('keydown', e => {
    const t = e.target, typing = (t.tagName === 'INPUT' && t.type === 'text') || t.tagName === 'TEXTAREA';
    if (e.key === 'Escape') { h.back(); return; }
    if (dirs[e.key]) {
      const lr = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      if (lr && (typing || t.type === 'range')) return;
      e.preventDefault(); move(dirs[e.key]); beep(); return;
    }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); h.search(); }
    else if (e.key === 'f' || e.key === 'F') h.fav();
    else if (e.key === 'Backspace') h.back();
  });

  const next = {}, prev = {};
  (function poll() {
    const gp = [...(navigator.getGamepads?.() || [])].find(g => g && g.connected);
    if (gp) {
      const b = i => !!gp.buttons[i]?.pressed, now = performance.now(), ax = gp.axes;
      const d = { up: b(12) || ax[1] < -0.55, down: b(13) || ax[1] > 0.55, left: b(14) || ax[0] < -0.55, right: b(15) || ax[0] > 0.55 };
      for (const k in d) {
        if (!d[k]) { next[k] = 0; continue; }
        if (!next[k] || now >= next[k]) { move(k); beep(); next[k] = now + (next[k] ? 130 : 380); }
      }
      const edge = (i, fn) => { const p = b(i); if (p && !prev[i]) fn(); prev[i] = p; };
      edge(0, () => document.activeElement?.click());   // A
      edge(1, h.back);                                   // B
      edge(2, h.fav);                                    // X
      edge(3, h.search);                                 // Y
      edge(9, h.menu);                                   // Start
      edge(8, h.context);                                // Select
    }
    requestAnimationFrame(poll);
  })();
}

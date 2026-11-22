// FPEX Adventure — tile platformer. Original code, MIT.
const T = 48;
function build(w, h, items) {
  const gr = Array.from({ length: h }, () => Array(w).fill(' '));
  for (const [ch, c, r, n = 1, dir = 'h'] of items) for (let i = 0; i < n; i++) { const cc = dir === 'h' ? c + i : c, rr = dir === 'h' ? r : r + i; if (gr[rr] && cc < w) gr[rr][cc] = ch; }
  return gr.map(a => a.join(''));
}
const ground = (w, gaps = []) => [['#', 0, 12, w], ['#', 0, 13, w], ...gaps.flatMap(([c, n]) => [[' ', c, 12, n], [' ', c, 13, n]])];
const LEVELS = [
  { name: 'First Light', w: 48, map: [...ground(48, [[22, 3]]), ['P', 2, 11], ['E', 45, 11], ['o', 8, 10, 3], ['#', 14, 10, 4], ['o', 15, 8, 2], ['o', 22, 9, 3], ['^', 30, 11, 2], ['g', 35, 11], ['#', 38, 10, 3], ['o', 38, 8, 3], ['o', 26, 11, 2], ['o', 43, 11]] },
  { name: 'High Wire', w: 60, map: [...ground(60, [[12, 3], [30, 3], [44, 3]]), ['P', 2, 11], ['E', 57, 11], ['o', 6, 10, 3], ['o', 12, 9, 3], ['#', 18, 10, 3], ['#', 22, 8, 3], ['o', 18, 8, 3], ['o', 22, 6, 3], ['g', 26, 11], ['^', 34, 11, 3], ['o', 30, 9, 3], ['#', 38, 10, 3], ['g', 39, 9], ['o', 44, 9, 3], ['#', 49, 10, 2], ['#', 52, 8, 3], ['o', 52, 6, 3], ['o', 40, 11]] },
  { name: 'Long Fall', w: 72, map: [...ground(72, [[20, 31]]), ['P', 2, 11], ['E', 69, 11], ['o', 5, 10, 4], ['^', 12, 11, 2], ['g', 16, 11], ['#', 21, 11, 3], ['#', 26, 10, 2], ['#', 30, 9, 2], ['#', 34, 10, 2], ['#', 38, 11, 2], ['#', 43, 10, 3], ['#', 48, 11, 2], ['o', 21, 9, 3], ['o', 26, 8, 2], ['o', 30, 7, 2], ['o', 34, 8, 2], ['o', 43, 8, 3], ['g', 59, 11], ['^', 62, 11, 2], ['o', 55, 10, 3], ['o', 66, 10, 2]] }
].map(l => ({ ...l, grid: build(l.w, 14, l.map) }));

export default {
  create(ctx) {
    const { g, canvas, input: I, audio, load, save } = ctx;
    let state = 'title', unlocked = load('unlocked', 1), best = load('best', {}), li = Math.min(unlocked, LEVELS.length) - 1, sel = li;
    let L, W, H, tiles, p, en, got, total, need, lives = 3, camX = 0, time = 0, timer = 0;
    const tile = (c, r) => (r < 0 || r >= H) ? ' ' : (c < 0 || c >= W) ? '#' : tiles[r][c];

    function load_(i) {
      li = i; L = LEVELS[i]; W = L.w; H = 14; tiles = L.grid.map(s => s.split('')); en = []; total = 0;
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        const ch = tiles[r][c];
        if (ch === 'P') { p = { x: c * T + 11, y: r * T + 8, w: 26, h: 40, vx: 0, vy: 0, on: false, face: 1, coy: 0, buf: 0 }; tiles[r][c] = ' '; }
        else if (ch === 'g') { en.push({ x: c * T + 9, y: r * T + 20, w: 30, h: 28, dir: -1 }); tiles[r][c] = ' '; }
        else if (ch === 'o') total++;
      }
      need = Math.max(1, Math.floor(total * .7)); got = 0; camX = 0; time = 0; state = 'play';
    }
    function newGame(i) { lives = 3; load_(i); }
    const solid = (c, r) => tile(c, r) === '#';
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    function die() { if (state !== 'play') return; lives--; audio.beep(160, .35, 'sawtooth'); state = 'dead'; timer = .9; }

    canvas.addEventListener('pointerdown', () => { if (state === 'title') newGame(sel); else if (state === 'clear' || state === 'over' || state === 'win') advance(); });
    function advance() {
      if (state === 'clear') { load_(li + 1); }
      else if (state === 'over') { lives = 3; load_(li); }
      else if (state === 'win') state = 'title';
    }

    function update(dt) {
      if (state === 'title') {
        if (I.pressed('left')) sel = Math.max(0, sel - 1); if (I.pressed('right')) sel = Math.min(unlocked - 1, sel + 1);
        if (I.pressed('a')) newGame(sel);
        return;
      }
      if (state === 'clear' || state === 'over' || state === 'win') { if (I.pressed('a')) advance(); return; }
      if (state === 'dead') { timer -= dt; if (timer <= 0) { if (lives <= 0) state = 'over'; else load_(li); } return; }
      time += dt;
      const target = I.axisX * 250, k = Math.min(1, (p.on ? 14 : 7) * dt);
      p.vx += (target - p.vx) * k; if (Math.abs(I.axisX) > .1) p.face = I.axisX > 0 ? 1 : -1;
      const jp = I.pressed('a') || I.pressed('up'), jh = I.held('a') || I.held('up');
      p.buf = jp ? .12 : p.buf - dt; p.coy = p.on ? .1 : p.coy - dt;
      if (p.buf > 0 && p.coy > 0) { p.vy = -780; p.buf = 0; p.coy = 0; audio.beep(520, .09, 'square', .05); }
      p.vy += (p.vy < -200 && !jh ? 5200 : 2300) * dt; p.vy = Math.min(p.vy, 1000);
      // horizontal
      p.x += p.vx * dt;
      for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - .01) / T); r++) for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - .01) / T); c++) if (solid(c, r)) { if (p.vx > 0) p.x = c * T - p.w; else if (p.vx < 0) p.x = (c + 1) * T; p.vx = 0; }
      // vertical
      p.y += p.vy * dt; p.on = false;
      for (let c = Math.floor(p.x / T); c <= Math.floor((p.x + p.w - .01) / T); c++) for (let r = Math.floor(p.y / T); r <= Math.floor((p.y + p.h - .01) / T); r++) if (solid(c, r)) { if (p.vy > 0) { p.y = r * T - p.h; p.on = true; } else if (p.vy < 0) p.y = (r + 1) * T; p.vy = 0; }
      if (p.y > H * T + 150) return die();
      // coins, spikes, exit
      const pc = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
      for (let r = Math.floor(p.y / T) - 1; r <= Math.floor((p.y + p.h) / T) + 1; r++) for (let c = Math.floor(p.x / T) - 1; c <= Math.floor((p.x + p.w) / T) + 1; c++) {
        const ch = tile(c, r);
        if (ch === 'o' && Math.hypot(pc.x - (c * T + T / 2), pc.y - (r * T + T / 2)) < 30) { tiles[r][c] = ' '; got++; audio.beep(880 + got * 10, .07, 'triangle', .07); }
        else if (ch === '^' && hit(p, { x: c * T + 8, y: r * T + T * .5, w: T - 16, h: T * .5 })) return die();
        else if (ch === 'E' && hit(p, { x: c * T + 10, y: r * T, w: T - 20, h: T }) && got >= need) {
          state = 'clear'; best[li] = Math.max(best[li] || 0, got); save('best', best); audio.beep(988, .4);
          if (li + 1 < LEVELS.length) { unlocked = Math.max(unlocked, li + 2); save('unlocked', unlocked); } else state = 'win';
          return;
        }
      }
      // enemies
      for (const e of en) {
        if (e.dead) continue;
        e.x += e.dir * 70 * dt;
        const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, fc = Math.floor(fx / T);
        if (solid(fc, Math.floor((e.y + e.h / 2) / T)) || !solid(fc, Math.floor((e.y + e.h + 4) / T))) e.dir *= -1;
        if (hit(p, e)) {
          if (p.vy > 0 && p.y + p.h - e.y < 24) { e.dead = true; p.vy = -460; audio.beep(300, .12, 'square'); } else return die();
        }
      }
      en = en.filter(e => !e.dead);
      const z = ctx.h / (H * T); camX = Math.max(0, Math.min(W * T - ctx.w / z, p.x - ctx.w / z / 2));
    }

    const text = (s, x, y, size, color = '#f2f2f2', align = 'center', weight = 600) => { g.font = `${weight} ${size}px Inter,system-ui,sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };

    function render() {
      const w = ctx.w, h = ctx.h;
      g.fillStyle = '#0e0f11'; g.fillRect(0, 0, w, h);
      if (state === 'title') {
        text('FPEX ADVENTURE', w / 2, h * .3, Math.min(54, w / 10), '#f2f2f2', 'center', 700);
        text('Collect coins. Reach the flag.', w / 2, h * .3 + 34, 18, '#a0a0a6', 'center', 400);
        for (let i = 0; i < LEVELS.length; i++) {
          const x = w / 2 + (i - 1) * 190, y = h * .5, ok = i < unlocked;
          g.fillStyle = '#1a1a1d'; g.fillRect(x - 80, y, 160, 96); g.lineWidth = i === sel ? 3 : 1; g.strokeStyle = i === sel ? '#fff' : '#3a3b40'; g.strokeRect(x - 80, y, 160, 96);
          text((i + 1) + '. ' + LEVELS[i].name, x, y + 38, 17, ok ? '#f2f2f2' : '#5a5b60'); text(ok ? (best[i] != null ? 'Best coins: ' + best[i] : 'Not cleared') : 'Locked', x, y + 68, 14, '#a0a0a6', 'center', 400);
        }
        text('Left / Right to choose \u00b7 A or Enter to start \u00b7 or tap', w / 2, h * .5 + 150, 15, '#a0a0a6', 'center', 400);
        return;
      }
      const z = h / (H * T);
      g.save(); g.scale(z, z); g.translate(-camX, 0);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,.025)'; g.fillRect(i * 520 - camX * .3 + camX, 180 + (i % 3) * 70, 300, 420); }
      const c0 = Math.floor(camX / T), c1 = Math.ceil((camX + w / z) / T);
      for (let r = 0; r < H; r++) for (let c = c0; c <= c1; c++) {
        const ch = tile(c, r), x = c * T, y = r * T;
        if (ch === '#') { g.fillStyle = '#34353a'; g.fillRect(x, y, T, T); g.fillStyle = '#d6d6da'; if (tile(c, r - 1) !== '#') g.fillRect(x, y, T, 6); }
        else if (ch === 'o') { g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(x + T / 2, y + T / 2 + Math.sin(time * 5 + c) * 3, 9, 0, 7); g.fill(); }
        else if (ch === '^') { g.fillStyle = '#8a8a90'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * 16, y + T); g.lineTo(x + k * 16 + 8, y + T * .5); g.lineTo(x + k * 16 + 16, y + T); g.fill(); } }
        else if (ch === 'E') { g.fillStyle = '#d6d6da'; g.fillRect(x + 20, y - 6, 4, T + 6); g.fillStyle = got >= need ? '#f2f2f2' : 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(x + 24, y - 6); g.lineTo(x + 46, y + 8); g.lineTo(x + 24, y + 22); g.fill(); }
      }
      for (const e of en) { g.fillStyle = '#7a7b80'; g.fillRect(e.x, e.y, e.w, e.h); g.fillStyle = '#0e0f11'; g.fillRect(e.x + (e.dir > 0 ? 18 : 4), e.y + 7, 8, 8); }
      if (state !== 'dead' || Math.floor(timer * 12) % 2) {
        g.fillStyle = '#f2f2f2'; g.fillRect(p.x, p.y, p.w, p.h); g.fillStyle = '#0e0f11'; g.fillRect(p.x + (p.face > 0 ? 15 : 4), p.y + 8, 7, 7);
      }
      g.restore();
      text('Level ' + (li + 1) + ' \u00b7 ' + L.name, 24, 40, 18, '#a0a0a6', 'left', 500);
      text('Coins ' + got + ' / ' + need + ' needed (' + total + ' total)', 24, 68, 18, '#f2f2f2', 'left');
      text('Lives ' + '\u25cf '.repeat(Math.max(0, lives)).trim(), w - 24, 40, 18, '#f2f2f2', 'right');
      if (got < need && state === 'play') text('Collect ' + (need - got) + ' more to open the exit', w - 24, 68, 14, '#a0a0a6', 'right', 400);
      if (state === 'clear' || state === 'over' || state === 'win') {
        g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, w, h);
        const t = { clear: 'LEVEL CLEARED', over: 'GAME OVER', win: 'ADVENTURE COMPLETE' }[state];
        text(t, w / 2, h * .42, 48, '#f2f2f2', 'center', 700);
        text(state === 'over' ? 'Restarting this level with 3 lives' : 'Coins ' + got + ' / ' + total, w / 2, h * .42 + 38, 20, '#d8d8dc', 'center', 400);
        text('A / Enter / tap to continue', w / 2, h * .42 + 80, 16, '#a0a0a6', 'center', 400);
      }
    }
    return { update, render, restart() { if (state === 'title') return; lives = 3; load_(li); } };
  }
};

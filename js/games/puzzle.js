// FPEX Puzzle — sliding tiles with three difficulties, scoring and saved progress. Original code, MIT.
const LV = [{ n: 'Easy', s: 3, sh: 60 }, { n: 'Medium', s: 4, sh: 160 }, { n: 'Hard', s: 5, sh: 320 }];
const fmt = t => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; };

export default {
  create(ctx) {
    const { g, canvas, input: I, audio, load, save } = ctx;
    let state = 'menu', best = load('best', {}), run = load('run', null), msel = run ? 0 : 1, solvedCount = load('solved', 0);
    let lv = 0, s = 3, tiles = [], disp = {}, moves = 0, time = 0, score = 0, record = false;
    const items = () => [...(run ? [{ k: 'resume', t: 'Resume puzzle (' + LV[run.lv].n + ')' }] : []), ...LV.map((l, i) => ({ k: i, t: l.n + ' \u00b7 ' + l.s + '\u00d7' + l.s }))];

    function place() { tiles.forEach((v, i) => { if (v) disp[v] = disp[v] || { x: i % s, y: (i / s) | 0 }; }); }
    function begin(i, saved) {
      lv = i; s = LV[i].s;
      if (saved) { tiles = saved.tiles.slice(); moves = saved.moves; time = saved.time; }
      else {
        tiles = Array.from({ length: s * s }, (_, k) => (k + 1) % (s * s)); let b = s * s - 1, prev = -1;
        for (let k = 0; k < LV[i].sh; k++) {
          const r = (b / s) | 0, c = b % s, opts = [];
          if (r > 0) opts.push(b - s); if (r < s - 1) opts.push(b + s); if (c > 0) opts.push(b - 1); if (c < s - 1) opts.push(b + 1);
          const o = opts.filter(x => x !== prev), n = o[(Math.random() * o.length) | 0];
          tiles[b] = tiles[n]; tiles[n] = 0; prev = b; b = n;
        }
        moves = 0; time = 0;
      }
      disp = {}; place(); state = 'play'; record = false;
      persist();
    }
    const persist = () => { run = { lv, tiles: tiles.slice(), moves, time }; save('run', run); };
    const solved = () => tiles.every((v, i) => v === (i + 1) % (s * s));

    function slide(i) {
      const b = tiles.indexOf(0), r = (i / s) | 0, c = i % s, br = (b / s) | 0, bc = b % s;
      if (i === b || (r !== br && c !== bc)) return false;
      if (r === br) { const d = c < bc ? 1 : -1; for (let k = bc; k !== c; k -= d) tiles[br * s + k] = tiles[br * s + k - d]; }
      else { const d = r < br ? 1 : -1; for (let k = br; k !== r; k -= d) tiles[k * s + bc] = tiles[(k - d) * s + bc]; }
      tiles[i] = 0; moves++; audio.beep(420, .04, 'triangle');
      if (solved()) {
        score = Math.max(100, Math.round(s * s * 150 - moves * 4 - time * 2));
        const o = best[lv]; if (!o || score > o.score) { best[lv] = { score, moves, time: Math.round(time) }; record = true; save('best', best); }
        solvedCount++; save('solved', solvedCount); run = null; save('run', null); state = 'solved'; audio.beep(880, .4);
      } else persist();
      return true;
    }
    const geo = () => { const w = ctx.w, h = ctx.h, size = Math.max(120, Math.min(w - 40, h - 150)); return { size, x0: (w - size) / 2, y0: 100 + (h - 150 - size) / 2, cell: size / s }; };
    const menuRects = () => items().map((_, i) => ({ x: ctx.w / 2 - 170, y: ctx.h * .36 + i * 64, w: 340, h: 52 }));
    const choose = k => k === 'resume' ? begin(run.lv, run) : begin(k, null);

    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (state === 'menu') menuRects().forEach((m, i) => { if (x > m.x && x < m.x + m.w && y > m.y && y < m.y + m.h) choose(items()[i].k); });
      else if (state === 'solved') { state = 'menu'; msel = 1; }
      else { const { x0, y0, cell } = geo(), c = Math.floor((x - x0) / cell), rr = Math.floor((y - y0) / cell); if (c >= 0 && c < s && rr >= 0 && rr < s) slide(rr * s + c); }
    });

    function update(dt) {
      if (state === 'menu') {
        const n = items().length;
        if (I.pressed('up')) msel = (msel + n - 1) % n; if (I.pressed('down')) msel = (msel + 1) % n;
        if (I.pressed('a')) choose(items()[msel].k);
        return;
      }
      if (state === 'solved') { if (I.pressed('a') || I.pressed('b')) { state = 'menu'; msel = 1; } return; }
      time += dt;
      const b = tiles.indexOf(0), bc = b % s;
      if (I.pressed('left') && bc < s - 1) slide(b + 1);
      else if (I.pressed('right') && bc > 0) slide(b - 1);
      else if (I.pressed('up') && b + s < s * s) slide(b + s);
      else if (I.pressed('down') && b - s >= 0) slide(b - s);
      const k = 1 - Math.exp(-18 * dt);
      tiles.forEach((v, i) => { if (v) { const d = disp[v]; d.x += ((i % s) - d.x) * k; d.y += (((i / s) | 0) - d.y) * k; } });
      if (Math.floor(time) % 5 === 0 && Math.floor(time - dt) % 5 !== 0) persist();
    }

    const text = (t, x, y, size, color = '#f2f2f2', align = 'center', weight = 600) => { g.font = `${weight} ${size}px Inter,system-ui,sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(t, x, y); };

    function render() {
      const w = ctx.w, h = ctx.h;
      g.fillStyle = '#0d0d0e'; g.fillRect(0, 0, w, h);
      if (state === 'menu') {
        text('FPEX PUZZLE', w / 2, h * .2, Math.min(54, w / 10), '#f2f2f2', 'center', 700);
        text('Slide the tiles into order. Puzzles solved: ' + solvedCount, w / 2, h * .2 + 32, 16, '#a0a0a6', 'center', 400);
        const its = items();
        menuRects().forEach((m, i) => {
          g.fillStyle = '#1a1a1d'; g.fillRect(m.x, m.y, m.w, m.h); g.lineWidth = i === msel ? 3 : 1; g.strokeStyle = i === msel ? '#fff' : '#3a3b40'; g.strokeRect(m.x, m.y, m.w, m.h);
          text(its[i].t, m.x + 18, m.y + 32, 18, '#f2f2f2', 'left');
          const bb = typeof its[i].k === 'number' ? best[its[i].k] : null;
          if (bb) text('Best ' + bb.score, m.x + m.w - 16, m.y + 32, 14, '#a0a0a6', 'right', 500);
        });
        return;
      }
      const { size, x0, y0, cell } = geo(), gap = Math.max(3, cell * .05);
      text(LV[lv].n + ' \u00b7 ' + s + '\u00d7' + s, 24, 40, 18, '#a0a0a6', 'left', 500);
      text('Moves ' + moves, w - 24, 40, 18, '#f2f2f2', 'right'); text(fmt(time), w - 24, 66, 16, '#d8d8dc', 'right', 500);
      g.fillStyle = '#1a1a1d'; g.fillRect(x0 - 8, y0 - 8, size + 16, size + 16);
      tiles.forEach(v => {
        if (!v) return; const d = disp[v], x = x0 + d.x * cell + gap / 2, y = y0 + d.y * cell + gap / 2, tw = cell - gap;
        const home = tiles[v - 1] === v;
        g.fillStyle = home ? '#dcdce0' : '#2e2f34'; g.beginPath(); g.roundRect ? g.roundRect(x, y, tw, tw, 10) : g.rect(x, y, tw, tw); g.fill();
        text(v + '', x + tw / 2, y + tw / 2 + cell * .13, cell * .38, home ? '#0d0d0e' : '#f2f2f2', 'center', 700);
      });
      text('Arrows or tap a tile \u00b7 progress is saved automatically', w / 2, h - 18, 13, '#a0a0a6', 'center', 400);
      if (state === 'solved') {
        g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(0, 0, w, h);
        text('SOLVED', w / 2, h * .38, 56, '#f2f2f2', 'center', 700);
        text('Score ' + score + ' \u00b7 ' + moves + ' moves \u00b7 ' + fmt(time), w / 2, h * .38 + 40, 22, '#d8d8dc', 'center', 500);
        if (record) text('New best for ' + LV[lv].n + '!', w / 2, h * .38 + 74, 18, '#f2f2f2', 'center', 700);
        text('A / Enter / tap to continue', w / 2, h * .38 + 112, 15, '#a0a0a6', 'center', 400);
      }
    }
    return { update, render, restart() { if (state === 'menu') return; begin(lv, null); } };
  }
};

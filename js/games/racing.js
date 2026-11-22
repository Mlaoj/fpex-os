// FPEX Racing — top-down arcade racing. Original code, MIT.
const TRACKS = [
  { name: 'Coastline', w: 200, laps: 3, pts: [[0, -700], [900, -650], [1300, 0], [900, 700], [0, 750], [-900, 650], [-1300, 0], [-900, -650]] },
  { name: 'Switchback', w: 180, laps: 3, pts: [[0, -800], [700, -800], [1100, -300], [600, 100], [1100, 500], [500, 900], [-300, 800], [-800, 300], [-500, -100], [-1000, -400], [-700, -800]] },
  { name: 'Needle', w: 160, laps: 3, pts: [[0, -500], [600, -600], [900, -100], [500, 300], [800, 700], [0, 900], [-700, 600], [-500, 100], [-900, -200], [-600, -550]] }
];
const MAXV = 640;
const fmt = t => { if (!isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

function spline(pts, n = 22) {
  const out = [], L = pts.length;
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i + L - 1) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}

export default {
  create(ctx) {
    const { g, canvas, input: I, audio, load, save } = ctx;
    let ti = load('track', 0), state = 'menu', best = load('best', {});
    let cs, car, prog, idx, lastFloor, cd, lastCd, raceT, lapT, lapTimes, newBest, wrong, offroad = false, sel = ti;

    function course(i) {
      const tk = TRACKS[i], S = spline(tk.pts), path = new Path2D();
      S.forEach((p, k) => k ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])); path.closePath();
      return { tk, S, N: S.length, path };
    }
    function start(i) {
      ti = i; sel = i; save('track', i); cs = course(i);
      const { S, N } = cs, si = N - 10, n = (si + 1) % N;
      car = { x: S[si][0], y: S[si][1], a: Math.atan2(S[n][1] - S[si][1], S[n][0] - S[si][0]), vx: 0, vy: 0 };
      idx = si; prog = si - N; lastFloor = -1; cd = 3.2; lastCd = 4; raceT = 0; lapT = 0; lapTimes = []; newBest = false; wrong = 0; state = 'count';
    }
    const nearest = (x, y, from) => {
      const { S, N } = cs; let bq = 1e18, bi = from;
      for (let d = -40; d <= 40; d++) { const i = (from + d + N * 4) % N, p = S[i], dx = p[0] - x, dy = p[1] - y, q = dx * dx + dy * dy; if (q < bq) { bq = q; bi = i; } }
      return [bi, Math.sqrt(bq)];
    };
    const cards = () => { const cw = Math.min(260, (ctx.w - 80) / 3), gap = 24, x0 = (ctx.w - (cw * 3 + gap * 2)) / 2, y = ctx.h * .42, ch = 150; return [0, 1, 2].map(i => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch })); };

    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (state === 'menu') cards().forEach((c, i) => { if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) start(i); });
      else if (state === 'done') start(ti);
    });

    function update(dt) {
      if (state === 'menu') {
        if (I.pressed('left')) sel = (sel + 2) % 3; if (I.pressed('right')) sel = (sel + 1) % 3;
        if (I.pressed('a')) start(sel);
        return;
      }
      if (state === 'done') { if (I.pressed('a')) start(ti); if (I.pressed('b')) state = 'menu'; return; }
      if (state === 'count') {
        cd -= dt; const c = Math.ceil(cd);
        if (c !== lastCd) { lastCd = c; if (c > 0) audio.beep(440, .12); else audio.beep(880, .3); }
        if (cd <= 0) state = 'race';
        return;
      }
      const { tk, N } = cs;
      const gas = I.held('up') || I.held('a'), brake = I.held('down') || I.held('b'), st = I.axisX;
      let { a, vx, vy } = car;
      let fx = Math.cos(a), fy = Math.sin(a), fwd = vx * fx + vy * fy, lat = -vx * fy + vy * fx;
      if (gas) fwd += (fwd < 0 ? 900 : 430) * dt;
      if (brake) fwd -= (fwd > 0 ? 1000 : 300) * dt;
      if (!gas && !brake) fwd *= Math.exp(-.7 * dt);
      fwd *= Math.exp(-.12 * dt);
      fwd = Math.max(-170, Math.min(fwd, offroad ? MAXV * .45 : MAXV));
      lat *= Math.exp(-(brake && Math.abs(fwd) > 200 ? 3 : 7.5) * dt);
      a += st * 2.5 * Math.max(-1, Math.min(1, fwd / 260)) * (1 - Math.min(.45, Math.abs(fwd) / 1500)) * dt;
      fx = Math.cos(a); fy = Math.sin(a);
      vx = fx * fwd - fy * lat; vy = fy * fwd + fx * lat;
      car.x += vx * dt; car.y += vy * dt;
      const [bi, d] = nearest(car.x, car.y, idx), p = cs.S[bi], lim = tk.w / 2 + 170;
      if (d > lim) {
        const nx = (car.x - p[0]) / d, ny = (car.y - p[1]) / d;
        car.x = p[0] + nx * lim; car.y = p[1] + ny * lim;
        const vn = vx * nx + vy * ny; if (vn > 0) { vx -= vn * nx * 1.6; vy -= vn * ny * 1.6; }
      }
      offroad = d > tk.w / 2;
      Object.assign(car, { a, vx, vy });
      let di = bi - idx; if (di > N / 2) di -= N; if (di < -N / 2) di += N;
      prog += di; idx = bi; wrong = di < 0 && fwd > 40 ? wrong + dt : 0;
      raceT += dt;
      const f = Math.floor(prog / N);
      if (f > lastFloor) {
        if (f === 0) lapT = 0;
        else {
          lapTimes.push(lapT); audio.beep(740, .2); lapT = 0;
          const lt = lapTimes[lapTimes.length - 1];
          if (!(best[ti] <= lt)) { best[ti] = lt; newBest = true; }
          if (f >= tk.laps) { save('best', best); state = 'done'; audio.beep(988, .5); }
        }
        lastFloor = f;
      }
      if (f >= 0) lapT += dt;
    }

    function text(s, x, y, size, color = '#f2f2f2', align = 'left', weight = 600) { g.font = `${weight} ${size}px Inter,system-ui,sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }

    function render() {
      const w = ctx.w, h = ctx.h;
      g.fillStyle = '#0d0d0e'; g.fillRect(0, 0, w, h);
      if (state === 'menu') {
        text('FPEX RACING', w / 2, h * .25, Math.min(54, w / 10), '#f2f2f2', 'center', 700);
        text('Choose a track', w / 2, h * .25 + 36, 18, '#a0a0a6', 'center', 400);
        cards().forEach((c, i) => {
          g.fillStyle = '#1a1a1d'; g.fillRect(c.x, c.y, c.w, c.h); g.lineWidth = i === sel ? 3 : 1; g.strokeStyle = i === sel ? '#fff' : '#3a3b40'; g.strokeRect(c.x, c.y, c.w, c.h);
          text(TRACKS[i].name, c.x + 18, c.y + 44, 22); text(TRACKS[i].laps + ' laps', c.x + 18, c.y + 72, 15, '#a0a0a6', 'left', 400);
          text('Best  ' + fmt(best[i]), c.x + 18, c.y + c.h - 22, 16, '#d8d8dc', 'left', 500);
        });
        text('Left / Right to choose \u00b7 A or Enter to race \u00b7 or tap a track', w / 2, h * .42 + 200, 15, '#a0a0a6', 'center', 400);
        return;
      }
      const { tk, S, path } = cs, z = Math.max(.4, Math.min(1.2, Math.min(w, h) / 800));
      g.save(); g.translate(w / 2, h / 2); g.scale(z, z); g.translate(-car.x - car.vx * .2, -car.y - car.vy * .2);
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.strokeStyle = '#202124'; g.lineWidth = tk.w + 360; g.stroke(path);
      g.strokeStyle = '#cfcfd2'; g.lineWidth = tk.w + 16; g.stroke(path);
      g.strokeStyle = '#2c2d31'; g.lineWidth = tk.w; g.stroke(path);
      g.setLineDash([30, 30]); g.strokeStyle = '#5a5b60'; g.lineWidth = 4; g.stroke(path); g.setLineDash([]);
      const a0 = S[0], a1 = S[1], tx = a1[0] - a0[0], ty = a1[1] - a0[1], tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
      g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.moveTo(a0[0] - nx * tk.w / 2, a0[1] - ny * tk.w / 2); g.lineTo(a0[0] + nx * tk.w / 2, a0[1] + ny * tk.w / 2); g.stroke();
      g.translate(car.x, car.y); g.rotate(car.a);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-20, -9, 46, 24);
      g.fillStyle = '#f2f2f2'; g.fillRect(-22, -11, 46, 22); g.fillStyle = '#18181a'; g.fillRect(2, -8, 10, 16); g.fillStyle = '#9a9aa0'; g.fillRect(-22, -11, 5, 22);
      g.restore();

      const sp = Math.round(Math.hypot(car.vx, car.vy) * .36), N = cs.N, lap = Math.max(1, Math.min(tk.laps, Math.floor(prog / N) + 1));
      text(sp + '', 28, h - 60, 56, '#f2f2f2', 'left', 700); text('KM/H', 30, h - 34, 14, '#a0a0a6', 'left', 600);
      text('LAP ' + lap + ' / ' + tk.laps, w - 24, 44, 24, '#f2f2f2', 'right'); text(fmt(lapT), w - 24, 72, 18, '#d8d8dc', 'right', 500);
      text('Best ' + fmt(best[ti]), w - 24, 96, 14, '#a0a0a6', 'right', 400);
      text(tk.name, 24, 44, 18, '#a0a0a6', 'left', 500);
      if (offroad && state === 'race') text('OFF TRACK', w / 2, 80, 18, '#a0a0a6', 'center');
      if (wrong > 1.2) text('WRONG WAY', w / 2, 110, 24, '#f2f2f2', 'center', 700);
      if (state === 'count') text(cd > 0 ? Math.ceil(cd) + '' : 'GO', w / 2, h * .38, 96, '#f2f2f2', 'center', 700);
      if (state === 'race' && raceT < .8) text('GO', w / 2, h * .38, 96, '#f2f2f2', 'center', 700);
      if (state === 'done') {
        g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 0, w, h);
        text('FINISHED', w / 2, h * .34, 52, '#f2f2f2', 'center', 700); text('Total  ' + fmt(raceT), w / 2, h * .34 + 46, 24, '#f2f2f2', 'center', 500);
        lapTimes.forEach((t, i) => text('Lap ' + (i + 1) + '   ' + fmt(t), w / 2, h * .34 + 84 + i * 26, 18, '#d8d8dc', 'center', 400));
        if (newBest) text('New best lap!', w / 2, h * .34 + 100 + lapTimes.length * 26, 18, '#f2f2f2', 'center', 700);
        text('A / Enter / tap: race again \u00b7 B / X key: track select', w / 2, h - 50, 15, '#a0a0a6', 'center', 400);
      }
    }
    return { update, render, restart() { if (state !== 'menu') start(ti); } };
  }
};

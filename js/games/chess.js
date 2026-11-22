// FPEX Chess — full rules engine + canvas UI for two local players. Original code, MIT.
const isW = p => p >= 'A' && p <= 'Z';
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const GLYPH = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };

function newPos() {
  const b = Array(64).fill('');
  'rnbqkbnr'.split('').forEach((p, c) => { b[c] = p; b[8 + c] = 'p'; b[48 + c] = 'P'; b[56 + c] = p.toUpperCase(); });
  return { b, t: 'w', c: { K: 1, Q: 1, k: 1, q: 1 }, ep: -1, half: 0 };
}

function attacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7, own = by === 'w', pr = own ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (inb(pr, c + dc) && b[pr * 8 + c + dc] === (own ? 'P' : 'p')) return true;
  for (const [dr, dc] of KN) if (inb(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === (own ? 'N' : 'n')) return true;
  for (const [dr, dc] of KG) if (inb(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === (own ? 'K' : 'k')) return true;
  for (const [dirs, set] of [[DIAG, 'bq'], [ORTH, 'rq']]) for (const [dr, dc] of dirs) {
    let rr = r + dr, cc = c + dc;
    while (inb(rr, cc)) { const p = b[rr * 8 + cc]; if (p) { if (isW(p) === own && set.includes(p.toLowerCase())) return true; break; } rr += dr; cc += dc; }
  }
  return false;
}

function pseudo(pos) {
  const { b, t } = pos, me = t === 'w', out = [];
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (!p || isW(p) !== me) continue;
    const r = s >> 3, c = s & 7, tp = p.toLowerCase();
    if (tp === 'p') {
      const d = me ? -1 : 1, start = me ? 6 : 1, last = me ? 0 : 7, r1 = r + d;
      const add = to => { if (to >> 3 === last) for (const promo of ['q', 'r', 'b', 'n']) out.push({ f: s, t: to, promo }); else out.push({ f: s, t: to }); };
      if (inb(r1, c) && !b[r1 * 8 + c]) { add(r1 * 8 + c); if (r === start && !b[(r + 2 * d) * 8 + c]) out.push({ f: s, t: (r + 2 * d) * 8 + c, dbl: 1 }); }
      for (const dc of [-1, 1]) {
        if (!inb(r1, c + dc)) continue;
        const to = r1 * 8 + c + dc, q = b[to];
        if (q && isW(q) !== me) add(to); else if (!q && to === pos.ep) out.push({ f: s, t: to, ep: 1 });
      }
    } else if (tp === 'n' || tp === 'k') {
      for (const [dr, dc] of tp === 'n' ? KN : KG) { if (!inb(r + dr, c + dc)) continue; const to = (r + dr) * 8 + c + dc, q = b[to]; if (!q || isW(q) !== me) out.push({ f: s, t: to }); }
      if (tp === 'k') {
        const opp = me ? 'b' : 'w', home = me ? 60 : 4, rk = me ? 'R' : 'r';
        if (s === home && !attacked(b, home, opp)) {
          if (pos.c[me ? 'K' : 'k'] && !b[home + 1] && !b[home + 2] && b[home + 3] === rk && !attacked(b, home + 1, opp)) out.push({ f: s, t: home + 2, castle: 1 });
          if (pos.c[me ? 'Q' : 'q'] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === rk && !attacked(b, home - 1, opp)) out.push({ f: s, t: home - 2, castle: 1 });
        }
      }
    } else {
      for (const [dr, dc] of tp === 'b' ? DIAG : tp === 'r' ? ORTH : [...DIAG, ...ORTH]) {
        let rr = r + dr, cc = c + dc;
        while (inb(rr, cc)) { const to = rr * 8 + cc, q = b[to]; if (!q) out.push({ f: s, t: to }); else { if (isW(q) !== me) out.push({ f: s, t: to }); break; } rr += dr; cc += dc; }
      }
    }
  }
  return out;
}

function apply(pos, m) {
  const b = pos.b.slice(), p = b[m.f], me = isW(p), c = { ...pos.c }; let ep = -1;
  const cap = !!pos.b[m.t] || m.ep;
  b[m.t] = m.promo ? (me ? m.promo.toUpperCase() : m.promo) : p; b[m.f] = '';
  if (m.ep) b[m.t + (me ? 8 : -8)] = '';
  if (m.dbl) ep = (m.f + m.t) / 2;
  if (m.castle) { const kingside = m.t > m.f, rf = kingside ? m.f + 3 : m.f - 4, rt = kingside ? m.f + 1 : m.f - 1; b[rt] = b[rf]; b[rf] = ''; }
  if (p === 'K') c.K = c.Q = 0; if (p === 'k') c.k = c.q = 0;
  for (const s of [m.f, m.t]) { if (s === 63) c.K = 0; if (s === 56) c.Q = 0; if (s === 7) c.k = 0; if (s === 0) c.q = 0; }
  return { b, t: me ? 'b' : 'w', c, ep, half: p.toLowerCase() === 'p' || cap ? 0 : pos.half + 1 };
}
const kingSq = (pos, me) => pos.b.indexOf(me ? 'K' : 'k');
const inCheck = pos => attacked(pos.b, kingSq(pos, pos.t === 'w'), pos.t === 'w' ? 'b' : 'w');
function legal(pos) {
  const me = pos.t === 'w';
  return pseudo(pos).filter(m => { const n = apply(pos, m); return !attacked(n.b, kingSq(n, me), me ? 'b' : 'w'); });
}
function insufficient(pos) {
  const rest = pos.b.filter(p => p && p.toLowerCase() !== 'k');
  return rest.length === 0 || (rest.length === 1 && 'bn'.includes(rest[0].toLowerCase()));
}
const name = s => 'abcdefgh'[s & 7] + (8 - (s >> 3));

export default {
  create(ctx) {
    const { g, canvas, input: I, audio } = ctx;
    let pos, hist, moves, sel, cur, last, promo, over, check;
    function reset() { pos = newPos(); hist = []; moves = legal(pos); sel = null; cur = 52; last = null; promo = null; over = null; check = false; }
    reset();

    function finish(prev) {
      moves = legal(pos); check = inCheck(pos);
      if (!moves.length) over = check ? (pos.t === 'w' ? 'Checkmate \u2014 Black wins' : 'Checkmate \u2014 White wins') : 'Stalemate \u2014 draw';
      else if (insufficient(pos)) over = 'Draw \u2014 insufficient material';
      else if (pos.half >= 100) over = 'Draw \u2014 fifty-move rule';
      audio.beep(over ? 330 : check ? 700 : 480, over ? .4 : .07, 'triangle');
    }
    function play(m) { hist.push({ pos, last }); pos = apply(pos, m); last = m; sel = null; promo = null; finish(); }
    function undo() { if (!hist.length || promo) return; ({ pos, last } = hist.pop()); sel = null; over = null; moves = legal(pos); check = inCheck(pos); }
    function pick(sq) {
      if (over || promo) return;
      if (sel != null) {
        const cand = moves.filter(m => m.f === sel && m.t === sq);
        if (cand.length > 1) { promo = { from: sel, to: sq, list: cand, i: 0 }; return; }
        if (cand.length === 1) return play(cand[0]);
      }
      const p = pos.b[sq];
      sel = p && isW(p) === (pos.t === 'w') && moves.some(m => m.f === sq) ? sq : null;
    }

    const layout = () => { const w = ctx.w, h = ctx.h, hh = 60, s = Math.max(80, Math.min(w - 16, h - hh - 12)), sq = s / 8; return { sq, bx: (w - s) / 2, by: hh + (h - hh - s) / 2 }; };
    const PRO = ['q', 'r', 'b', 'n'];
    const promoBox = () => { const { sq, bx, by } = layout(), bw = sq * 4 + 12, x0 = bx + sq * 4 - bw / 2, y0 = by + sq * 3.5; return { x0, y0, bw, sq }; };

    canvas.addEventListener('pointerdown', e => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (promo) {
        const { x0, y0, sq } = promoBox(), i = Math.floor((x - x0 - 6) / sq);
        if (y > y0 && y < y0 + sq + 12 && i >= 0 && i < 4) { play(promo.list.find(m => m.promo === PRO[i])); }
        return;
      }
      const { sq, bx, by } = layout(), c = Math.floor((x - bx) / sq), rr = Math.floor((y - by) / sq);
      if (inb(rr, c)) { cur = rr * 8 + c; pick(cur); }
    });

    function update() {
      if (promo) {
        if (I.pressed('left')) promo.i = (promo.i + 3) % 4; if (I.pressed('right')) promo.i = (promo.i + 1) % 4;
        if (I.pressed('a')) play(promo.list.find(m => m.promo === PRO[promo.i])); if (I.pressed('b')) promo = null;
        return;
      }
      let r = cur >> 3, c = cur & 7;
      if (I.pressed('left')) c = Math.max(0, c - 1); if (I.pressed('right')) c = Math.min(7, c + 1);
      if (I.pressed('up')) r = Math.max(0, r - 1); if (I.pressed('down')) r = Math.min(7, r + 1);
      cur = r * 8 + c;
      if (I.pressed('a')) pick(cur);
      if (I.pressed('b')) sel = null;
      if (I.pressed('x')) undo();
    }

    function piece(p, cx, cy, sq) {
      g.font = `${sq * .8}px "Segoe UI Symbol","Noto Sans Symbols 2","DejaVu Sans",serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const ch = GLYPH[p.toLowerCase()] + '\uFE0E';
      g.lineJoin = 'round';
      if (isW(p)) { g.lineWidth = sq * .05; g.strokeStyle = '#111'; g.strokeText(ch, cx, cy + sq * .04); g.fillStyle = '#fafafa'; g.fillText(ch, cx, cy + sq * .04); }
      else { g.lineWidth = sq * .035; g.strokeStyle = '#e6e6e8'; g.strokeText(ch, cx, cy + sq * .04); g.fillStyle = '#141416'; g.fillText(ch, cx, cy + sq * .04); }
    }

    function render() {
      const w = ctx.w, h = ctx.h, { sq, bx, by } = layout();
      g.fillStyle = '#0d0d0e'; g.fillRect(0, 0, w, h);
      g.textBaseline = 'alphabetic'; g.textAlign = 'center'; g.fillStyle = '#f2f2f2'; g.font = '600 20px Inter,system-ui,sans-serif';
      const status = over || ((pos.t === 'w' ? 'White' : 'Black') + ' to move' + (check ? ' \u2014 check' : ''));
      g.fillText(status, w / 2, 32);
      g.fillStyle = '#a0a0a6'; g.font = '400 13px Inter,system-ui,sans-serif';
      g.fillText(last ? 'Last move ' + name(last.f) + ' \u2192 ' + name(last.t) + (last.promo ? ' =' + last.promo.toUpperCase() : '') + ' \u00b7 ' + (hist.length ? Math.ceil(hist.length / 2) : 0) + ' moves' : 'Two players \u00b7 White starts', w / 2, 52);
      const ks = check || (over && over.startsWith('Checkmate')) ? kingSq(pos, pos.t === 'w') : -1;
      for (let s = 0; s < 64; s++) {
        const r = s >> 3, c = s & 7, x = bx + c * sq, y = by + r * sq;
        g.fillStyle = (r + c) % 2 ? '#4a4b50' : '#cfcfd2'; g.fillRect(x, y, sq, sq);
        if (last && (s === last.f || s === last.t)) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, y, sq, sq); }
        if (s === sel) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, y, sq, sq); }
        if (s === ks) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(x + 3, y + 3, sq - 6, sq - 6); }
        if (pos.b[s]) piece(pos.b[s], x + sq / 2, y + sq / 2, sq);
      }
      if (sel != null) for (const m of moves) if (m.f === sel) {
        const x = bx + (m.t & 7) * sq + sq / 2, y = by + (m.t >> 3) * sq + sq / 2;
        g.fillStyle = 'rgba(17,17,19,.55)'; g.beginPath(); g.arc(x, y, pos.b[m.t] ? sq * .42 : sq * .13, 0, 7); if (pos.b[m.t]) { g.lineWidth = sq * .07; g.strokeStyle = 'rgba(17,17,19,.55)'; g.stroke(); } else g.fill();
      }
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(bx + (cur & 7) * sq + 2, by + (cur >> 3) * sq + 2, sq - 4, sq - 4);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `${Math.max(9, sq * .17)}px Inter,sans-serif`; g.textAlign = 'left';
      for (let i = 0; i < 8; i++) { g.fillText(8 - i + '', bx + 3, by + i * sq + sq * .2); g.textAlign = 'right'; g.fillText('abcdefgh'[i], bx + i * sq + sq - 3, by + 8 * sq - 4); g.textAlign = 'left'; }
      if (promo) {
        const { x0, y0, bw } = promoBox();
        g.fillStyle = 'rgba(0,0,0,.82)'; g.fillRect(x0, y0, bw, sq + 12); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x0, y0, bw, sq + 12);
        PRO.forEach((p, i) => { if (i === promo.i) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x0 + 6 + i * sq, y0 + 6, sq, sq); } piece(pos.t === 'w' ? p.toUpperCase() : p, x0 + 6 + i * sq + sq / 2, y0 + 6 + sq / 2, sq); });
      }
      if (over) { g.fillStyle = '#a0a0a6'; g.font = '400 13px Inter,system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('Take back a move (C / X) or restart from the pause menu', w / 2, h - 8); }
    }
    return { update, render, restart: reset };
  }
};

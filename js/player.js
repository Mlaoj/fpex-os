// Game player: full-screen canvas, unified keyboard/gamepad/touch input, pause menu, fullscreen.
import { setMode } from './input.js';

const KEY = 'fpex.player';
const P = { vol: 60, sound: true, touch: 'auto' };
try { Object.assign(P, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
const saveP = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch {} };

const CSS = `
#player{position:fixed;inset:0;z-index:50;background:#000;color:#f2f2f2;font-family:Inter,system-ui,sans-serif;touch-action:none;user-select:none;-webkit-user-select:none}
#stage{position:absolute;inset:0}#stage canvas{width:100%;height:100%;display:block;touch-action:none}
#touch{position:absolute;inset:0;pointer-events:none}
.tb{position:absolute;bottom:max(1.2rem,env(safe-area-inset-bottom));width:5.2rem;height:5.2rem;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(20,20,22,.55);color:#fff;font-size:.85rem;font-weight:600;pointer-events:auto;touch-action:none;display:flex;align-items:center;justify-content:center}
.tb.on{background:rgba(255,255,255,.35)}
#pbtn{position:absolute;top:max(.8rem,env(safe-area-inset-top));right:.8rem;width:2.8rem;height:2.8rem;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(20,20,22,.6);color:#fff;font-size:.9rem;display:none}
#pause{position:absolute;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center}
#pause[hidden]{display:none}
.pbox{width:min(24rem,88vw);display:flex;flex-direction:column;gap:.6rem}
.pbox h2{font-size:.85rem;letter-spacing:.16em;text-transform:uppercase;color:#a0a0a6;font-weight:600;margin-bottom:.4rem}
.pbox button{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#f2f2f2;border-radius:.5rem;padding:.8rem 1.1rem;font:inherit;text-align:left;cursor:pointer}
.pbox button.primary{background:#f2f2f2;color:#0a0a0b;font-weight:600}
.pbox button:focus{outline:2px solid #fff;outline-offset:3px}
.pbox [hidden]{display:none}.pgrp{display:flex;flex-direction:column;gap:.6rem}
`;

const KM = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'a', Enter: 'a', KeyZ: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyC: 'x', KeyV: 'y', Escape: 'start', KeyP: 'start' };

function makeInput() {
  const codes = new Set(), tc = new Map();
  let cur = {}, prev = {}, ax = 0, ay = 0;
  const kd = e => { if (KM[e.code]) { codes.add(e.code); e.preventDefault(); } };
  const ku = e => codes.delete(e.code);
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const api = {
    held: a => !!cur[a], pressed: a => !!cur[a] && !prev[a],
    get axisX() { return ax; }, get axisY() { return ay; },
    touch: tc,
    poll() {
      prev = cur; cur = {};
      for (const c of codes) cur[KM[c]] = 1;
      for (const a of tc.values()) cur[a] = 1;
      ax = (cur.right ? 1 : 0) - (cur.left ? 1 : 0); ay = (cur.down ? 1 : 0) - (cur.up ? 1 : 0);
      const gp = [...(navigator.getGamepads?.() || [])].find(g => g && g.connected);
      if (gp) {
        const b = i => !!gp.buttons[i]?.pressed, sx = gp.axes[0] || 0, sy = gp.axes[1] || 0;
        if (b(14)) cur.left = 1; if (b(15)) cur.right = 1; if (b(12)) cur.up = 1; if (b(13)) cur.down = 1;
        if (sx < -.35) cur.left = 1; if (sx > .35) cur.right = 1; if (sy < -.35) cur.up = 1; if (sy > .35) cur.down = 1;
        if (b(0) || b(7)) cur.a = 1; if (b(1) || b(6)) cur.b = 1; if (b(2)) cur.x = 1; if (b(3)) cur.y = 1; if (b(9)) cur.start = 1;
        if (Math.abs(sx) > .15) ax = sx; else if (b(14) || b(15)) ax = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
        if (Math.abs(sy) > .15) ay = sy;
      }
    },
    destroy() { removeEventListener('keydown', kd); removeEventListener('keyup', ku); }
  };
  return api;
}

let cur = null, lockUntil = 0, ac = null;
export const isPlaying = () => !!cur;

export async function open(def, hooks = {}) {
  if (cur) return false;
  let mod;
  try { mod = await import(def.entry); } catch (e) { hooks.onError?.(e); return false; }
  if (!document.getElementById('pcss')) { const s = document.createElement('style'); s.id = 'pcss'; s.textContent = CSS; document.head.append(s); }

  const el = document.createElement('div');
  el.id = 'player';
  el.innerHTML = `<div id="stage"><canvas></canvas></div><div id="touch"></div><button id="pbtn" data-p="pause" aria-label="Pause">II</button>
  <div id="pause" hidden><div class="pbox"><h2 id="ptitle"></h2>
   <div class="pgrp" id="pmain"><button class="primary" data-f data-p="resume">Resume</button><button data-f data-p="restart">Restart</button><button data-f data-p="full">Fullscreen</button><button data-f data-p="settings">Game settings</button><button data-f data-p="exit">Exit game</button></div>
   <div class="pgrp" id="pset" hidden><button data-f data-p="sound"></button><button data-f data-p="voldn">Volume \u2212</button><button data-f data-p="volup">Volume +</button><button data-f data-p="touch"></button><button class="primary" data-f data-p="back">Back</button></div></div></div>`;
  document.body.append(el);
  const $ = s => el.querySelector(s), stage = $('#stage'), cv = $('canvas'), g2 = cv.getContext('2d');
  const inp = makeInput(), S = { state: 'playing', raf: 0, last: performance.now(), t0: performance.now() };
  const skey = k => `fpex.save.${def.id}.${k}`;
  const audio = {
    beep(f = 440, d = .08, type = 'square', gain = .06) {
      if (!P.sound || P.vol <= 0) return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = type; o.frequency.value = f; gn.gain.value = gain * P.vol / 100;
        o.connect(gn); gn.connect(ac.destination); o.start();
        gn.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.stop(ac.currentTime + d);
      } catch {}
    }
  };
  const ctx = {
    canvas: cv, g: g2, w: 0, h: 0, input: inp, audio,
    save: (k, v) => { try { localStorage.setItem(skey(k), JSON.stringify(v)); } catch {} },
    load: (k, d) => { try { const v = localStorage.getItem(skey(k)); return v == null ? d : JSON.parse(v); } catch { return d; } }
  };
  const fit = () => {
    const r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    ctx.w = r.width; ctx.h = r.height; cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    g2.setTransform(d, 0, 0, d, 0, 0);
  };
  const ro = new ResizeObserver(fit); ro.observe(stage); fit();
  const game = mod.default.create(ctx);

  const coarse = () => P.touch === 'on' || (P.touch === 'auto' && matchMedia('(pointer:coarse)').matches);
  function buildTouch() {
    const t = $('#touch'); t.innerHTML = ''; inp.touch.clear();
    $('#pbtn').style.display = coarse() ? 'block' : 'none';
    if (!coarse() || !def.touch) return;
    const pos = { left: 'left:1rem', right: 'left:7rem', a: 'right:1rem', b: 'right:7rem', up: 'right:1rem;bottom:7rem', down: 'right:7rem;bottom:7rem' };
    for (const a of def.touch) {
      const b = document.createElement('div'); b.className = 'tb'; b.style.cssText = pos[a] || '';
      b.textContent = (def.touchLabels && def.touchLabels[a]) || { left: '\u25c0', right: '\u25b6', up: '\u25b2', down: '\u25bc', a: 'A', b: 'B' }[a];
      const on = e => { b.setPointerCapture(e.pointerId); inp.touch.set(e.pointerId, a); b.classList.add('on'); e.preventDefault(); };
      const off = e => { inp.touch.delete(e.pointerId); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
      t.append(b);
    }
  }
  buildTouch();

  function showSet(on) {
    $('#pmain').hidden = on; $('#pset').hidden = !on;
    $('[data-p=sound]').textContent = 'Sound: ' + (P.sound ? 'On' : 'Off');
    $('[data-p=touch]').textContent = 'Touch controls: ' + { auto: 'Auto', on: 'Always on', off: 'Off' }[P.touch];
    $('[data-p=voldn]').textContent = 'Volume \u2212  (' + P.vol + '%)';
    (on ? $('[data-p=sound]') : $('[data-p=settings]'))?.focus();
  }
  function pause() {
    if (S.state !== 'playing' || performance.now() < lockUntil) return;
    S.state = 'paused'; setMode('pause'); inp.touch.clear();
    $('#ptitle').textContent = def.title + ' \u00b7 Paused'; showSet(false);
    $('#pause').hidden = false; $('[data-p=resume]').focus();
  }
  function resume() {
    S.state = 'playing'; lockUntil = performance.now() + 300;
    $('#pause').hidden = true; setMode('game');
  }
  const full = async () => { try { document.fullscreenElement ? await document.exitFullscreen() : await el.requestFullscreen(); } catch {} };
  function exit() {
    cancelAnimationFrame(S.raf); game.destroy?.(); inp.destroy(); ro.disconnect();
    removeEventListener('visibilitychange', vis); el.remove(); setMode('ui');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const seconds = Math.round((performance.now() - S.t0) / 1000); cur = null; hooks.onExit?.({ seconds });
  }
  const A = {
    pause, resume, full, exit, settings: () => showSet(true), back: () => showSet(false),
    restart: () => { game.restart?.(); resume(); },
    sound: () => { P.sound = !P.sound; saveP(); showSet(true); },
    volup: () => { P.vol = Math.min(100, P.vol + 10); saveP(); audio.beep(660, .08); showSet(true); },
    voldn: () => { P.vol = Math.max(0, P.vol - 10); saveP(); audio.beep(660, .08); showSet(true); },
    touch: () => { P.touch = { auto: 'on', on: 'off', off: 'auto' }[P.touch]; saveP(); buildTouch(); showSet(true); }
  };
  el.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) A[b.dataset.p]?.(); });
  const vis = () => { if (document.hidden) pause(); };
  addEventListener('visibilitychange', vis);

  function loop(t) {
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (t - S.last) / 1000 || 0); S.last = t;
    inp.poll();
    if (S.state === 'playing') { if (inp.pressed('start')) pause(); else game.update(dt); }
    game.render();
  }
  cur = { game, A };
  setMode('game');
  el.requestFullscreen?.().catch(() => {});
  S.raf = requestAnimationFrame(loop);
  hooks.onStart?.();
  return true;
}

export const pauseBack = () => { if (!cur) return; const el = document.getElementById('player'); if (el && !el.querySelector('#pset').hidden) cur.A.back(); else cur.A.resume(); };

/* The bike's TFT screen, drawn on a 1024×512 canvas: a status bar (clock, "busco prácticas"), a round racing
   rev counter with the real speed and gear, the touch menu (rows from tft.js) and a data bar (trip, base,
   availability, year). st = { speedKmh, gear, rpm, trip, clock, hover }. No text below 22 canvas px. */
import { ACCENT_CSS, CYAN_CSS } from '../config.js';
import { TFT_W, TFT_H, menuRows } from './tft.js';

var BG = '#060A0E', LINE = '#1C232C', MUTED = '#A3ACB8', FG = '#ECEEF1', TICK = '#9AA4B2';
var DISPLAY = '"Space Grotesk", sans-serif', MONO = '"JetBrains Mono", monospace';
var TOP = 96, BOTTOM = 436;   /* status bar above, data bar below */

function gauge(ctx, st) {
  var cx = 270, cy = 268, R = 150, a0 = Math.PI * 0.75, sw = Math.PI * 1.5, i, a;
  function ang(rpm) { return a0 + sw * Math.max(0, Math.min(14000, rpm)) / 14000; }
  /* face and inner ring */
  var face = ctx.createRadialGradient(cx, cy, 10, cx, cy, 172);
  face.addColorStop(0, '#0f1620'); face.addColorStop(1, '#070b10');
  ctx.fillStyle = face; ctx.strokeStyle = LINE; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 168, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#141b23'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.stroke();
  /* track, live revs (cyan, glowing) and the red zone from 12 000 */
  ctx.lineCap = 'butt'; ctx.lineWidth = 12;
  ctx.strokeStyle = '#141b23'; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + sw); ctx.stroke();
  ctx.save(); ctx.shadowColor = CYAN_CSS; ctx.shadowBlur = 14; ctx.strokeStyle = CYAN_CSS;
  ctx.beginPath(); ctx.arc(cx, cy, R, a0, ang(Math.min(st.rpm, 12000))); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = ACCENT_CSS; ctx.beginPath(); ctx.arc(cx, cy, R, ang(12000), a0 + sw); ctx.stroke();
  /* ticks every 1000 rpm, numbers every 2000 */
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 22px ' + MONO;
  for (i = 0; i <= 14; i++) {
    a = ang(i * 1000);
    var major = i % 2 === 0, r1 = R - (major ? 30 : 20), r2 = R - 10;
    ctx.strokeStyle = i >= 12 ? ACCENT_CSS : (major ? TICK : '#3A434F'); ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    if (major) { ctx.fillStyle = i >= 12 ? ACCENT_CSS : TICK; ctx.fillText(String(i), cx + Math.cos(a) * (R - 52), cy + Math.sin(a) * (R - 52)); }
  }
  /* speed and gear */
  ctx.fillStyle = FG; ctx.font = '700 64px ' + DISPLAY; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(st.speedKmh), cx, cy + 82);
  ctx.fillStyle = MUTED; ctx.font = '500 22px ' + MONO; ctx.fillText('KM/H', cx, cy + 110);
  ctx.fillStyle = CYAN_CSS; ctx.fillText('×1000 RPM', cx, cy + 150);
  /* gear: outside the dial, between it and the menu, so the needle never crosses it */
  var gx = 458, gy = cy - 52;
  ctx.fillStyle = '#0d141c'; ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 3;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(gx, gy, 72, 84, 12); else ctx.rect(gx, gy, 72, 84); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ACCENT_CSS; ctx.font = '700 60px ' + DISPLAY; ctx.fillText(String(st.gear), gx + 36, gy + 64);
  ctx.fillStyle = MUTED; ctx.font = '500 22px ' + MONO; ctx.fillText('MARCHA', gx + 36, gy + 114);
  /* needle with a glow, and its hub */
  a = ang(st.rpm);
  ctx.save(); ctx.shadowColor = ACCENT_CSS; ctx.shadowBlur = 16; ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * 28, cy - Math.sin(a) * 28); ctx.lineTo(cx + Math.cos(a) * (R - 26), cy + Math.sin(a) * (R - 26)); ctx.stroke(); ctx.restore();
  ctx.fillStyle = BG; ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function menu(ctx, hover) {
  menuRows().forEach(function (r) {
    var on = r.id === hover;
    if (on) {
      ctx.fillStyle = ACCENT_CSS; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 14); else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
    } else {
      ctx.fillStyle = LINE; ctx.fillRect(r.x, r.y + r.h + 2, r.w, 2);
    }
    ctx.fillStyle = on ? BG : FG; ctx.textBaseline = 'middle';
    ctx.font = '700 36px ' + DISPLAY; ctx.textAlign = 'left'; ctx.fillText(r.label, r.x + 26, r.y + r.h / 2 + 2);
    ctx.fillStyle = on ? BG : MUTED; ctx.font = '700 40px ' + DISPLAY; ctx.textAlign = 'right'; ctx.fillText('›', r.x + r.w - 24, r.y + r.h / 2);
  });
}

function bars(ctx, st) {
  ctx.fillStyle = LINE; ctx.fillRect(0, TOP, TFT_W, 2); ctx.fillRect(0, BOTTOM, TFT_W, 2);
  ctx.textBaseline = 'alphabetic'; ctx.font = '500 30px ' + MONO;
  ctx.textAlign = 'left'; ctx.fillStyle = FG; ctx.fillText(st.clock, 40, 62);
  ctx.textAlign = 'right'; ctx.fillStyle = CYAN_CSS; ctx.fillText('● BUSCO PRÁCTICAS', TFT_W - 40, 62);
  var items = [['TRIP', st.trip], ['BASE', 'MADRID'], ['DISP.', '20 H/SEM'], ['CURSO', '3.º']], x = 40;
  ctx.textAlign = 'left';
  items.forEach(function (it) {
    ctx.font = '500 24px ' + MONO; ctx.fillStyle = MUTED; ctx.fillText(it[0], x, 486);
    var kw = ctx.measureText(it[0] + ' ').width;
    ctx.font = '700 26px ' + MONO; ctx.fillStyle = FG; ctx.fillText(it[1], x + kw, 486);
    x += 245;
  });
}

export function drawDash(ctx, st) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, TFT_W, TFT_H);
  ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.strokeRect(10, 10, TFT_W - 20, TFT_H - 20);
  bars(ctx, st);
  gauge(ctx, st);
  menu(ctx, st.hover);
}

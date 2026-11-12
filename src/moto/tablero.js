/* The bike's TFT dash screen, drawn on a 1024×512 canvas: rev gauge (it moves with the section), the section title
   and a few facts. st = { rev: 0..1, label, mode, boot }. */
import { ACCENT_CSS, CYAN_CSS, MODE_LABELS } from '../config.js';

export function drawDash(ctx, st) {
  var W = 1024, H = 512, i, a, major, r1, r2;
  ctx.fillStyle = '#060A0E'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1C232C'; ctx.lineWidth = 2; ctx.strokeRect(10, 10, W - 20, H - 20);
  var cx = 270, cy = 262, R = 186, a0 = Math.PI * 0.75, sw = Math.PI * 1.5;
  ctx.lineCap = 'butt'; ctx.lineWidth = 8;
  ctx.strokeStyle = '#1C232C'; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0, a0 + sw); ctx.stroke();
  ctx.strokeStyle = CYAN_CSS; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0, a0 + sw * st.rev); ctx.stroke();
  ctx.strokeStyle = ACCENT_CSS; ctx.beginPath(); ctx.arc(cx, cy, R + 14, a0 + sw * 0.8, a0 + sw); ctx.stroke();
  for (i = 0; i <= 27; i++) {
    a = a0 + sw * i / 27; major = i % 3 === 0; r1 = R - (major ? 34 : 22); r2 = R - 6;
    ctx.strokeStyle = i >= 22 ? ACCENT_CSS : (major ? '#9AA4B2' : '#3A434F');
    ctx.lineWidth = major ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
  }
  var na = a0 + sw * st.rev;
  ctx.strokeStyle = ACCENT_CSS; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(na) * 26, cy - Math.sin(na) * 26); ctx.lineTo(cx + Math.cos(na) * (R - 46), cy + Math.sin(na) * (R - 46)); ctx.stroke();
  ctx.fillStyle = '#060A0E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ECEEF1'; ctx.font = '700 68px "Space Grotesk", sans-serif'; ctx.fillText('3.º', cx, cy + 118);
  ctx.fillStyle = '#A3ACB8'; ctx.font = '500 20px "JetBrains Mono", monospace'; ctx.fillText('CURSO', cx, cy + 148);

  var x0 = 560;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#A3ACB8'; ctx.font = '500 22px "JetBrains Mono", monospace'; ctx.fillText('IVÁN HERRERA', x0, 78);
  var title = st.boot ? 'ARRANCANDO…' : st.label, size = 64;
  ctx.font = '700 ' + size + 'px "Space Grotesk", sans-serif';
  while (ctx.measureText(title).width > 410 && size > 28) { size -= 2; ctx.font = '700 ' + size + 'px "Space Grotesk", sans-serif'; }
  ctx.fillStyle = '#ECEEF1'; ctx.fillText(title, x0, 160);
  ctx.fillStyle = ACCENT_CSS; ctx.fillRect(x0, 182, 72, 5);
  var rows = [['MODO', MODE_LABELS[st.mode]], ['BASE', 'MADRID'], ['DISP.', '20 H/SEM']];
  ctx.font = '500 22px "JetBrains Mono", monospace';
  rows.forEach(function (r, k) {
    var y = 250 + k * 56;
    ctx.fillStyle = '#A3ACB8'; ctx.fillText(r[0], x0, y);
    ctx.fillStyle = '#ECEEF1'; ctx.fillText(r[1], x0 + 130, y);
    ctx.fillStyle = '#1C232C'; ctx.fillRect(x0, y + 18, 410, 2);
  });
  ctx.fillStyle = CYAN_CSS; ctx.beginPath(); ctx.arc(x0 + 8, 440, 7, 0, Math.PI * 2); ctx.fill();
  ctx.font = '500 24px "JetBrains Mono", monospace'; ctx.fillText('BUSCO PRÁCTICAS', x0 + 28, 448);
}

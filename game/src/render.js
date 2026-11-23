// Canvas renderer for Ember Duel: Ashfall — title, campaign map, duel table, reward draft,
// win and loss screens. Cards are drawn with shapes: a coloured band, a type glyph drawn
// with paths (flame, shield, heart, diamond, star), a big value and readable rule text.
import { CARDS, shownValue } from './cards.js';
import { PALETTE, FONT, CHARGE_MAX, DUELS } from './config.js';

export const TYPE_STYLE = {
  attack: { color: '#e5534b', label: 'ATTACK' }, block: { color: '#4f9dd8', label: 'GUARD' },
  heal: { color: '#57c785', label: 'HEAL' }, ember: { color: '#f08c2e', label: 'EMBER' },
  combo: { color: '#c9a227', label: 'COMBO' },
};
export function cardRect(i, n) {
  const w = 168; const h = 232; const gap = 14;
  const total = n * w + (n - 1) * gap;
  return { x: 640 - total / 2 + i * (w + gap), y: 434, w, h };
}
export function rewardRect(i) { return { x: 262 + i * 268, y: 250, w: 220, h: 300 }; }

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function glyph(ctx, type, cx, cy, s, color) {
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.beginPath();
  if (type === 'attack') { ctx.moveTo(cx, cy - s); ctx.quadraticCurveTo(cx + s * 0.9, cy + s * 0.2, cx + s * 0.45, cy + s * 0.8); ctx.quadraticCurveTo(cx, cy + s * 1.05, cx - s * 0.45, cy + s * 0.8); ctx.quadraticCurveTo(cx - s * 0.9, cy + s * 0.2, cx, cy - s); }
  else if (type === 'block') { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.85, cy - s * 0.6); ctx.lineTo(cx + s * 0.85, cy + s * 0.2); ctx.quadraticCurveTo(cx + s * 0.8, cy + s * 0.8, cx, cy + s); ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.8, cx - s * 0.85, cy + s * 0.2); ctx.lineTo(cx - s * 0.85, cy - s * 0.6); ctx.closePath(); }
  else if (type === 'heal') { ctx.moveTo(cx, cy + s * 0.85); ctx.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.7, cy - s, cx, cy - s * 0.35); ctx.bezierCurveTo(cx + s * 0.7, cy - s, cx + s * 1.3, cy, cx, cy + s * 0.85); }
  else if (type === 'ember') { ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.8, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.8, cy); ctx.closePath(); }
  else { for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + i * Math.PI / 5; const rad = i % 2 ? s * 0.45 : s; const px = cx + Math.cos(a) * rad; const py = cy + Math.sin(a) * rad; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); }
  ctx.fill();
}
function wrap(ctx, text, x, y, maxW, lh, maxLines) {
  const words = text.split(' '); let line = ''; let lines = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y + lines * lh); lines += 1; line = w; if (lines >= maxLines) return; }
    else line = t;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lh);
}
export function drawCard(ctx, id, x, y, w, h, opts = {}) {
  const card = CARDS[id]; const st = TYPE_STYLE[card.type];
  const lift = opts.lift || 0; const y2 = y - lift;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  rr(ctx, x, y2, w, h, 12); ctx.fillStyle = '#241811'; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  rr(ctx, x, y2, w, h, 12); ctx.strokeStyle = opts.armed ? '#ffe9a8' : st.color; ctx.lineWidth = opts.armed ? 4 : 2.5; ctx.stroke();
  rr(ctx, x + 4, y2 + 4, w - 8, 44, 8); ctx.fillStyle = st.color; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(w * 0.095)}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(card.name, x + 12, y2 + 26, w - 52);
  // Cost pip
  ctx.beginPath(); ctx.arc(x + w - 22, y2 + 26, 15, 0, Math.PI * 2); ctx.fillStyle = '#12365e'; ctx.fill(); ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(card.id === 'finalSpark' ? 'ALL' : String(card.cost), x + w - 22, y2 + 27);
  glyph(ctx, card.type, x + w / 2, y2 + 92, 26, st.color);
  const val = opts.value !== undefined ? opts.value : card.value;
  ctx.fillStyle = st.color; ctx.font = `bold ${val > 0 ? 44 : 30}px ${FONT}`;
  ctx.fillText(val > 0 ? String(val) : 'VARIES', x + w / 2, y2 + 148);
  ctx.fillStyle = PALETTE.text; ctx.font = `13px ${FONT}`;
  wrap(ctx, card.text, x + w / 2, y2 + 176, w - 20, 15, 3);
  ctx.fillStyle = st.color; ctx.font = `bold 10px ${FONT}`;
  ctx.fillText(st.label, x + w / 2, y2 + h - 12);
  if (opts.dim) { rr(ctx, x, y2, w, h, 12); ctx.fillStyle = 'rgba(10,6,4,0.55)'; ctx.fill(); }
  ctx.restore();
}
function portrait(ctx, x, y, r, color, initial, burn, t) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = '#f7ead9'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${r}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(initial, x, y + 2);
  if (burn > 0) {
    const flick = 1 + Math.sin(t * 9) * 0.15;
    glyph(ctx, 'attack', x + r - 6, y - r + 4, 11 * flick, '#ff7a2e');
    ctx.fillStyle = '#ffb37a'; ctx.font = `bold 13px ${FONT}`; ctx.fillText(`BURN ${burn}`, x + r - 6, y - r - 14);
  }
}
function lifeBar(ctx, x, y, w, f, label) {
  ctx.fillStyle = PALETTE.text; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${label}  ${f.life} / ${f.maxLife}`, x, y);
  rr(ctx, x, y + 14, w, 16, 8); ctx.fillStyle = '#0f0a07'; ctx.fill();
  rr(ctx, x, y + 14, Math.max(8, w * Math.max(0, f.life) / f.maxLife), 16, 8); ctx.fillStyle = f.life / f.maxLife > 0.35 ? '#57c785' : '#e5534b'; ctx.fill();
  ctx.fillStyle = PALETTE.muted; ctx.font = `13px ${FONT}`;
  ctx.fillText(`Block ${f.block}${f.reflect ? ` · Reflect ${f.reflect}` : ''} · Deck ${f.deck.length} · Discard ${f.discard.length}`, x, y + 46);
}
function chargeMeter(ctx, x, y, charge, t) {
  ctx.fillStyle = PALETTE.text; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('CHARGE', x, y);
  for (let i = 0; i < CHARGE_MAX; i += 1) {
    const cx = x + 78 + i * 26; const full = i < Math.min(charge, CHARGE_MAX);
    const pulse = charge >= CHARGE_MAX ? 1 + Math.sin(t * 7) * 0.18 : 1;
    ctx.beginPath(); ctx.arc(cx, y, 10 * (full ? pulse : 1), 0, Math.PI * 2);
    ctx.fillStyle = full ? '#f2c94c' : '#4a3826'; ctx.fill();
    ctx.strokeStyle = '#f7ead9'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  if (charge >= CHARGE_MAX) { ctx.fillStyle = '#f2c94c'; ctx.font = `bold 13px ${FONT}`; ctx.fillText('FULL — press O!', x + 216, y); }
}

export function render(ctx, view, t) {
  const W = 1280; const H = 720;
  ctx.fillStyle = PALETTE.bg; ctx.fillRect(0, 0, W, H);
  // ember glow backdrop
  const g = ctx.createRadialGradient(640, 380, 60, 640, 380, 640);
  g.addColorStop(0, 'rgba(240,120,40,0.20)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (view.shake > 0.3) ctx.translate((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake);
  ctx.textBaseline = 'middle';
  if (view.screen === 'title') {
    ctx.textAlign = 'center'; ctx.fillStyle = '#f2c94c'; ctx.font = `bold 72px ${FONT}`;
    ctx.fillText('EMBER DUEL', 640, 190);
    ctx.fillStyle = PALETTE.text; ctx.font = `bold 34px ${FONT}`; ctx.fillText('A S H F A L L', 640, 248);
    ctx.fillStyle = PALETTE.muted; ctx.font = `19px ${FONT}`;
    wrap(ctx, 'A 3-duel campaign card battler. Build Charge, OVERLOAD a card for double power, set foes burning, and draft a new card after every victory.', 640, 310, 760, 26, 3);
    glyph(ctx, 'attack', 640, 430, 44, '#e5534b');
    rr(ctx, 440, 500, 400, 62, 12); ctx.fillStyle = '#b3392f'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 23px ${FONT}`; ctx.fillText('START CAMPAIGN  (Enter)', 640, 532);
    ctx.fillStyle = PALETTE.muted; ctx.font = `15px ${FONT}`;
    ctx.fillText('Click a card or press 1-5 · Space ends turn · O overloads at full Charge · M mutes', 640, 606);
  } else if (view.screen === 'map') {
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.text; ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('THE ASHFALL CAMPAIGN', 640, 90);
    ctx.fillStyle = PALETTE.muted; ctx.font = `17px ${FONT}`;
    ctx.fillText(`Your life: ${view.campaign.life} · Score so far: ${view.campaign.totalScore} · Deck: ${view.campaign.deckList.reduce((a, [, n]) => a + n, 0)} cards`, 640, 132);
    ctx.strokeStyle = '#6b4c30'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(240, 330); ctx.lineTo(1040, 330); ctx.stroke();
    DUELS.forEach((d, i) => {
      const x = 240 + i * 400; const done = i < view.campaign.duelIndex; const cur = i === view.campaign.duelIndex;
      ctx.beginPath(); ctx.arc(x, 330, cur ? 62 : 50, 0, Math.PI * 2);
      ctx.fillStyle = done ? '#57c785' : cur ? '#b3392f' : '#3a271c'; ctx.fill();
      ctx.strokeStyle = '#f7ead9'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold 30px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(done ? '✓' : String(i + 1), x, 332);
      ctx.font = `bold 21px ${FONT}`; ctx.fillStyle = PALETTE.text; ctx.fillText(d.name, x, 436);
      ctx.fillStyle = PALETTE.muted; ctx.font = `15px ${FONT}`; ctx.fillText(`${d.life} life · Tier ${d.tier}`, x, 464);
      wrap(ctx, d.blurb, x, 492, 300, 20, 2);
    });
    rr(ctx, 490, 570, 300, 56, 12); ctx.fillStyle = '#b3392f'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('FIGHT  (Enter)', 640, 599);
  } else if (view.screen === 'reward') {
    ctx.textAlign = 'center'; ctx.fillStyle = '#57c785'; ctx.font = `bold 42px ${FONT}`;
    ctx.fillText('DUEL WON!', 640, 92);
    ctx.fillStyle = PALETTE.text; ctx.font = `19px ${FONT}`;
    ctx.fillText(`Duel score ${view.lastScore} · Campaign score ${view.campaign.totalScore} · Healed +8 → ${view.campaign.life} life`, 640, 132);
    ctx.fillStyle = PALETTE.muted; ctx.font = `18px ${FONT}`; ctx.fillText('Draft ONE card into your deck for the rest of the campaign:', 640, 178);
    view.rewardChoices.forEach((id, i) => { const r = rewardRect(i); drawCard(ctx, id, r.x, r.y, r.w, r.h, { value: CARDS[id].value }); });
    ctx.fillStyle = PALETTE.muted; ctx.font = `15px ${FONT}`; ctx.fillText('Click a card, or press 1, 2 or 3', 640, 600);
  } else if (view.screen === 'win' || view.screen === 'loss') {
    const win = view.screen === 'win';
    ctx.textAlign = 'center'; ctx.fillStyle = win ? '#57c785' : '#e5534b'; ctx.font = `bold 58px ${FONT}`;
    ctx.fillText(win ? 'THE PYRE FALLS!' : 'THE EMBERS TAKE YOU', 640, 170);
    ctx.fillStyle = PALETTE.text; ctx.font = `21px ${FONT}`;
    ctx.fillText(win ? 'Campaign complete — the Ashfall is yours.' : `You fell in duel ${view.campaign.duelIndex + 1} of 3.`, 640, 228);
    ctx.font = `19px ${FONT}`; ctx.fillStyle = PALETTE.muted;
    view.campaign.scores.forEach((sc, i) => ctx.fillText(`Duel ${i + 1} (${DUELS[i].name}): ${sc} points`, 640, 300 + i * 34));
    ctx.fillStyle = '#f2c94c'; ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`TOTAL SCORE  ${view.campaign.totalScore}`, 640, 300 + view.campaign.scores.length * 34 + 26);
    rr(ctx, 490, 540, 300, 58, 12); ctx.fillStyle = '#b3392f'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 22px ${FONT}`; ctx.fillText('PLAY AGAIN  (Enter)', 640, 570);
  } else {
    renderTable(ctx, view, t);
  }
  // particles + floaters above everything
  for (const p of view.particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const f of view.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.color; ctx.font = `bold 30px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (view.screen === 'table' && view.hint) {
    rr(ctx, 240, 676, 800, 36, 10); ctx.fillStyle = 'rgba(20,12,8,0.92)'; ctx.fill();
    ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffe9a8'; ctx.font = `15px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(view.hint, 640, 695);
  }
  ctx.fillStyle = PALETTE.muted; ctx.font = `13px ${FONT}`; ctx.textAlign = 'right';
  ctx.fillText(view.audio.muted ? 'SFX OFF (M)' : 'SFX ON (M)', 1264, 18);
}

function renderTable(ctx, view, t) {
  const s = view.duel.state; const P = s.player; const E = s.enemy;
  ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.muted; ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`DUEL ${s.tier} of 3 — ${s.foeName} · Turn ${s.turn} · ${s.turnSide === 'player' ? 'YOUR TURN' : 'FOE THINKS…'}`, 640, 26);
  portrait(ctx, 150, 108, 42, '#8a3324', 'F', E.burn, t);
  lifeBar(ctx, 210, 84, 330, E, s.foeName);
  chargeMeter(ctx, 760, 92, E.charge, t);
  ctx.fillStyle = PALETTE.muted; ctx.font = `14px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('Foe charge', 760, 116);
  // foe hand (backs)
  for (let i = 0; i < E.hand.length; i += 1) {
    const x = 640 - (E.hand.length * 62) / 2 + i * 62;
    rr(ctx, x, 140, 52, 74, 7); ctx.fillStyle = '#4a241a'; ctx.fill(); ctx.strokeStyle = '#c96f4a'; ctx.lineWidth = 1.5; ctx.stroke();
    glyph(ctx, 'attack', x + 26, 172, 12, '#c96f4a');
  }
  // centre log
  ctx.fillStyle = PALETTE.text; ctx.font = `15px ${FONT}`; ctx.textAlign = 'center';
  s.log.slice(-3).forEach((line, i) => ctx.fillText(line, 640, 268 + i * 22));
  if (view.overloadArmed) { ctx.fillStyle = '#f2c94c'; ctx.font = `bold 19px ${FONT}`; ctx.fillText('⚡ OVERLOAD ARMED — your next card hits DOUBLE ⚡', 640, 344); }
  portrait(ctx, 150, 392, 42, '#2f5d3a', 'Y', P.burn, t);
  lifeBar(ctx, 210, 368, 330, P, 'You');
  chargeMeter(ctx, 760, 376, P.charge, t);
  ctx.fillStyle = PALETTE.text; ctx.font = `15px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(`Mana ${P.mana} / ${P.manaMax}`, 760, 402);
  // player hand
  P.hand.forEach((id, i) => {
    const r = cardRect(i, P.hand.length);
    const card = CARDS[id];
    const afford = P.mana >= (id === 'finalSpark' ? 0 : card.cost);
    const val = shownValue(card, s.played.player, P, E);
    const anim = view.anims.get(i);
    drawCard(ctx, id, r.x + (anim ? anim.dx : 0), r.y + (anim ? anim.dy : 0), r.w, r.h, {
      value: val, dim: !afford || s.turnSide !== 'player', lift: view.hover === i ? 14 : 0, armed: view.overloadArmed,
    });
    ctx.beginPath(); ctx.arc(r.x + 16, r.y + 2, 11, 0, Math.PI * 2); ctx.fillStyle = '#120c09'; ctx.fill();
    ctx.strokeStyle = '#f7ead9'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + 16, r.y + 3);
  });
  rr(ctx, 1100, 452, 150, 52, 10); ctx.fillStyle = s.turnSide === 'player' ? '#b3392f' : '#4a3826'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `bold 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('END TURN ␣', 1175, 479);
}

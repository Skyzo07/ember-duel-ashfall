// Ember Duel: Ashfall — main loop and campaign state machine.
// Screens: title -> map -> table (duel) -> reward draft -> map -> ... -> win / loss.
// Feel: card slide-in tweens, floating damage/heal numbers, screen shake on big hits and
// overloads, ember particle bursts on combos, overloads and burn ticks, tutorial hints.
import { createDuel, EV } from './duel.js';
import { takeAiTurn } from './ai.js';
import { CARDS, PLAYER_DECK, REWARD_POOL } from './cards.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { shotScene } from './shots.js';
import { HEAL_BETWEEN, CHARGE_MAX } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const random = createRandom(seed * 1000 + 17);
const audio = createAudio();

const view = {
  screen: 'title', duel: null, campaign: null, rewardChoices: [], lastScore: 0,
  particles: [], floaters: [], anims: new Map(), shake: 0, hover: -1,
  overloadArmed: false, hint: '', audio, time: 0,
};
window.__ember = view;

function newCampaign() {
  return { duelIndex: 0, life: 30, totalScore: 0, scores: [], deckList: PLAYER_DECK.map(([id, n]) => [id, n]) };
}
function burst(x, y, color, n = 16) {
  for (let i = 0; i < n; i += 1) {
    const a = random() * Math.PI * 2; const sp = 40 + random() * 160;
    view.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, r: 2 + random() * 3, color, life: 0.7, max: 0.7 });
  }
}
function floater(x, y, text, color) { view.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 }); }
function startDuel() {
  const c = view.campaign;
  view.duel = createDuel(random, { tier: c.duelIndex + 1, playerLife: c.life, playerDeckList: c.deckList });
  view.screen = 'table'; view.overloadArmed = false; view.duelDone = false;
  view.anims.clear();
  view.duel.state.player.hand.forEach((_, i) => view.anims.set(i, { dx: 0, dy: 190, tvy: 0 }));
  updateHint();
  say(`Duel ${c.duelIndex + 1}: ${view.duel.state.foeName}. Your turn.`);
}
function updateHint() {
  if (!view.duel || view.campaign.duelIndex > 0) { view.hint = ''; return; }
  const s = view.duel.state; const hand = s.player.hand;
  if (s.player.charge >= CHARGE_MAX) view.hint = 'Charge is full: press O, then play a card — it OVERLOADS for double power!';
  else if (hand.includes('riposte') && !s.played.player.types.has('block')) view.hint = 'Play a Guard first — then Riposte hits much harder.';
  else if (hand.includes('brand')) view.hint = 'Brand sets your foe Burning: 2 damage at the start of their next 2 turns.';
  else if (s.turn <= 1) view.hint = 'Click a card (or press 1–5) to play it. Every card you play builds Charge.';
  else view.hint = 'Build Charge to 5, then OVERLOAD. Backdraft spends Charge as damage.';
}
function say(text) { status.textContent = text; }

function react(flags, side) {
  const s = view.duel.state; const foeSide = side === 'player' ? s.enemy : s.player;
  const meSide = side === 'player' ? s.player : s.enemy;
  const foePos = side === 'player' ? { x: 150, y: 108 } : { x: 150, y: 392 };
  const mePos = side === 'player' ? { x: 150, y: 392 } : { x: 150, y: 108 };
  if (flags & EV.OVERLOAD) { view.shake = 14; burst(foePos.x, foePos.y, '#f2c94c', 30); floater(foePos.x + 90, foePos.y - 30, 'OVERLOAD!', '#f2c94c'); audio.play('overload'); }
  else if (flags & EV.DAMAGE) {
    floater(foePos.x + 90, foePos.y - 24, 'HIT', '#ff9a8a'); burst(foePos.x, foePos.y, '#e5534b', 14);
    if (flags & EV.COMBO) burst(foePos.x, foePos.y, '#f2c94c', 22);
  }
  if (flags & EV.HEAL) { floater(mePos.x + 90, mePos.y - 24, '+HEAL', '#8affb0'); audio.play('heal'); }
  if (flags & EV.BLOCK) audio.play('block');
}
function afterPlayerAction(flags) {
  const s = view.duel.state;
  if (flags & EV.DAMAGE) audio.play(flags & EV.OVERLOAD ? 'overload' : 'attack');
  react(flags, 'player');
  updateHint();
  if (s.over) return finishDuel();
}
const actions = {
  confirm() {
    audio.play('click');
    if (view.screen === 'title') { view.campaign = newCampaign(); view.screen = 'map'; }
    else if (view.screen === 'map') startDuel();
    else if (view.screen === 'win' || view.screen === 'loss') { view.campaign = newCampaign(); view.screen = 'map'; }
  },
  play(i) {
    if (view.screen !== 'table' || !view.duel) return;
    const s = view.duel.state; if (s.turnSide !== 'player' || s.over) return;
    const id = s.player.hand[i]; if (!id) return;
    const card = CARDS[id];
    const before = { foeLife: s.enemy.life, foeBlock: s.enemy.block, myLife: s.player.life };
    const flags = view.duel.playCard('player', i, view.overloadArmed);
    if (!flags) return;
    if (view.overloadArmed && s.player.charge === 0) view.overloadArmed = false;
    const dmg = (before.foeLife + before.foeBlock) - (s.enemy.life + s.enemy.block);
    if (dmg >= 8) view.shake = Math.max(view.shake, 10);
    if (dmg > 0) floater(240, 84, `-${dmg}`, '#ff9a8a');
    const healed = s.player.life - before.myLife;
    if (healed > 0) floater(240, 368, `+${healed}`, '#8affb0');
    if (!(flags & EV.OVERLOAD) && !(flags & EV.HEAL) && !(flags & EV.BLOCK)) audio.play(card.type === 'combo' ? 'combo' : card.type === 'ember' ? 'ember' : 'attack');
    if (flags & EV.OVERLOAD) audio.play('overload');
    if (flags & EV.COMBO) burst(150, 108, '#f2c94c', 18);
    view.anims.clear(); s.player.hand.forEach((_, k) => view.anims.set(k, { dx: 0, dy: 26, tvy: 0 }));
    afterPlayerAction(0);
    if (s.over) finishDuel();
  },
  endTurn() {
    if (view.screen !== 'table' || !view.duel) return;
    const s = view.duel.state; if (s.turnSide !== 'player' || s.over) return;
    view.overloadArmed = false;
    view.duel.endTurn();
    if (s.over) return finishDuel();
    // Burn tick feedback at the start of the foe's turn is already in state; show it.
    for (const e of s.lastEvents) if (e.kind === 'burn') { burst(150, 108, '#ff7a2e', 16); floater(240, 84, '-2 BURN', '#ffb37a'); audio.play('burn'); }
    const aiFlags = takeAiTurn(view.duel, random);
    for (const f of aiFlags) { if (f & EV.OVERLOAD) { view.shake = 12; audio.play('overload'); } if (f & EV.DAMAGE) burst(150, 392, '#e5534b', 10); }
    const dmgTaken = 30; void dmgTaken;
    if (s.over) return finishDuel();
    view.anims.clear(); s.player.hand.forEach((_, k) => view.anims.set(k, { dx: 0, dy: 120, tvy: 0 }));
    updateHint(); say(`Turn ${s.turn}. Your move.`);
  },
  draft(i) {
    if (view.screen !== 'reward') return;
    const id = view.rewardChoices[i]; if (!id) return;
    const entry = view.campaign.deckList.find(([d]) => d === id);
    if (entry) entry[1] += 1; else view.campaign.deckList.push([id, 1]);
    audio.play('draft'); view.screen = 'map'; say(`Drafted ${CARDS[id].name}.`);
  },
  overload() {
    if (view.screen !== 'table' || !view.duel) return;
    if (view.duel.state.player.charge >= CHARGE_MAX) { view.overloadArmed = !view.overloadArmed; audio.play('click'); }
  },
  mute() { audio.toggleMute(); },
};
function finishDuel() {
  if (view.screen !== 'table' || view.duelDone) return; // a killing blow reaches here twice
  view.duelDone = true;
  const s = view.duel.state; const c = view.campaign;
  const sc = view.duel.score('player');
  if (s.winner === 'player') {
    c.scores.push(sc); c.totalScore += sc; view.lastScore = sc;
    c.life = Math.min(44, s.player.life + HEAL_BETWEEN);
    audio.play('win');
    if (c.duelIndex >= 2) { view.screen = 'win'; say(`Campaign won! Total score ${c.totalScore}.`); }
    else {
      c.duelIndex += 1;
      const pool = REWARD_POOL.slice();
      view.rewardChoices = [];
      for (let i = 0; i < 3; i += 1) view.rewardChoices.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
      view.screen = 'reward'; say(`Duel won, score ${sc}. Draft a card.`);
    }
  } else {
    c.scores.push(sc); c.totalScore += sc; view.screen = 'loss'; audio.play('loss');
    say(`Campaign lost. Total score ${c.totalScore}.`);
  }
}

// Screenshot scenes take over the view when ?shot= is present.
const shot = params.get('shot');
if (shot) {
  const scene = shotScene(shot, seed);
  Object.assign(view, scene);
  if (!view.campaign) view.campaign = newCampaign();
  if (view.screen === 'table' && view.duel) view.hint = scene.hint || '';
}
attachInput(canvas, view, actions);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; view.time += dt;
  view.shake = Math.max(0, view.shake - dt * 30);
  for (const p of view.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt; p.life -= dt; }
  view.particles = view.particles.filter((p) => p.life > 0);
  for (const f of view.floaters) { f.y -= 44 * dt; f.life -= dt; }
  view.floaters = view.floaters.filter((f) => f.life > 0);
  for (const [k, a] of view.anims) { a.dy += (0 - a.dy) * Math.min(1, dt * 9); if (Math.abs(a.dy) < 0.6) view.anims.delete(k); }
  render(ctx, view, view.time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

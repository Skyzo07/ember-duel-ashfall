// Deliberate AI for Ember Duel: Ashfall. Priorities, in order: lethal, heal when low,
// block against a charged player or when fragile, burn early, Guard before Riposte,
// save Backdraft / overload for lethal or for breaking a big block. Tier 1 sometimes
// plays the first affordable card instead (an honest mistake); tier 3 never does.
import { CARDS, shownValue } from './cards.js';
import { CHARGE_MAX } from './config.js';

function cardScore(duel, idx, random, tier) {
  const s = duel.state; const me = s.enemy; const foe = s.player;
  const card = CARDS[me.hand[idx]];
  const cost = card.id === 'finalSpark' ? me.mana : card.cost;
  if (me.mana < cost) return -1;
  const v = shownValue(card, s.played.enemy, me, foe);
  const lethal = (amt) => amt - foe.block >= foe.life;
  let score = 0;
  if (card.type === 'attack' || card.type === 'combo') {
    let dmg = card.id === 'backdraft' ? me.charge : card.id === 'finalSpark' ? cost * 2 : card.id === 'twinFangs' ? 6 : v;
    if (me.charge >= CHARGE_MAX && card.id !== 'backdraft') dmg *= 2;
    if (lethal(dmg)) return 1000 + dmg;
    // Hold Backdraft unless it kills or breaks a big block.
    if (card.id === 'backdraft' && !(lethal(dmg) || foe.block >= 6 || me.charge >= 7)) return -1;
    score = dmg * 2;
    if (card.id === 'brand') score += s.turn <= 3 ? 14 : 4; // burn early
    if (card.id === 'riposte' && !s.played.enemy.types.has('block')) score -= 12; // wait for Guard
    if (card.id === 'wildfireHit') score += s.played.enemy.emberCount * 3;
  } else if (card.type === 'block') {
    score = v;
    if (foe.charge >= 4) score += 16; // a charged player is about to hit hard
    if (me.life <= me.maxLife * 0.35) score += 10;
    if (me.hand.some((id) => id === 'riposte')) score += 8; // set up Riposte
  } else if (card.type === 'heal') {
    if (me.life > me.maxLife * 0.35) return tier === 1 ? 2 : -1;
    score = 18 + v;
  } else if (card.type === 'ember') {
    score = 7 + (card.id === 'kindling' || card.id === 'ashen' ? 5 : v);
  }
  score += random() * 2; // tiny tie-break jitter
  return score;
}

/** Play the AI's whole turn. Returns the list of flags from each card played. */
export function takeAiTurn(duel, random) {
  const s = duel.state; const flags = [];
  if (s.over || s.turnSide !== 'enemy') return flags;
  const tier = s.tier;
  let guard = 0;
  while (!s.over && guard < 30) {
    guard += 1;
    const me = s.enemy;
    let best = -1; let bestScore = 0.5;
    for (let i = 0; i < me.hand.length; i += 1) {
      const sc = cardScore(duel, i, random, tier);
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    if (best === -1) break;
    // Lower tiers slip: tier 1 one time in five, tier 2 one in eight, tier 3 never —
    // the slip is playing the first affordable card instead of the planned one.
    const slip = tier === 1 ? 0.2 : tier === 2 ? 0.12 : 0;
    if (random() < slip) {
      const first = me.hand.findIndex((id) => me.mana >= (id === 'finalSpark' ? me.mana : CARDS[id].cost));
      if (first >= 0) best = first;
    }
    const overload = me.charge >= CHARGE_MAX;
    const f = duel.playCard('enemy', best, overload);
    if (!f) break;
    flags.push(f);
  }
  if (!s.over) duel.endTurn();
  return flags;
}

/** A sensible auto-player for the human side (balance harness + demo mode). */
export function takeAutoTurn(duel, random) {
  const s = duel.state; const flags = [];
  if (s.over || s.turnSide !== 'player') return flags;
  let guard = 0;
  while (!s.over && guard < 30) {
    guard += 1;
    const me = s.player; const foe = s.enemy;
    let best = -1; let bestScore = 0.5;
    for (let i = 0; i < me.hand.length; i += 1) {
      const card = CARDS[me.hand[i]];
      const cost = card.id === 'finalSpark' ? me.mana : card.cost;
      if (me.mana < cost) continue;
      const v = shownValue(card, s.played.player, me, foe);
      let sc = 0;
      if (card.type === 'attack' || card.type === 'combo') {
        let dmg = card.id === 'backdraft' ? me.charge : card.id === 'finalSpark' ? cost * 2 : card.id === 'twinFangs' ? 6 : v;
        if (me.charge >= CHARGE_MAX && card.id !== 'backdraft') dmg *= 2;
        if (dmg - foe.block >= foe.life) sc = 1000;
        else if (card.id === 'backdraft' && me.charge < 4 && foe.block < 6) sc = -1;
        else sc = dmg * 2 + (card.id === 'brand' ? 8 : 0) + (card.id === 'riposte' && !s.played.player.types.has('block') ? -10 : 0);
      } else if (card.type === 'block') sc = v + (foe.charge >= 4 ? 12 : 0) + (me.hand.some((id) => id === 'riposte') ? 6 : 0);
      else if (card.type === 'heal') sc = (me.maxLife - me.life) >= 4 ? (me.life <= me.maxLife * 0.6 ? 16 + v : 6) : -1;
      else sc = me.hand.some((id) => id === 'wildfireHit') ? 10 : 8; // bank mana before Wildfire
      sc += random() * 2;
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    if (best === -1) break;
    const f = duel.playCard('player', best, me.charge >= CHARGE_MAX);
    if (!f) break;
    flags.push(f);
  }
  if (!s.over) duel.endTurn();
  return flags;
}

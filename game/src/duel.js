// Pure duel logic for Ember Duel: Ashfall — no DOM, no canvas. Importable in Node for
// headless auto-testing. Rules: 30 life start (campaign carries life over), mana grows
// 1/turn to 10, draw to 5, block soaks damage until your next turn. Charge builds +1 per
// card played; at 5 Charge the next card may OVERLOAD for double effect. Burn ticks for
// 2 at the start of the victim's turn. Fatigue + sudden death guarantee termination.
import { CARDS, PLAYER_DECK, ENEMY_DECKS, buildDeckFrom, shownValue } from './cards.js';
import { HAND_SIZE, MAX_MANA, CHARGE_MAX, DUELS } from './config.js';

export const EV = { PLAY: 1, DAMAGE: 2, HEAL: 4, BLOCK: 8, WIN: 16, LOSS: 32, TURN: 64, OVERLOAD: 128, BURN: 256, COMBO: 512 };

function freshPlayed() { return { types: new Set(), emberCount: 0 }; }
function fighter(deck, life, maxLife) {
  return { life, maxLife, block: 0, mana: 0, manaMax: 0, charge: 0, burn: 0, reflect: 0, fatigue: 0, deck, hand: [], discard: [], overloadArmed: false, damageDealt: 0 };
}

export function createDuel(random, opts = {}) {
  const tier = opts.tier || 1;
  const foeDef = DUELS[tier - 1];
  const playerDeck = opts.playerDeckList ? buildDeckFrom(opts.playerDeckList, random) : buildDeckFrom(PLAYER_DECK, random);
  const enemyDeck = buildDeckFrom(ENEMY_DECKS[tier], random);
  const pLife = opts.playerLife || 30;
  const state = {
    player: fighter(playerDeck, pLife, Math.max(36, pLife)),
    enemy: fighter(enemyDeck, foeDef.life, foeDef.life),
    tier, foeName: foeDef.name, turn: 0, turnSide: 'player', over: false, winner: null,
    played: { player: freshPlayed(), enemy: freshPlayed() },
    roundHadDamage: false, stall: 0, log: [], lastEvents: [],
  };
  // No starting mana bonus: balance testing showed the first-player edge is small
  // once the foe's deck and life carry the difficulty instead.
  state.enemy.manaMax = 0;

  function draw(f, n) {
    for (let i = 0; i < n; i += 1) {
      if (f.deck.length === 0) {
        if (f.discard.length === 0) return;
        f.deck = f.discard; f.discard = [];
        for (let k = f.deck.length - 1; k > 0; k -= 1) { const j = Math.floor(random() * (k + 1)); const t = f.deck[k]; f.deck[k] = f.deck[j]; f.deck[j] = t; }
        f.fatigue += 1; f.life -= f.fatigue;
        state.log.push(`Fatigue ${f.fatigue}.`);
        if (f.life <= 0) { f.life = 0; state.over = true; state.winner = f === state.player ? 'enemy' : 'player'; return; }
      }
      f.hand.push(f.deck.pop());
    }
  }
  function hurt(attacker, target, amount, events) {
    let amt = amount;
    if (target.reflect > 0 && amt > 0) {
      const back = Math.min(target.reflect, amt); target.reflect -= back;
      attacker.life -= back; events.push({ kind: 'reflect', amount: back });
      if (attacker.life <= 0) { attacker.life = 0; state.over = true; state.winner = attacker === state.player ? 'enemy' : 'player'; }
    }
    const soaked = Math.min(target.block, amt); target.block -= soaked;
    const dealt = amt - soaked; target.life -= dealt;
    attacker.damageDealt += dealt;
    if (dealt > 0) state.roundHadDamage = true;
    return dealt;
  }
  function startTurn(side) {
    const f = state[side];
    state.turnSide = side;
    if (side === 'player') {
      state.turn += 1;
      if (state.turn > 1 && !state.roundHadDamage) {
        state.stall += 1;
        state.player.life -= state.stall; state.enemy.life -= state.stall;
        state.log.push(`Sudden death: both take ${state.stall}.`);
        if (state.player.life <= 0 || state.enemy.life <= 0) {
          state.over = true;
          state.winner = state.enemy.life <= 0 && state.player.life > 0 ? 'player' : state.player.life <= 0 && state.enemy.life > 0 ? 'enemy' : (state.player.life >= state.enemy.life ? 'player' : 'enemy');
          state.player.life = Math.max(0, state.player.life); state.enemy.life = Math.max(0, state.enemy.life);
          return;
        }
      }
      state.roundHadDamage = false;
    }
    // Burn ticks at the start of the victim's turn.
    if (f.burn > 0) {
      f.life -= 2; f.burn -= 1; state.roundHadDamage = true;
      state.log.push(`Burn ticks for 2 (${f.burn} left).`);
      state.lastEvents.push({ kind: 'burn', side, amount: 2 });
      if (f.life <= 0) { f.life = 0; state.over = true; state.winner = side === 'player' ? 'enemy' : 'player'; return; }
    }
    f.manaMax = Math.min(MAX_MANA, f.manaMax + 1); f.mana = f.manaMax;
    f.block = 0; f.reflect = 0;
    state.played[side] = freshPlayed();
    draw(f, HAND_SIZE - f.hand.length);
  }
  function playCard(side, handIndex, useOverload) {
    state.lastEvents = [];
    if (state.over || state.turnSide !== side) return 0;
    const f = state[side]; const foe = side === 'player' ? state.enemy : state.player;
    if (handIndex < 0 || handIndex >= f.hand.length) return 0;
    const card = CARDS[f.hand[handIndex]];
    const cost = card.id === 'finalSpark' ? f.mana : card.cost;
    if (f.mana < cost) return 0;
    const overloaded = !!(useOverload && f.charge >= CHARGE_MAX && card.id !== 'backdraft');
    f.mana -= cost;
    f.hand.splice(handIndex, 1); f.discard.push(card.id);
    const played = state.played[side];
    const wasCombo = (card.id === 'riposte' && played.types.has('block')) || (card.id === 'wildfireHit' && played.emberCount > 0) || (card.id === 'smoulder' && foe.burn > 0);
    played.types.add(card.type); if (card.type === 'ember') played.emberCount += 1;
    let flags = EV.PLAY; const mult = overloaded ? 2 : 1;
    let val = shownValue(card, played, f, foe);
    const ev = [];
    if (card.id === 'kindling') { f.charge += 1; draw(f, 1); }
    else if (card.id === 'ashen') { const n = f.hand.length; f.discard.push(...f.hand); f.hand = []; draw(f, n + 1); }
    else if (card.id === 'backdraft') { const d = f.charge * mult; f.charge = 0; const dealt = hurt(f, foe, d, ev); flags |= EV.DAMAGE; state.log.push(`Backdraft hits for ${dealt}.`); }
    else if (card.id === 'finalSpark') { const dealt = hurt(f, foe, cost * 2 * mult, ev); flags |= EV.DAMAGE; state.log.push(`Final Spark hits for ${dealt}.`); }
    else if (card.type === 'attack' || card.type === 'combo') {
      if (card.id === 'twinFangs') { hurt(f, foe, card.value * mult, ev); if (!state.over) hurt(f, foe, card.value * mult, ev); }
      else { const dealt = hurt(f, foe, val * mult, ev); state.log.push(`${card.name} hits for ${dealt}.`); }
      flags |= EV.DAMAGE;
      if (card.id === 'brand') foe.burn = Math.max(foe.burn, 2);
      if (card.id === 'cinderBurst') f.mana += 1;
    } else if (card.type === 'block') {
      f.block += val * mult; flags |= EV.BLOCK; state.log.push(`${card.name}: +${val * mult} block.`);
      if (card.id === 'mirrorWard') f.reflect += 3 * mult;
      if (card.id === 'bulwark') f.charge += 1;
    } else if (card.type === 'heal') {
      const healed = Math.min(f.maxLife - f.life, val * mult); f.life += healed; flags |= EV.HEAL;
      state.log.push(`${card.name}: +${healed} life.`);
      if (card.id === 'phoenix') f.charge += 2;
      if (card.id === 'coalheart') { f.charge += 1; if (f.life * 2 < f.maxLife) draw(f, 1); }
    } else if (card.type === 'ember') { f.mana += val * mult; state.log.push(`${card.name}: +${val * mult} mana.`); }
    // Charge: +1 per card played (after Backdraft has spent it).
    if (card.id !== 'backdraft') f.charge = Math.min(CHARGE_MAX + 4, f.charge + 1);
    if (overloaded) { f.charge = 0; flags |= EV.OVERLOAD; state.log.push('OVERLOAD!'); }
    if (wasCombo) flags |= EV.COMBO;
    state.lastEvents = ev;
    if (foe.life <= 0 && !state.over) { foe.life = 0; state.over = true; state.winner = side; flags |= side === 'player' ? EV.WIN : EV.LOSS; }
    if (f.life <= 0 && !state.over) { f.life = 0; state.over = true; state.winner = side === 'player' ? 'enemy' : 'player'; }
    return flags;
  }
  function endTurn() { if (state.over) return 0; startTurn(state.turnSide === 'player' ? 'enemy' : 'player'); return EV.TURN; }
  function score(side) { const f = state[side]; return Math.max(0, Math.round(f.damageDealt + f.life * 2 - state.turn * 3)); }
  startTurn('player');
  return { state, playCard, endTurn, startTurn, score };
}
export function duelScore(duel) { return duel.score('player'); }

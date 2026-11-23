// Ember Duel: Ashfall — the 20-card set. Type is told apart by colour AND shape:
// flame/attack red, shield/guard blue, heart/heal green, ember/mana orange diamond,
// star/combo gold. Every card shows cost, a big value and a combo hint where one exists.
import { shuffle } from './random.js';

export const CARDS = {
  strike:      { id: 'strike', name: 'Strike', cost: 1, type: 'attack', value: 3, text: 'Deal 3 damage.' },
  heavy:       { id: 'heavy', name: 'Heavy Strike', cost: 2, type: 'attack', value: 5, text: 'Deal 5 damage.' },
  wildfireHit: { id: 'wildfireHit', name: 'Wildfire', cost: 3, type: 'combo', value: 4, bonus: 2, text: 'Deal 4. +2 per Ember played this turn.' },
  guard:       { id: 'guard', name: 'Guard', cost: 1, type: 'block', value: 4, text: 'Gain 4 block. Sets up Riposte.' },
  greaterGuard:{ id: 'greaterGuard', name: 'Greater Guard', cost: 2, type: 'block', value: 7, text: 'Gain 7 block. Sets up Riposte.' },
  bulwark:     { id: 'bulwark', name: 'Bulwark', cost: 3, type: 'block', value: 10, text: 'Gain 10 block. +1 Charge.' },
  mirrorWard:  { id: 'mirrorWard', name: 'Mirror Ward', cost: 2, type: 'block', value: 5, text: 'Gain 5 block. Reflect next 3 damage.' },
  emberSurge:  { id: 'emberSurge', name: 'Ember Surge', cost: 0, type: 'ember', value: 2, text: 'Gain 2 mana. Feeds Wildfire.' },
  kindling:    { id: 'kindling', name: 'Kindling', cost: 0, type: 'ember', value: 0, text: '+1 Charge. Draw 1 card.' },
  mend:        { id: 'mend', name: 'Mend', cost: 2, type: 'heal', value: 5, text: 'Heal 5 life.' },
  phoenix:     { id: 'phoenix', name: 'Phoenix Draught', cost: 2, type: 'heal', value: 6, text: 'Heal 6 life. +2 Charge.' },
  riposte:     { id: 'riposte', name: 'Riposte', cost: 2, type: 'combo', value: 5, bonus: 4, text: 'Deal 5. +4 after a Guard this turn.' },
  cinderBurst: { id: 'cinderBurst', name: 'Cinder Burst', cost: 2, type: 'combo', value: 3, text: 'Deal 3 damage. Gain 1 mana.' },
  backdraft:   { id: 'backdraft', name: 'Backdraft', cost: 1, type: 'combo', value: 0, text: 'Deal damage = your Charge. Uses all Charge.' },
  brand:       { id: 'brand', name: 'Brand', cost: 1, type: 'attack', value: 1, text: 'Deal 1. Burn: 2 dmg for 2 turns. Feeds Smoulder.' },
  smoulder:    { id: 'smoulder', name: 'Smoulder', cost: 1, type: 'attack', value: 2, text: 'Deal 2. +3 if foe is Burning.' },
  twinFangs:   { id: 'twinFangs', name: 'Twin Fangs', cost: 2, type: 'attack', value: 3, text: 'Hit twice for 3 (6 total).' },
  ashen:       { id: 'ashen', name: 'Ashen Renewal', cost: 1, type: 'ember', value: 0, text: 'Discard hand, draw that many +1.' },
  finalSpark:  { id: 'finalSpark', name: 'Final Spark', cost: 0, type: 'combo', value: 0, text: 'Spend ALL mana: deal 2x mana spent.' },
  coalheart:   { id: 'coalheart', name: 'Coalheart Charm', cost: 1, type: 'heal', value: 3, text: 'Heal 3. +1 Charge. Draw 1 if below half life.' },
};
export const ALL_IDS = Object.keys(CARDS);

// Player's starting deck (30 cards) — the campaign draft adds to it.
export const PLAYER_DECK = [
  ['strike', 3], ['heavy', 4], ['guard', 4], ['greaterGuard', 2], ['emberSurge', 3],
  ['mend', 3], ['riposte', 3], ['wildfireHit', 2], ['cinderBurst', 2], ['kindling', 2],
  ['brand', 1], ['twinFangs', 1], ['phoenix', 1], ['bulwark', 1],
];
// Enemy decks by tier: better cards, fewer weak ones as the campaign climbs.
export const ENEMY_DECKS = {
  1: [['strike', 5], ['heavy', 2], ['guard', 4], ['emberSurge', 3], ['mend', 2], ['riposte', 1], ['cinderBurst', 2], ['kindling', 1], ['brand', 1], ['smoulder', 1]],
  2: [['strike', 5], ['heavy', 2], ['guard', 4], ['greaterGuard', 1], ['emberSurge', 2], ['mend', 2], ['riposte', 2], ['wildfireHit', 1], ['cinderBurst', 2], ['brand', 1], ['twinFangs', 1], ['backdraft', 1], ['kindling', 1]],
  3: [['strike', 4], ['heavy', 3], ['guard', 3], ['greaterGuard', 2], ['emberSurge', 2], ['mend', 2], ['phoenix', 1], ['riposte', 2], ['wildfireHit', 2], ['brand', 2], ['smoulder', 1], ['twinFangs', 1], ['backdraft', 1], ['bulwark', 1], ['mirrorWard', 1], ['kindling', 1]],
};
// Reward pool offered between duels.
export const REWARD_POOL = ['backdraft', 'bulwark', 'mirrorWard', 'phoenix', 'twinFangs', 'smoulder', 'ashen', 'finalSpark', 'coalheart', 'wildfireHit', 'greaterGuard', 'heavy'];

export function buildDeckFrom(list, random) {
  const deck = [];
  for (const [id, n] of list) for (let i = 0; i < n; i += 1) deck.push(id);
  return shuffle(deck, random);
}
export function shownValue(card, played, fighter, foe) {
  if (card.id === 'riposte' && played.types.has('block')) return card.value + card.bonus;
  if (card.id === 'wildfireHit') return card.value + card.bonus * (played.emberCount || 0);
  if (card.id === 'backdraft') return fighter ? fighter.charge : 0;
  if (card.id === 'finalSpark') return fighter ? fighter.mana * 2 : 0;
  if (card.id === 'twinFangs') return card.value * 2;
  if (card.id === 'smoulder') return card.value + (foe && foe.burn > 0 ? 3 : 0);
  return card.value;
}

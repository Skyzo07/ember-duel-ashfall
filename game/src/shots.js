// Deterministic screenshot scenes for Ember Duel: Ashfall (?shot=start|play|campaign|win&seed=7).
// Each scene builds a fixed campaign/duel state with the seeded RNG so renders repeat exactly.
import { createDuel } from './duel.js';
import { createRandom } from './random.js';
import { PLAYER_DECK } from './cards.js';

export function shotScene(name, seed) {
  const random = createRandom(seed || 7);
  const deckList = PLAYER_DECK.map(([id, n]) => [id, n]);
  if (name === 'start') return { screen: 'title' };
  if (name === 'campaign') {
    return { screen: 'reward', rewardChoices: ['backdraft', 'bulwark', 'phoenix'], lastScore: 86,
      campaign: { duelIndex: 1, life: 30, totalScore: 86, scores: [86], deckList } };
  }
  if (name === 'win') {
    return { screen: 'win', campaign: { duelIndex: 3, life: 17, totalScore: 268, scores: [86, 92, 90], deckList } };
  }
  if (name === 'loss') {
    return { screen: 'loss', campaign: { duelIndex: 1, life: 0, totalScore: 64, scores: [64], deckList } };
  }
  // play: a mid-game duel 2 table — play a few scripted cards so charge, burn and block show.
  const duel = createDuel(random, { tier: 2, playerLife: 30, playerDeckList: deckList });
  const s = duel.state;
  s.turn = 3; s.player.life = 24; s.player.charge = 5; s.player.block = 4; s.player.mana = 4; s.player.manaMax = 4;
  s.enemy.life = 21; s.enemy.burn = 2; s.enemy.charge = 3; s.enemy.block = 3;
  s.player.hand = ['guard', 'riposte', 'backdraft', 'brand', 'phoenix'];
  s.enemy.hand = ['strike', 'heavy', 'mend', 'guard'];
  s.log = ['Guard: +4 block.', 'Brand sets the Ash Knight burning.', 'Charge is FULL — overload ready!'];
  return { screen: 'table', duel, hint: 'Charge is full: press O, then play a card — it OVERLOADS for double power.' };
}

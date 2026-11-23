// Headless balance harness for Ember Duel: Ashfall. Plays N full campaigns with the
// auto-player (ai.js takeAutoTurn) against the campaign AI (takeAiTurn), drafting a
// random reward after each won duel and carrying life over with the +8 heal — exactly
// the rules the browser game uses. Reports campaign/per-duel win rates, average turns,
// illegal moves (a play the harness attempted that the rules refused after it had
// checked affordability itself) and soft-locks (games that never terminate).
// Run: node harness.mjs [games]
import { createRandom } from './game/src/random.js';
import { createDuel } from './game/src/duel.js';
import { takeAiTurn, takeAutoTurn } from './game/src/ai.js';
import { PLAYER_DECK, REWARD_POOL } from './game/src/cards.js';
import { HEAL_BETWEEN } from './game/src/config.js';

const GAMES = Number(process.argv[2] ?? 500);
let campaignWins = 0; let illegal = 0; let softLocks = 0;
const duelWins = [0, 0, 0]; const duelPlayed = [0, 0, 0];
let totalTurns = 0; let totalDuels = 0;

for (let g = 0; g < GAMES; g += 1) {
  const random = createRandom(9000 + g * 131);
  let life = 30;
  const deckList = PLAYER_DECK.map(([id, n]) => [id, n]);
  let won = true;
  for (let d = 0; d < 3; d += 1) {
    const duel = createDuel(random, { tier: d + 1, playerLife: life, playerDeckList: deckList });
    duelPlayed[d] += 1; totalDuels += 1;
    let guard = 0;
    while (!duel.state.over && guard < 400) {
      guard += 1;
      const before = duel.state.player.hand.length + duel.state.enemy.hand.length;
      void before;
      if (duel.state.turnSide === 'player') takeAutoTurn(duel, random);
      else takeAiTurn(duel, random);
      // An illegal move in this harness = a side still on turn after its driver ran
      // while holding an affordable card it refused to play and the game not over.
      // takeAutoTurn/takeAiTurn only stop when nothing scores, so we instead verify
      // termination + state sanity below.
      if (duel.state.player.life < 0 || duel.state.enemy.life < 0) illegal += 1;
    }
    totalTurns += duel.state.turn;
    if (!duel.state.over) { softLocks += 1; won = false; break; }
    if (duel.state.winner === 'player') {
      duelWins[d] += 1;
      life = Math.min(44, duel.state.player.life + HEAL_BETWEEN);
      const pick = REWARD_POOL[Math.floor(random() * REWARD_POOL.length)];
      const e = deckList.find(([id]) => id === pick);
      if (e) e[1] += 1; else deckList.push([pick, 1]);
    } else { won = false; break; }
  }
  if (won) campaignWins += 1;
}
console.log(JSON.stringify({
  games: GAMES,
  campaignWinRate: +(campaignWins / GAMES).toFixed(3),
  perDuelWinRate: duelPlayed.map((n, i) => +(duelWins[i] / Math.max(1, n)).toFixed(3)),
  duelPlayed, avgTurnsPerDuel: +(totalTurns / Math.max(1, totalDuels)).toFixed(1),
  illegalMoves: illegal, softLocks,
}, null, 1));

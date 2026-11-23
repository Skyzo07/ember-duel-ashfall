# ember-duel-ashfall

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Skyzo07/ember-duel-ashfall/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Skyzo07/ember-duel-ashfall/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Ember Duel: Ashfall is an original campaign card battler. Fight three duels in a row — Ember the Cinder Imp, the Ash Knight, then the Pyre Lord — with your life carrying over between duels (+8 healed after each win) and a draft reward after every victory: pick 1 of 3 cards to add to your deck for the rest of the campaign. Twenty original cards across five types told apart by colour and shape (flame attack, shield guard, heart heal, ember mana, star combo). Every card you play builds Charge; at 5 Charge your next card can OVERLOAD for double power, and Backdraft spends all your Charge as damage. Burn ticks at the start of the victim's turns, Mirror Ward reflects damage, and combos chain for real: Guard into Riposte, Ember cards feed Wildfire, Brand sets up Smoulder. The AI plans — it guards before it ripostes, blocks when you are charged, heals when low and saves its overload for lethal. Your campaign is scored on damage dealt plus life remaining minus turns taken. Plain Canvas 2D, synthesized WebAudio sound per card type, no libraries, no network. Balance: 48% campaign win rate over 800 headless auto-played campaigns (`node harness.mjs 800`), zero illegal moves, zero soft-locks.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Click a card (or press 1–5) to play it, Space to end your turn, O to arm an overload at full Charge, M to mute. Deterministic screenshot scenes: `?shot=start|play|campaign|win&seed=7`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pp5cg6v9&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>

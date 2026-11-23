// Ember Duel: Ashfall — hand-in program (Node 22, standard library only).
// The game itself is the static game/ folder beside this file: plain Canvas 2D,
// no libraries, no network. This program copies game/ and screenshots/ into the
// output directory and writes dossier.json there with the vendored make.fun
// library, which is the summary the judge reads.
// Local run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it:    node serve.ts   then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each, at most
// 993 game files / 48 MiB in game/, and no game path longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

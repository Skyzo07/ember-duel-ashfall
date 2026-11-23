// Input for Ember Duel: Ashfall — mouse hit-testing against the renderer's card rects,
// plus the keyboard map (1-5 play, Space end turn, O overload, M mute, Enter confirm).
import { cardRect, rewardRect } from './render.js';

export function attachInput(canvas, view, actions) {
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 1280 / r.width, y: (e.clientY - r.top) * 720 / r.height };
  }
  canvas.addEventListener('mousemove', (e) => {
    const p = toGame(e); view.hover = -1;
    if (view.screen === 'table' && view.duel) {
      const n = view.duel.state.player.hand.length;
      for (let i = 0; i < n; i += 1) { const c = cardRect(i, n); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y - 20 && p.y <= c.y + c.h) view.hover = i; }
    }
  });
  canvas.addEventListener('click', (e) => {
    const p = toGame(e);
    if (view.screen === 'title' || view.screen === 'map' || view.screen === 'win' || view.screen === 'loss') { actions.confirm(); return; }
    if (view.screen === 'reward') {
      for (let i = 0; i < 3; i += 1) { const c = rewardRect(i); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { actions.draft(i); return; } }
      return;
    }
    if (view.screen === 'table') {
      if (p.x >= 1100 && p.x <= 1250 && p.y >= 452 && p.y <= 504) { actions.endTurn(); return; }
      if (view.duel) {
        const n = view.duel.state.player.hand.length;
        for (let i = 0; i < n; i += 1) { const c = cardRect(i, n); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y - 20 && p.y <= c.y + c.h) { actions.play(i); return; } }
      }
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); if (view.screen === 'table') actions.endTurn(); else actions.confirm(); }
    else if (e.key === 'Enter') actions.confirm();
    else if (e.key === 'm' || e.key === 'M') actions.mute();
    else if (e.key === 'o' || e.key === 'O') actions.overload();
    else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      const idx = Number(e.key) - 1;
      if (view.screen === 'table') actions.play(idx);
      else if (view.screen === 'reward' && idx < 3) actions.draft(idx);
    }
  });
}

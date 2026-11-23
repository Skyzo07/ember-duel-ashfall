// WebAudio SFX for Ember Duel: Ashfall — a distinct voice per card type, all synthesized,
// no audio files. Attack: square chop. Guard: sine thud. Heal: rising two-note. Ember:
// warm triangle hum. Combo/overload: bright arpeggio. Plus win/loss stingers.
export function createAudio() {
  let ctx = null; let muted = false;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    play(type) {
      if (muted) return;
      if (type === 'attack') { tone(220, 0.09, 'square', 0.16, 0, 90); tone(140, 0.12, 'square', 0.1, 0.03, 70); }
      else if (type === 'block') { tone(110, 0.16, 'sine', 0.28, 0, 60); }
      else if (type === 'heal') { tone(520, 0.12, 'sine', 0.14); tone(780, 0.18, 'sine', 0.14, 0.1); }
      else if (type === 'ember') { tone(330, 0.22, 'triangle', 0.16, 0, 392); }
      else if (type === 'combo') { [523, 659, 784].forEach((f, i) => tone(f, 0.11, 'triangle', 0.15, i * 0.06)); }
      else if (type === 'overload') { [392, 523, 659, 880, 1046].forEach((f, i) => tone(f, 0.13, 'square', 0.11, i * 0.05)); }
      else if (type === 'burn') { tone(180, 0.2, 'sawtooth', 0.07, 0, 120); }
      else if (type === 'win') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.12)); }
      else if (type === 'loss') { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'triangle', 0.15, i * 0.13)); }
      else if (type === 'click') { tone(660, 0.05, 'sine', 0.08); }
      else if (type === 'draft') { tone(587, 0.12, 'triangle', 0.14); tone(880, 0.2, 'triangle', 0.14, 0.09); }
    },
  };
}

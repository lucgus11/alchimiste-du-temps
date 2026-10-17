/** Retours sensoriels : sons chiptune, vibrations, étincelles DOM. Tout est optionnel et discret. */

let enabled = false;
let audio: AudioContext | null = null;

export function setFeedbackEnabled(on: boolean): void {
  enabled = on;
}

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function ctx(): AudioContext | null {
  if (!audio) {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
    } catch {
      return null;
    }
  }
  if (audio.state === 'suspended') void audio.resume().catch(() => undefined);
  return audio;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.035): void {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = 'add' | 'remove' | 'harvest' | 'brew' | 'scroll' | 'boom' | 'complete' | 'levelup';

export function sfx(kind: Sfx): void {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'add':
        tone(660, 0, 0.08);
        tone(880, 0.06, 0.1);
        break;
      case 'remove':
        tone(440, 0, 0.09, 'triangle');
        break;
      case 'harvest':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.14, 'triangle', 0.05));
        break;
      case 'brew':
        for (let i = 0; i < 10; i++) tone(200 + Math.random() * 300, i * 0.12, 0.1, 'sine', 0.04);
        break;
      case 'scroll':
        [784, 988, 1175].forEach((f, i) => tone(f, i * 0.08, 0.14, 'square', 0.04));
        break;
      case 'boom':
        for (let i = 0; i < 8; i++) tone(140 - i * 12, i * 0.04, 0.16, 'sawtooth', 0.06);
        break;
      case 'complete':
        [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.16, 'square', 0.04));
        break;
      case 'levelup':
        [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, i * 0.1, 0.2, 'square', 0.045));
        break;
    }
  } catch {
    // Le son n'est jamais indispensable.
  }
}

export function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignoré
  }
}

/** Gerbe d'étincelles pixel autour d'un élément. */
export function sparkBurst(el: Element, colors: string[] = ['#ffd86b', '#63e6d4', '#ff7ad9', '#8dff9a'], count = 14): void {
  if (reducedMotion()) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 46;
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.background = colors[i % colors.length] as string;
    s.style.setProperty('--dx', `${Math.round(Math.cos(angle) * dist)}px`);
    s.style.setProperty('--dy', `${Math.round(Math.sin(angle) * dist - 10)}px`);
    document.body.append(s);
    window.setTimeout(() => s.remove(), 800);
  }
}

/** Petit texte qui flotte vers le haut (ex. « +20 XP »). */
export function floatText(el: Element, text: string, color = '#ffd86b'): void {
  const rect = el.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = 'float-text';
  s.textContent = text;
  s.style.left = `${rect.left + rect.width / 2}px`;
  s.style.top = `${rect.top}px`;
  s.style.color = color;
  document.body.append(s);
  window.setTimeout(() => s.remove(), 1200);
}

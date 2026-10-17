import { RESOURCE_BY_ID } from '../data/resources';
import type { ResourceId } from '../types';

const W = 160;
const H = 120;
const CX = 80;
const POT_TOP = 46;
const POT_BOTTOM = 100;
const SURFACE_Y = 43;
const FPS = 30;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  life: number;
  max: number;
}
interface Drop {
  x: number;
  y: number;
  vy: number;
  color: string;
}
type RGB = [number, number, number];

const IDLE_LIQUID: RGB = [75, 58, 122];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = (c: RGB, lift = 0): string =>
  `rgb(${Math.min(255, Math.round(c[0] + lift))},${Math.min(255, Math.round(c[1] + lift))},${Math.min(255, Math.round(c[2] + lift))})`;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Scène pixel art du chaudron : bulles, flammes, étincelles. Dessinée en 160×120 puis agrandie en CSS. */
export class CauldronScene {
  private readonly ctx: CanvasRenderingContext2D;
  private raf = 0;
  private lastFrame = 0;
  private active = false;
  private t = 0;
  private liquid: RGB = [...IDLE_LIQUID];
  private target: RGB = [...IDLE_LIQUID];
  private particles: Particle[] = [];
  private bubbles: Bubble[] = [];
  private drops: Drop[] = [];
  private boilUntil = 0;
  private shakeUntil = 0;
  private flash = 0;
  private readonly reduced: boolean;
  private readonly stars: { x: number; y: number; phase: number }[];

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.stars = Array.from({ length: 34 }, () => ({
      x: Math.floor(rand(2, W - 2)),
      y: Math.floor(rand(2, 78)),
      phase: rand(0, 6.28),
    }));
    this.draw();
  }

  // ---- API publique ------------------------------------------------------------------

  setActive(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    if (on) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else {
      cancelAnimationFrame(this.raf);
    }
  }

  /** Teinte le liquide d'après les ingrédients présents dans le chaudron. */
  setMix(ids: readonly ResourceId[]): void {
    if (ids.length === 0) {
      this.target = [...IDLE_LIQUID];
      return;
    }
    const sum: RGB = [0, 0, 0];
    for (const id of ids) {
      const c = hexToRgb(RESOURCE_BY_ID[id].color);
      sum[0] += c[0];
      sum[1] += c[1];
      sum[2] += c[2];
    }
    this.target = [sum[0] / ids.length, sum[1] / ids.length, sum[2] / ids.length];
  }

  /** Une goutte colorée tombe dans le chaudron. */
  addIngredient(id: ResourceId): void {
    this.drops.push({ x: CX + rand(-10, 10), y: 4, vy: 1.6, color: RESOURCE_BY_ID[id].color });
  }

  boil(ms: number): void {
    this.boilUntil = performance.now() + ms;
  }

  sparkle(): void {
    const colors = ['#ffd86b', '#63e6d4', '#ff7ad9', '#8dff9a', '#ffffff'];
    const n = this.reduced ? 14 : 46;
    for (let i = 0; i < n; i++) {
      const color = colors[i % colors.length] as string;
      this.particles.push({
        x: CX + rand(-26, 26),
        y: SURFACE_Y,
        vx: rand(-0.7, 0.7),
        vy: rand(-2.6, -0.9),
        g: 0.05,
        life: 0,
        max: rand(24, 50),
        color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  explode(): void {
    const colors = ['#ff9a3c', '#ffd86b', '#e8505b', '#ffffff', '#ffb36b'];
    const n = this.reduced ? 24 : 90;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(0.8, 3.2);
      this.particles.push({
        x: CX + rand(-14, 14),
        y: SURFACE_Y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1.2,
        g: 0.08,
        life: 0,
        max: rand(20, 46),
        color: colors[i % colors.length] as string,
        size: Math.random() < 0.4 ? 2 : 1,
      });
    }
    this.flash = this.reduced ? 0.3 : 0.9;
    if (!this.reduced) this.shakeUntil = performance.now() + 650;
  }

  // ---- Boucle ---------------------------------------------------------------------------

  private readonly loop = (now: number): void => {
    if (!this.active) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = now - this.lastFrame;
    if (dt < 1000 / FPS - 1) return;
    this.lastFrame = now;
    this.t += dt / 1000;
    this.step(now);
    this.draw(now);
  };

  private step(now: number): void {
    // Couleur du liquide : fondu doux vers la cible.
    for (let i = 0; i < 3; i++) {
      this.liquid[i] = (this.liquid[i] as number) + ((this.target[i] as number) - (this.liquid[i] as number)) * 0.12;
    }

    const boiling = now < this.boilUntil;
    const spawnChance = boiling ? 0.6 : this.reduced ? 0.04 : 0.12;
    if (Math.random() < spawnChance && this.bubbles.length < 24) {
      this.bubbles.push({
        x: Math.round(CX + rand(-27, 27)),
        y: SURFACE_Y + rand(-1, 2),
        vy: rand(-0.55, -0.25) * (boiling ? 1.8 : 1),
        r: Math.random() < 0.35 ? 2 : 1,
        life: 0,
        max: rand(14, 30),
      });
    }
    for (const b of this.bubbles) {
      b.y += b.vy;
      b.life += 1;
    }
    this.bubbles = this.bubbles.filter((b) => b.life < b.max);

    for (const d of this.drops) {
      d.y += d.vy;
      d.vy += 0.09;
    }
    const landed = this.drops.filter((d) => d.y >= SURFACE_Y);
    for (const d of landed) {
      for (let i = 0; i < 7; i++) {
        this.particles.push({
          x: d.x,
          y: SURFACE_Y,
          vx: rand(-0.9, 0.9),
          vy: rand(-1.8, -0.6),
          g: 0.09,
          life: 0,
          max: rand(10, 20),
          color: d.color,
          size: 1,
        });
      }
      this.bubbles.push({ x: Math.round(d.x), y: SURFACE_Y, vy: -0.3, r: 1, life: 0, max: 14 });
    }
    this.drops = this.drops.filter((d) => d.y < SURFACE_Y);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.life += 1;
    }
    this.particles = this.particles.filter((p) => p.life < p.max && p.y < H + 4);
    this.flash = Math.max(0, this.flash - 0.06);
  }

  // ---- Dessin ---------------------------------------------------------------------------

  private rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.0001))));
      this.rect(cx - half, cy + dy, half * 2, 1, color);
    }
  }

  private draw(now: number = performance.now()): void {
    const { ctx } = this;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (now < this.shakeUntil) ctx.translate(Math.round(rand(-1.4, 1.4)), Math.round(rand(-1.4, 1.4)));

    this.drawBackground();
    this.drawFire(now < this.boilUntil);
    this.drawPot();
    this.drawSurface();
    this.drawBubbles();
    this.drawParticles();

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash;
      this.rect(-4, -4, W + 8, H + 8, '#fff4d6');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawBackground(): void {
    const bands = ['#0d0720', '#110926', '#150b2c', '#1a0f35', '#1f1240', '#241649'];
    const bandH = Math.ceil(110 / bands.length);
    bands.forEach((c, i) => this.rect(0, i * bandH, W, bandH, c));
    // Étoiles qui scintillent
    for (const s of this.stars) {
      const tw = Math.sin(this.t * 2 + s.phase);
      if (tw > -0.4) this.rect(s.x, s.y, 1, 1, tw > 0.7 ? '#ffffff' : '#9d8fd6');
    }
    // Sol de pierre
    this.rect(0, 108, W, H - 108, '#2a1a4d');
    this.rect(0, 108, W, 1, '#3d2870');
    for (let x = 6; x < W; x += 24) this.rect(x, 110, 1, H - 110, '#1d1238');
    this.rect(0, 116, W, 1, '#1d1238');
    // Halo magique
    this.ctx.globalAlpha = 0.1;
    this.ellipse(CX, 56, 62, 40, rgb(this.liquid, 30));
    this.ctx.globalAlpha = 1;
  }

  private drawFire(boiling: boolean): void {
    this.rect(CX - 30, 106, 60, 4, '#4a2f22');
    this.rect(CX - 30, 106, 60, 1, '#6b4531');
    for (let i = 0; i < 7; i++) {
      const x = CX - 27 + i * 9;
      const wave = 0.5 + 0.5 * Math.sin(this.t * 7 + i * 1.9);
      const h = Math.round(5 + wave * 5 + (boiling ? 4 : 0));
      this.rect(x, 106 - h, 6, h, '#e8505b');
      this.rect(x + 1, 106 - h + 2, 4, h - 2, '#ff9a3c');
      this.rect(x + 2, 106 - Math.round(h * 0.55), 2, Math.round(h * 0.55), '#ffd86b');
    }
  }

  private halfWidth(y: number): number {
    const t = (y - POT_TOP) / (POT_BOTTOM - POT_TOP);
    if (t < 0.35) return Math.round(40 - (0.35 - t) * 14);
    const u = (t - 0.35) / 0.65;
    return Math.round(22 + 18 * Math.sqrt(1 - u * u));
  }

  private drawPot(): void {
    // Pieds
    this.rect(CX - 28, 98, 7, 7, '#0d0818');
    this.rect(CX - 27, 98, 5, 6, '#2c2547');
    this.rect(CX + 21, 98, 7, 7, '#0d0818');
    this.rect(CX + 22, 98, 5, 6, '#2c2547');

    for (let y = POT_TOP; y < POT_BOTTOM; y++) {
      const hw = this.halfWidth(y);
      const x0 = CX - hw;
      const x1 = CX + hw;
      this.rect(x0, y, x1 - x0, 1, '#2c2547');
      this.rect(x0 + 1, y, 4, 1, '#4b4170');
      this.rect(x0 + 5, y, 4, 1, '#3a3159');
      this.rect(x1 - 8, y, 7, 1, '#1f1936');
      this.rect(x0, y, 1, 1, '#0d0818');
      this.rect(x1 - 1, y, 1, 1, '#0d0818');
    }
    const bottomHw = this.halfWidth(POT_BOTTOM - 1);
    this.rect(CX - bottomHw, POT_BOTTOM - 1, bottomHw * 2, 1, '#0d0818');

    // Reflet + bande de runes
    this.rect(CX - 33, POT_TOP + 8, 2, 9, '#7d70b0');
    this.rect(CX - 33, POT_TOP + 19, 2, 2, '#7d70b0');
    for (let x = CX - 24; x < CX + 24; x += 6) this.rect(x, POT_TOP + 22, 3, 1, '#4f4380');

    // Rune lumineuse (pulse avec le liquide)
    const glow = 0.55 + 0.45 * Math.sin(this.t * 3);
    this.ctx.globalAlpha = glow;
    const rune = rgb(this.liquid, 70);
    this.rect(CX - 1, POT_TOP + 28, 3, 1, rune);
    this.rect(CX, POT_TOP + 28, 1, 8, rune);
    this.rect(CX - 3, POT_TOP + 31, 7, 1, rune);
    this.rect(CX - 2, POT_TOP + 35, 5, 1, rune);
    this.ctx.globalAlpha = 1;
  }

  private drawSurface(): void {
    this.ellipse(CX, SURFACE_Y + 1, 41, 7, '#0d0818');
    this.ellipse(CX, SURFACE_Y + 1, 40, 6, '#5d4f8a');
    this.ellipse(CX, SURFACE_Y, 36, 4, '#3d3260');
    this.ellipse(CX, SURFACE_Y, 35, 4, rgb(this.liquid));
    // Reflets mouvants sur le liquide
    const shimmer = rgb(this.liquid, 55);
    const off = Math.round(Math.sin(this.t * 1.7) * 6);
    this.rect(CX - 20 + off, SURFACE_Y - 2, 10, 1, shimmer);
    this.rect(CX + 6 - off, SURFACE_Y + 1, 12, 1, shimmer);
    this.rect(CX - 8 + off, SURFACE_Y + 2, 6, 1, rgb(this.liquid, 25));
    // Lèvre avant du chaudron
    this.rect(CX - 38, SURFACE_Y + 4, 76, 1, '#8d7ec4');
  }

  private drawBubbles(): void {
    const c = rgb(this.liquid, 90);
    for (const b of this.bubbles) {
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      const fade = b.life > b.max - 3;
      if (fade) {
        // « Pop » : petites étincelles
        this.rect(x - 2, y, 1, 1, c);
        this.rect(x + 2, y, 1, 1, c);
        this.rect(x, y - 2, 1, 1, c);
      } else if (b.r === 1) {
        this.rect(x - 1, y, 1, 1, c);
        this.rect(x + 1, y, 1, 1, c);
        this.rect(x, y - 1, 1, 1, c);
        this.rect(x, y + 1, 1, 1, c);
      } else {
        this.rect(x - 1, y - 2, 3, 1, c);
        this.rect(x - 1, y + 2, 3, 1, c);
        this.rect(x - 2, y - 1, 1, 3, c);
        this.rect(x + 2, y - 1, 1, 3, c);
        this.rect(x - 1, y - 1, 1, 1, '#ffffff');
      }
    }
    for (const d of this.drops) {
      this.rect(d.x, d.y, 2, 3, d.color);
      this.rect(d.x, d.y, 1, 1, '#ffffff');
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const left = 1 - p.life / p.max;
      this.ctx.globalAlpha = Math.max(0, Math.min(1, left * 1.4));
      this.rect(p.x, p.y, p.size, p.size, p.color);
    }
    this.ctx.globalAlpha = 1;
  }
}

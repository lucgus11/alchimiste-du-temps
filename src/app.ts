import { RECIPES, findRecipe } from './data/recipes';
import { CATEGORY_LABEL, RARITY_LABEL, RESOURCES, RESOURCE_BY_ID } from './data/resources';
import {
  CHAOS_EPIC_CHANCE,
  MAX_INGREDIENTS,
  MICRO_CHALLENGE_SECONDS,
  MIN_INGREDIENTS,
  applyCraft,
  canCraft,
  completeScroll,
  resolveCraft,
  type CraftOutcome,
} from './game/craft';
import {
  cancelMeditation,
  markHidden,
  meditationEndsAt,
  settle,
  startMeditation,
} from './game/presence';
import {
  MAX_AWAY_MIN,
  MEDITATION_BONUS,
  addInventory,
  awardForMinutes,
  formatDuration,
  inventoryTotal,
  levelProgress,
  titleForLevel,
} from './game/rewards';
import { STORAGE_KEY, Store, getStorage } from './game/store';
import type { Inventory, ResourceId, Scroll } from './types';
import { CauldronScene } from './ui/cauldronScene';
import { enableDragDrop } from './ui/dragdrop';
import { floatText, setFeedbackEnabled, sfx, sparkBurst, vibrate } from './ui/feedback';
import { confirmModal, esc, showModal, toast } from './ui/modal';
import { spriteImg } from './ui/sprites';

type TabId = 'atelier' | 'mediter' | 'quetes' | 'grimoire';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'atelier', label: 'Atelier', icon: '⚗️' },
  { id: 'mediter', label: 'Méditer', icon: '🧘' },
  { id: 'quetes', label: 'Quêtes', icon: '📜' },
  { id: 'grimoire', label: 'Grimoire', icon: '📖' },
];

const DURATIONS = [10, 20, 30, 60];
const BREW_MS = 1500;
const MED_SEGMENTS = 20;
const MED_TIPS = [
  'Respire lentement. Laisse ton regard se poser sur un point de la pièce.',
  'Ton téléphone peut rester là : le temps travaille pour toi.',
  'Relâche tes épaules. Desserre la mâchoire.',
  'Observe les sons autour de toi, sans les juger.',
];

const MIX_ICON = '🔮';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const dateFmt = new Intl.DateTimeFormat('fr', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function gainsHtml(inv: Partial<Inventory>): string {
  const items = RESOURCES.filter((r) => (inv[r.id] ?? 0) > 0).map(
    (r) =>
      `<span class="gain-item">${spriteImg(r.id, 'xs')}×${inv[r.id]} <span class="muted">${esc(r.short)}</span></span>`,
  );
  return items.length > 0 ? `<div class="gains">${items.join('')}</div>` : '';
}

function questBoxHtml(q: {
  title: string;
  description: string;
  rarity: Scroll['rarity'];
  category: Scroll['category'];
  xp: number;
}): string {
  const cat = CATEGORY_LABEL[q.category];
  return `<div class="quest-box rarity-${q.rarity}">
    <span class="origin">${cat.emoji} ${esc(cat.label)} · ${esc(RARITY_LABEL[q.rarity])} · +${q.xp} XP</span>
    <h3 class="result-title">${esc(q.title)}</h3>
    <p>${esc(q.description)}</p>
  </div>`;
}

export class App {
  private readonly store = new Store(getStorage());
  private scene: CauldronScene | null = null;
  private slots: ResourceId[] = [];
  private brewing = false;
  private tab: TabId = 'atelier';
  private selectedDuration = 10;
  private tickTimer = 0;
  private installEvent: BeforeInstallPromptEvent | null = null;

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    setFeedbackEnabled(this.store.get().settings.feedback);
    this.buildShell();
    this.bindEvents();
    this.store.subscribe(() => this.render());
    this.render();
    this.handleSettle();
    this.updateVisibilityState();
    if (!this.store.get().settings.introSeen) void this.showIntro();
  }

  // ---- Squelette ---------------------------------------------------------------------------

  private q<T extends HTMLElement>(selector: string): T {
    const el = this.root.querySelector<T>(selector);
    if (!el) throw new Error(`Élément introuvable : ${selector}`);
    return el;
  }

  private buildShell(): void {
    this.root.innerHTML = `
      <div class="app">
        <header class="box hud">
          <h1 class="logo">L’ALCHIMISTE DU TEMPS</h1>
          <div class="level-row">
            <span class="lvl" id="lvl"></span>
            <span class="xp-text" id="xp-text"></span>
          </div>
          <div class="xpbar" id="xpbar" role="progressbar" aria-label="Expérience" aria-valuemin="0" aria-valuemax="100"><div id="xpfill"></div></div>
        </header>

        <main>
          <section class="screen" id="screen-atelier" role="tabpanel" aria-label="Atelier">
            <div class="box inventory" id="inventory" aria-label="Inventaire"></div>
            <div class="box cauldron-zone" id="zone">
              <canvas id="cauldron" role="img" aria-label="Chaudron magique"></canvas>
              <span class="zone-label">Touche ou glisse tes ingrédients</span>
            </div>
            <div class="slots" id="slots"></div>
            <p class="hint" id="hint" aria-live="polite"></p>
            <div class="row">
              <button class="btn primary big" type="button" data-action="brew" id="brew">⚗️ Mélanger</button>
              <button class="btn big" type="button" data-action="clear" id="clear">Vider</button>
            </div>
          </section>

          <section class="screen" id="screen-mediter" role="tabpanel" aria-label="Méditation" hidden>
            <div id="med-host"></div>
            <div class="box panel">
              <h2 class="section-title">Récolte automatique</h2>
              <p>Dès que tu quittes l’app (verrouillage, autre application), le temps hors-écran est compté à ton retour :</p>
              <ul class="journal" aria-label="Paliers de récolte">
                ${RESOURCES.map(
                  (r) =>
                    `<li class="reward-item">${spriteImg(r.id, 'xs')} ${r.everyMin} min = ${esc(r.name)}</li>`,
                ).join('')}
              </ul>
              <p class="muted">Les paliers se cumulent : 60 min hors-écran = 6 💧 + 3 ✨ + 2 🌿 + 1 💎. Une absence compte au maximum ${MAX_AWAY_MIN / 60} h.</p>
            </div>
          </section>

          <section class="screen" id="screen-quetes" role="tabpanel" aria-label="Quêtes" hidden>
            <h2 class="section-title">Parchemins de Quêtes</h2>
            <ul class="list" id="scroll-list"></ul>
          </section>

          <section class="screen" id="screen-grimoire" role="tabpanel" aria-label="Grimoire" hidden>
            <h2 class="section-title">Grimoire de l’Alchimiste</h2>
            <div class="stats" id="stats"></div>
            <h2 class="section-title">Recettes</h2>
            <ul class="recipes" id="recipes"></ul>
            <h2 class="section-title">Exploits accomplis</h2>
            <ul class="journal" id="journal"></ul>
            <h2 class="section-title">Réglages</h2>
            <div class="box panel" id="settings"></div>
          </section>
        </main>
      </div>

      <nav class="tabs" aria-label="Navigation">
        <div class="tabs-inner" role="tablist">
          ${TABS.map(
            (t) =>
              `<button class="tab" type="button" role="tab" data-tab="${t.id}" aria-controls="screen-${t.id}" aria-selected="${t.id === this.tab}">
                <span class="ico" aria-hidden="true">${t.icon}</span><span>${t.label}</span>
                ${t.id === 'quetes' ? '<span class="badge" id="badge" hidden></span>' : ''}
              </button>`,
          ).join('')}
        </div>
      </nav>`;

    try {
      this.scene = new CauldronScene(this.q<HTMLCanvasElement>('#cauldron'));
    } catch {
      this.scene = null;
    }
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (e) => this.onClick(e));

    enableDragDrop({
      source: this.q('#inventory'),
      itemSelector: '.chip',
      target: this.q('#zone'),
      ghostHtml: (res) => spriteImg(res as ResourceId),
      onDrop: (res) => this.addIngredient(res as ResourceId),
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.onHidden();
      else this.onVisible();
    });
    window.addEventListener('pagehide', () => this.onHidden());
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.onVisible();
    });
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) this.store.reload();
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvent = e as BeforeInstallPromptEvent;
      this.renderSettings();
    });
    window.addEventListener('appinstalled', () => {
      this.installEvent = null;
      this.renderSettings();
      toast('Application installée ✨');
    });
  }

  // ---- Présence (Page Visibility API) ----------------------------------------------------------

  private onHidden(): void {
    this.store.set(markHidden(this.store.get(), Date.now()), false);
    this.updateVisibilityState();
  }

  private onVisible(): void {
    this.handleSettle();
    this.updateVisibilityState();
  }

  private updateVisibilityState(): void {
    const visible = !document.hidden;
    this.scene?.setActive(visible && this.tab === 'atelier');
    window.clearInterval(this.tickTimer);
    if (visible) this.tickTimer = window.setInterval(() => this.tick(), 1000);
  }

  /** Convertit le temps hors-écran / la méditation terminée en ressources et prévient le joueur. */
  private handleSettle(): void {
    const now = Date.now();
    const result = settle(this.store.get(), now);
    this.store.set(result.state);

    if (result.meditation) {
      const { durationMin, awarded } = result.meditation;
      sfx('harvest');
      vibrate([60, 40, 60]);
      void showModal({
        title: 'Méditation terminée',
        icon: '🧘',
        tone: 'rare',
        body: `<p class="center">Bravo, tu as posé ton téléphone pendant <strong>${formatDuration(durationMin)}</strong>.</p>
          ${gainsHtml(awarded)}
          <p class="muted center">Bonus de concentration inclus : +${MEDITATION_BONUS.water ?? 0} 💧</p>`,
        actions: [
          { label: 'Fermer', value: 'close', kind: 'ghost' },
          { label: 'À l’atelier', value: 'atelier', kind: 'primary' },
        ],
      }).then((v) => this.afterHarvest(v, awarded));
    }

    const absence = result.absence;
    if (absence) {
      if (inventoryTotal(absence.awarded) > 0) {
        sfx('harvest');
        vibrate([40, 30, 40]);
        void showModal({
          title: 'Bon retour, Alchimiste !',
          icon: '⏳',
          tone: 'rare',
          body: `<p class="center">Tu es resté <strong>${formatDuration(absence.minutes)}</strong> loin de l’écran.</p>
            ${gainsHtml(absence.awarded)}
            ${
              absence.capped
                ? `<p class="muted center">Seules les ${MAX_AWAY_MIN / 60} premières heures d’une absence comptent.</p>`
                : ''
            }`,
          actions: [
            { label: 'Fermer', value: 'close', kind: 'ghost' },
            { label: 'À l’atelier', value: 'atelier', kind: 'primary' },
          ],
        }).then((v) => this.afterHarvest(v, absence.awarded));
      } else if (absence.minutes >= 3) {
        toast(`Retour après ${formatDuration(absence.minutes)}. À 10 min hors-écran, tu récoltes une 💧.`, {
          duration: 4500,
        });
      }
    }
  }

  private afterHarvest(value: string | undefined, awarded: Inventory): void {
    if (value === 'atelier') this.setTab('atelier');
    if (this.tab !== 'atelier') return;
    for (const r of RESOURCES) {
      if (awarded[r.id] <= 0) continue;
      const chip = this.root.querySelector<HTMLElement>(`.chip[data-res="${r.id}"]`);
      if (!chip) continue;
      chip.classList.remove('gain');
      void chip.offsetWidth;
      chip.classList.add('gain');
      sparkBurst(chip, [r.color, '#ffffff']);
    }
  }

  private tick(): void {
    const med = this.store.get().meditation;
    if (!med) return;
    if (Date.now() >= meditationEndsAt(med)) {
      this.handleSettle();
      return;
    }
    this.updateMeditationClock();
  }

  // ---- Navigation -------------------------------------------------------------------------------

  private setTab(tab: TabId): void {
    this.tab = tab;
    for (const t of TABS) {
      this.q(`#screen-${t.id}`).hidden = t.id !== tab;
      this.q(`.tab[data-tab="${t.id}"]`).setAttribute('aria-selected', String(t.id === tab));
    }
    this.scene?.setActive(!document.hidden && tab === 'atelier');
    this.render();
    window.scrollTo({ top: 0 });
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const tab = target.closest<HTMLElement>('[data-tab]');
    if (tab?.dataset.tab) {
      this.setTab(tab.dataset.tab as TabId);
      return;
    }

    const chip = target.closest<HTMLButtonElement>('.chip');
    if (chip?.dataset.res) {
      if (!chip.disabled) this.addIngredient(chip.dataset.res as ResourceId);
      return;
    }

    const slot = target.closest<HTMLElement>('[data-slot]');
    if (slot?.dataset.slot !== undefined) {
      this.removeSlot(Number(slot.dataset.slot));
      return;
    }

    const dur = target.closest<HTMLElement>('[data-dur]');
    if (dur?.dataset.dur) {
      this.selectedDuration = Number(dur.dataset.dur);
      this.renderMeditation();
      return;
    }

    const done = target.closest<HTMLElement>('[data-complete]');
    if (done?.dataset.complete) {
      this.completeQuest(done.dataset.complete, done);
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    switch (action) {
      case 'brew':
        this.brew();
        break;
      case 'clear':
        this.clearSlots();
        break;
      case 'med-start':
        this.store.update((s) => startMeditation(s, this.selectedDuration, Date.now()));
        sfx('scroll');
        break;
      case 'med-cancel':
        void this.cancelMeditationFlow();
        break;
      case 'goto-atelier':
        this.setTab('atelier');
        break;
      case 'install':
        void this.install();
        break;
      case 'toggle-feedback':
        this.toggleFeedback();
        break;
      case 'reset':
        void this.resetFlow();
        break;
      default:
        break;
    }
  }

  // ---- Chaudron ---------------------------------------------------------------------------------

  private available(id: ResourceId): number {
    return this.store.get().inventory[id] - this.slots.filter((s) => s === id).length;
  }

  private addIngredient(id: ResourceId): void {
    if (this.brewing) return;
    if (this.slots.length >= MAX_INGREDIENTS) {
      toast(`Le chaudron est plein (${MAX_INGREDIENTS} ingrédients maximum).`);
      return;
    }
    if (this.available(id) <= 0) {
      toast(`Plus de ${RESOURCE_BY_ID[id].short} disponible.`);
      return;
    }
    this.slots.push(id);
    this.scene?.addIngredient(id);
    this.scene?.setMix(this.slots);
    sfx('add');
    this.renderAtelier();
  }

  private removeSlot(index: number): void {
    if (this.brewing || index >= this.slots.length) return;
    this.slots.splice(index, 1);
    this.scene?.setMix(this.slots);
    sfx('remove');
    this.renderAtelier();
  }

  private clearSlots(): void {
    if (this.brewing || this.slots.length === 0) return;
    this.slots = [];
    this.scene?.setMix([]);
    sfx('remove');
    this.renderAtelier();
  }

  private brew(): void {
    if (this.brewing) return;
    const ingredients = [...this.slots];
    const state = this.store.get();
    if (!canCraft(state.inventory, ingredients)) return;

    const outcome = resolveCraft(ingredients, state);
    const { state: next, scroll } = applyCraft(state, ingredients, outcome, Date.now());

    // Les ingrédients sont consommés et le parchemin enregistré tout de suite : rien n'est perdu
    // si l'application est fermée pendant l'animation.
    this.brewing = true;
    this.slots = [];
    this.store.set(next);
    this.scene?.boil(BREW_MS + 200);
    sfx('brew');
    vibrate(80);
    this.setHint('Le chaudron bouillonne…');

    window.setTimeout(() => {
      this.brewing = false;
      this.scene?.setMix([]);
      this.renderAtelier();
      void this.revealOutcome(outcome, scroll);
    }, BREW_MS);
  }

  private async revealOutcome(outcome: CraftOutcome, scroll: Scroll): Promise<void> {
    const zone = this.q('#zone');
    if (outcome.kind === 'explosion') {
      this.scene?.explode();
      sfx('boom');
      vibrate([120, 60, 120]);
      await this.showExplosion(scroll);
      return;
    }

    this.scene?.sparkle();
    sparkBurst(zone);
    sfx('scroll');
    vibrate(40);

    let title: string;
    let icon: string;
    let intro: string;
    let tone: 'normal' | 'rare' | 'epic' = 'normal';
    if (outcome.kind === 'recipe') {
      title = outcome.firstDiscovery ? 'Nouvelle recette découverte !' : 'Potion réussie !';
      icon = outcome.recipe.icon;
      intro = `<p><strong>${esc(outcome.recipe.name)}</strong> — <span class="muted">${esc(outcome.recipe.flavor)}</span></p>`;
      tone = outcome.recipe.rarity === 'rare' ? 'rare' : 'normal';
    } else {
      title = 'Mélange chaotique… Épique !';
      icon = '🌟';
      intro = '<p class="muted">Le chaudron a craché un parchemin d’une rare puissance.</p>';
      tone = 'epic';
    }

    const choice = await showModal({
      title,
      icon,
      tone,
      body: `${intro}${questBoxHtml(scroll)}<p class="muted">Ton parchemin t’attend dans l’onglet Quêtes.</p>`,
      actions: [
        { label: 'Plus tard', value: 'later', kind: 'ghost' },
        { label: 'Voir le parchemin', value: 'goto', kind: 'primary' },
      ],
    });
    if (choice === 'goto') this.setTab('quetes');
  }

  private async showExplosion(scroll: Scroll): Promise<void> {
    const choice = await showModal({
      title: 'Explosion du Chaudron !',
      icon: '💥',
      tone: 'boom',
      body: `<p>Trop de chaos ! Le chaudron te lance un <strong>micro-défi d’une minute</strong> :</p>
        ${questBoxHtml(scroll)}
        <div class="xpbar" aria-hidden="true"><div id="boom-fill" style="width:0%"></div></div>
        <p class="center" id="boom-time" role="timer">${clock(MICRO_CHALLENGE_SECONDS * 1000)}</p>`,
      actions: [
        { label: 'Plus tard', value: 'later', kind: 'ghost' },
        { label: 'Accomplir la Quête', value: 'done', kind: 'primary' },
      ],
      onMount: (root) => {
        const started = Date.now();
        const fill = root.querySelector<HTMLElement>('#boom-fill');
        const time = root.querySelector<HTMLElement>('#boom-time');
        const timer = window.setInterval(() => {
          const left = Math.max(0, MICRO_CHALLENGE_SECONDS * 1000 - (Date.now() - started));
          if (fill) fill.style.width = `${100 - (left / (MICRO_CHALLENGE_SECONDS * 1000)) * 100}%`;
          if (time) time.textContent = left > 0 ? clock(left) : 'Temps écoulé !';
        }, 250);
        return () => window.clearInterval(timer);
      },
    });
    if (choice === 'done') this.completeQuest(scroll.id);
    else toast('Le micro-défi t’attend dans tes Quêtes.');
  }

  // ---- Quêtes -------------------------------------------------------------------------------------

  private completeQuest(scrollId: string, source?: HTMLElement): void {
    const scroll = this.store.get().scrolls.find((s) => s.id === scrollId);
    if (!scroll) return;

    const card = source?.closest<HTMLElement>('.scroll-card');
    if (source) {
      sparkBurst(source, ['#ffd86b', '#8dff9a', '#ffffff']);
      floatText(source, `+${scroll.xp} XP`);
    }
    card?.classList.add('completing');
    sfx('complete');
    vibrate(30);

    window.setTimeout(
      () => {
        const done = completeScroll(this.store.get(), scrollId, Date.now());
        if (!done) return;
        this.store.set(done.state);
        toast(`Quête accomplie : ${scroll.title} (+${scroll.xp} XP)`);
        if (done.levelAfter > done.levelBefore) {
          sfx('levelup');
          vibrate([80, 40, 80, 40, 160]);
          void showModal({
            title: `Niveau ${done.levelAfter} !`,
            icon: '🏆',
            tone: 'epic',
            body: `<p class="center">Tu deviens <strong>${esc(titleForLevel(done.levelAfter))}</strong>.</p>
              <p class="muted center">Chaque quête vécue pour de vrai te rapproche du Gardien du Temps.</p>`,
            actions: [{ label: 'Continuer', value: 'ok', kind: 'primary' }],
          });
        }
      },
      card ? 340 : 0,
    );
  }

  // ---- Méditation -------------------------------------------------------------------------------

  private async cancelMeditationFlow(): Promise<void> {
    const ok = await confirmModal(
      'Abandonner la méditation ?',
      '<p>Tu ne recevras aucune ressource pour cette séance.</p>',
      'Abandonner',
      true,
    );
    if (ok) this.store.update((s) => cancelMeditation(s));
  }

  private updateMeditationClock(): void {
    const med = this.store.get().meditation;
    const time = this.root.querySelector<HTMLElement>('#med-time');
    if (!med || !time) return;
    const total = med.durationMin * 60_000;
    const elapsed = Math.min(total, Math.max(0, Date.now() - med.startedAt));
    time.textContent = clock(total - elapsed);
    const lit = Math.floor((elapsed / total) * MED_SEGMENTS);
    this.root.querySelectorAll<HTMLElement>('#segbar .seg').forEach((seg, i) => {
      seg.classList.toggle('on', i < lit);
    });
    const tip = this.root.querySelector<HTMLElement>('#med-tip');
    if (tip) tip.textContent = MED_TIPS[Math.floor(elapsed / 20_000) % MED_TIPS.length] ?? '';
  }

  // ---- Réglages ---------------------------------------------------------------------------------

  private toggleFeedback(): void {
    const s = this.store.get();
    const feedback = !s.settings.feedback;
    setFeedbackEnabled(feedback);
    this.store.set({ ...s, settings: { ...s.settings, feedback } });
    if (feedback) sfx('add');
  }

  private async install(): Promise<void> {
    const ev = this.installEvent;
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice;
    this.installEvent = null;
    this.renderSettings();
  }

  private async resetFlow(): Promise<void> {
    const ok = await confirmModal(
      'Tout effacer ?',
      '<p>Ressources, quêtes, Grimoire et niveau seront définitivement supprimés de cet appareil.</p>',
      'Tout effacer',
      true,
    );
    if (!ok) return;
    this.slots = [];
    this.store.reset();
    this.scene?.setMix([]);
    toast('Nouvelle aventure ! Le Grimoire est vierge.');
  }

  private async showIntro(): Promise<void> {
    await showModal({
      title: 'Bienvenue, Alchimiste',
      icon: '⚗️',
      dismissible: false,
      body: `<p>Chaque minute loin de ton écran devient magie :</p>
        <ul>
          <li><strong>Pose ton téléphone</strong> ou lance une méditation : à ton retour, tu récoltes 💧 ✨ 🌿 💎.</li>
          <li><strong>Mélange 2 ou 3 ingrédients</strong> dans le chaudron pour débloquer des parchemins de quêtes à vivre pour de vrai.</li>
          <li><strong>Accomplis la quête</strong>, gagne de l’XP et remplis ton Grimoire.</li>
        </ul>
        <p class="muted">Astuce : le son et les vibrations s’activent dans le Grimoire.</p>`,
      actions: [{ label: 'Commencer', value: 'ok', kind: 'primary' }],
    });
    const s = this.store.get();
    this.store.set({ ...s, settings: { ...s.settings, introSeen: true } });
  }

  // ---- Rendu -------------------------------------------------------------------------------------

  private render(): void {
    this.renderHud();
    this.renderAtelier();
    this.renderMeditation();
    this.renderScrolls();
    this.renderGrimoire();
  }

  private setHint(html: string): void {
    this.q('#hint').innerHTML = html;
  }

  private renderHud(): void {
    const s = this.store.get();
    const { level, into, span } = levelProgress(s.xp);
    this.q('#lvl').innerHTML = `NIV. ${level} <span class="lvl-title">· ${esc(titleForLevel(level))}</span>`;
    this.q('#xp-text').textContent = `${into} / ${span} XP`;
    const pct = Math.round((into / span) * 100);
    this.q('#xpfill').style.width = `${pct}%`;
    this.q('#xpbar').setAttribute('aria-valuenow', String(pct));

    const badge = this.q('#badge');
    badge.hidden = s.scrolls.length === 0;
    badge.textContent = String(s.scrolls.length);
  }

  private renderAtelier(): void {
    const s = this.store.get();
    const full = this.slots.length >= MAX_INGREDIENTS;

    this.q('#inventory').innerHTML = RESOURCES.map((r) => {
      const left = s.inventory[r.id] - this.slots.filter((x) => x === r.id).length;
      const disabled = this.brewing || full || left <= 0;
      return `<button class="chip" type="button" data-res="${r.id}" ${disabled ? 'disabled' : ''}
          aria-label="Ajouter ${esc(r.name)} au chaudron (${left} disponible${left > 1 ? 's' : ''})">
          ${spriteImg(r.id, 'lg')}
          <span class="count">${left}</span>
          <span class="name">${esc(r.short)}</span>
          <span class="rate">${r.everyMin} min</span>
        </button>`;
    }).join('');

    this.q('#slots').innerHTML = Array.from({ length: MAX_INGREDIENTS }, (_, i) => {
      const id = this.slots[i];
      if (id) {
        return `<button class="slot filled" type="button" data-slot="${i}" aria-label="Retirer ${esc(RESOURCE_BY_ID[id].name)}">${spriteImg(id)}</button>`;
      }
      return `<button class="slot" type="button" disabled aria-label="Emplacement vide${i >= MIN_INGREDIENTS ? ' (facultatif)' : ''}">${i >= MIN_INGREDIENTS ? '?' : '+'}</button>`;
    }).join('');

    this.q<HTMLButtonElement>('#brew').disabled = this.brewing || this.slots.length < MIN_INGREDIENTS;
    this.q<HTMLButtonElement>('#clear').disabled = this.brewing || this.slots.length === 0;

    if (!this.brewing) {
      const known = this.slots.length >= MIN_INGREDIENTS ? findRecipe(this.slots) : undefined;
      if (this.slots.length === 0) {
        if (inventoryTotal(s.inventory) === 0) {
          this.setHint('Ton inventaire est vide : pose ton téléphone pour récolter des ressources.');
        } else {
          this.setHint(`Ajoute ${MIN_INGREDIENTS} à ${MAX_INGREDIENTS} ingrédients dans le chaudron.`);
        }
      } else if (this.slots.length < MIN_INGREDIENTS) {
        this.setHint('Ajoute au moins un ingrédient de plus.');
      } else if (known && s.discoveredRecipes.includes(known.id)) {
        this.setHint(`Recette connue : <strong>${esc(known.name)}</strong> ${known.icon}`);
      } else {
        this.setHint(
          `${MIX_ICON} Mélange inconnu : recette secrète ou chaos ? <strong>${Math.round(CHAOS_EPIC_CHANCE * 100)} %</strong> épique, ${Math.round((1 - CHAOS_EPIC_CHANCE) * 100)} % explosion si c’est le chaos.`,
        );
      }
    }
  }

  private renderMeditation(): void {
    const s = this.store.get();
    const med = s.meditation;
    const host = this.q('#med-host');

    if (!med) {
      const preview = addInventory(awardForMinutes(this.selectedDuration), MEDITATION_BONUS);
      host.innerHTML = `<div class="box panel center">
          <h2 class="section-title">Mode Méditation</h2>
          <p>Choisis une durée, pose ton téléphone et ne le touche plus. À la fin, tu récoltes les ressources <strong>+ un bonus de concentration</strong>.</p>
          <div class="durations" role="radiogroup" aria-label="Durée">
            ${DURATIONS.map(
              (d) =>
                `<button class="dur" type="button" role="radio" data-dur="${d}" aria-checked="${d === this.selectedDuration}">${d} min</button>`,
            ).join('')}
          </div>
          <div class="reward-preview" aria-label="Récompense">${RESOURCES.filter((r) => preview[r.id] > 0)
            .map((r) => `<span class="reward-item">${spriteImg(r.id, 'xs')}×${preview[r.id]}</span>`)
            .join('')}</div>
          <button class="btn primary big" type="button" data-action="med-start">🧘 Poser le téléphone</button>
        </div>`;
      return;
    }

    const preview = addInventory(awardForMinutes(med.durationMin), MEDITATION_BONUS);
    host.innerHTML = `<div class="box panel">
        <h2 class="section-title center">Méditation en cours</h2>
        <div class="med-time" id="med-time" role="timer">--:--</div>
        <div class="segbar" id="segbar" aria-hidden="true">${'<span class="seg"></span>'.repeat(MED_SEGMENTS)}</div>
        <p class="med-tip" id="med-tip"></p>
        <div class="reward-preview" aria-label="Récompense à la fin">${RESOURCES.filter((r) => preview[r.id] > 0)
          .map((r) => `<span class="reward-item">${spriteImg(r.id, 'xs')}×${preview[r.id]}</span>`)
          .join('')}</div>
        <div class="row"><button class="btn danger" type="button" data-action="med-cancel">Abandonner</button></div>
      </div>`;
    this.updateMeditationClock();
  }

  private renderScrolls(): void {
    const list = this.q('#scroll-list');
    const scrolls = [...this.store.get().scrolls].sort((a, b) => b.createdAt - a.createdAt);
    if (scrolls.length === 0) {
      list.innerHTML = `<li class="box empty">
          ${spriteImg('scroll', 'lg')}
          <p>Aucun parchemin pour l’instant. Mélange des ingrédients dans le chaudron pour en débloquer.</p>
          <button class="btn primary" type="button" data-action="goto-atelier">Aller à l’atelier</button>
        </li>`;
      return;
    }
    list.innerHTML = scrolls
      .map((sc) => {
        const cat = CATEGORY_LABEL[sc.category];
        return `<li class="box scroll-card rarity-${sc.rarity}" data-id="${esc(sc.id)}">
          <div class="card-head">
            <span class="rarity">${esc(RARITY_LABEL[sc.rarity]).toUpperCase()}</span>
            <span class="origin">${cat.emoji} ${esc(cat.label)} · ${esc(sc.origin)}</span>
          </div>
          <h3>${esc(sc.title)}</h3>
          <p>${esc(sc.description)}</p>
          <div class="card-foot">
            <span class="xp">+${sc.xp} XP</span>
            <button class="btn primary" type="button" data-complete="${esc(sc.id)}">Accomplir la Quête</button>
          </div>
        </li>`;
      })
      .join('');
  }

  private renderGrimoire(): void {
    const s = this.store.get();

    this.q('#stats').innerHTML = [
      [String(s.xp), 'XP total'],
      [String(s.grimoire.length), 'Quêtes accomplies'],
      [formatDuration(s.totalAwayMin), 'Temps hors-écran'],
      [`${s.discoveredRecipes.length}/${RECIPES.length}`, 'Recettes trouvées'],
    ]
      .map(([v, label]) => `<div class="box stat"><b>${esc(v ?? '')}</b><span>${esc(label ?? '')}</span></div>`)
      .join('');

    this.q('#recipes').innerHTML = RECIPES.map((r) => {
      const cat = CATEGORY_LABEL[r.category];
      if (s.discoveredRecipes.includes(r.id)) {
        const mix = r.ingredients.map((i) => spriteImg(i, 'xs')).join('');
        return `<li class="recipe"><span class="big-ico">${r.icon}</span><span class="t">${esc(r.name)}</span>
          <span class="d"><span class="mix">${mix}</span> · ${cat.emoji} ${esc(cat.label)}</span></li>`;
      }
      return `<li class="recipe locked"><span class="big-ico">❓</span><span class="t">Recette secrète</span>
        <span class="d">${r.ingredients.length} ingrédients · ${cat.emoji} ${esc(cat.label)}</span></li>`;
    }).join('');

    const shown = s.grimoire.slice(0, 50);
    this.q('#journal').innerHTML =
      shown.length === 0
        ? '<li class="box empty"><p>Ton Grimoire est vide. Accomplis ta première quête pour y graver ton nom.</p></li>'
        : shown
            .map((g) => {
              const cat = CATEGORY_LABEL[g.category];
              return `<li class="entry rarity-${g.rarity}">
                <span class="t">${esc(g.title)}</span><span class="xp">+${g.xp} XP</span>
                <span class="d">${cat.emoji} ${esc(cat.label)} · ${esc(g.origin)} · ${esc(dateFmt.format(g.completedAt))}</span>
              </li>`;
            })
            .join('') +
          (s.grimoire.length > shown.length
            ? `<li class="muted center">… et ${s.grimoire.length - shown.length} exploits plus anciens.</li>`
            : '');

    this.renderSettings();
  }

  private renderSettings(): void {
    const s = this.store.get();
    let install = '';
    if (!isStandalone()) {
      if (this.installEvent) {
        install = `<div class="setting"><span>Installer sur l’écran d’accueil</span>
          <button class="btn primary small" type="button" data-action="install">Installer</button></div>`;
      } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        install = `<p class="muted">Pour installer l’application sur iPhone / iPad : bouton Partager, puis « Sur l’écran d’accueil ».</p>`;
      } else {
        install = `<p class="muted">Pour installer l’application : menu du navigateur, puis « Installer l’application ».</p>`;
      }
    }
    this.q('#settings').innerHTML = `
      <div class="setting"><span>Sons et vibrations</span>
        <button class="toggle" type="button" role="switch" aria-checked="${s.settings.feedback}" aria-label="Sons et vibrations" data-action="toggle-feedback"></button></div>
      ${install}
      <div class="setting"><span class="muted">Données stockées uniquement sur cet appareil.</span>
        <button class="btn danger small" type="button" data-action="reset">Réinitialiser</button></div>`;
  }
}

/**
 * Glisser-déposer tactile + souris (Pointer Events).
 * Un simple appui sur une puce déclenche toujours le `click` (clavier / tap) ;
 * un glissement jusqu'au chaudron appelle `onDrop` et supprime le click qui suivrait.
 */
export interface DragOptions {
  /** Conteneur des éléments déplaçables (délégation d'événements). */
  source: HTMLElement;
  /** Sélecteur des éléments déplaçables ; ils portent `data-res`. */
  itemSelector: string;
  /** Zone de dépôt. */
  target: HTMLElement;
  ghostHtml: (resource: string) => string;
  onDrop: (resource: string) => void;
}

const THRESHOLD = 8;

export function enableDragDrop(opts: DragOptions): void {
  let pending: { el: HTMLElement; res: string; x: number; y: number; id: number } | null = null;
  let ghost: HTMLElement | null = null;
  let suppressClick = false;

  const inside = (x: number, y: number): boolean => {
    const r = opts.target.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const stop = (): void => {
    ghost?.remove();
    ghost = null;
    opts.target.classList.remove('drop-hover');
    pending = null;
  };

  opts.source.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(opts.itemSelector);
    if (!el || el.hasAttribute('disabled') || !el.dataset.res || e.button > 0) return;
    pending = { el, res: el.dataset.res, x: e.clientX, y: e.clientY, id: e.pointerId };
  });

  window.addEventListener('pointermove', (e) => {
    if (!pending || e.pointerId !== pending.id) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < THRESHOLD) return;
      ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      ghost.innerHTML = opts.ghostHtml(pending.res);
      document.body.append(ghost);
    }
    ghost.style.transform = `translate(${e.clientX - 24}px, ${e.clientY - 24}px)`;
    opts.target.classList.toggle('drop-hover', inside(e.clientX, e.clientY));
  });

  const finish = (e: PointerEvent, cancelled: boolean): void => {
    if (!pending || e.pointerId !== pending.id) return;
    const dragged = ghost !== null;
    const res = pending.res;
    const drop = dragged && !cancelled && inside(e.clientX, e.clientY);
    stop();
    if (dragged) {
      suppressClick = true;
      window.setTimeout(() => (suppressClick = false), 60);
    }
    if (drop) opts.onDrop(res);
  };

  window.addEventListener('pointerup', (e) => finish(e, false));
  window.addEventListener('pointercancel', (e) => finish(e, true));

  // Le click est capté en phase de capture pour pouvoir être annulé après un glissement.
  opts.source.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );
}

export interface ModalAction {
  label: string;
  value: string;
  kind?: 'primary' | 'ghost' | 'danger';
}

export interface ModalOptions {
  title: string;
  icon?: string;
  /** HTML déjà échappé par l'appelant. */
  body: string;
  actions?: ModalAction[];
  tone?: 'normal' | 'rare' | 'epic' | 'boom';
  /** Peut-on fermer avec Échap / un clic à l'extérieur ? (défaut : oui) */
  dismissible?: boolean;
  /** Appelé après l'insertion dans le DOM. Peut retourner une fonction de nettoyage. */
  onMount?: (root: HTMLElement, close: (value?: string) => void) => void | (() => void);
}

export function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

let chain: Promise<unknown> = Promise.resolve();
let counter = 0;

/** Affiche une fenêtre ; les fenêtres s'enchaînent une par une (file d'attente). */
export function showModal(options: ModalOptions): Promise<string | undefined> {
  const result = chain.then(() => open(options));
  chain = result.catch(() => undefined);
  return result;
}

function open(options: ModalOptions): Promise<string | undefined> {
  return new Promise((resolve) => {
    const id = `modal-${++counter}`;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dismissible = options.dismissible !== false;
    const actions = options.actions ?? [{ label: 'OK', value: 'ok', kind: 'primary' as const }];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal tone-${options.tone ?? 'normal'}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <h2 id="${id}-title" class="modal-title">${options.icon ? `<span class="modal-icon" aria-hidden="true">${options.icon}</span>` : ''}${esc(options.title)}</h2>
        <div class="modal-body">${options.body}</div>
        <div class="modal-actions">
          ${actions
            .map(
              (a) =>
                `<button type="button" class="btn ${a.kind ?? 'ghost'}" data-value="${esc(a.value)}">${esc(a.label)}</button>`,
            )
            .join('')}
        </div>
      </div>`;

    let cleanup: void | (() => void);
    let closed = false;
    const close = (value?: string): void => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      if (typeof cleanup === 'function') cleanup();
      overlay.classList.add('leaving');
      window.setTimeout(() => {
        overlay.remove();
        if (!document.querySelector('.modal-overlay')) document.body.classList.remove('modal-open');
        previousFocus?.focus?.();
        resolve(value);
      }, 140);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        close();
      }
      if (e.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')].filter(
          (el) => !el.hasAttribute('disabled'),
        );
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('button[data-value]');
      if (button && overlay.contains(button) && button.closest('.modal-actions')) {
        close(button.dataset.value);
      } else if (target === overlay && dismissible) {
        close();
      }
    });

    document.body.append(overlay);
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKey, true);
    cleanup = options.onMount?.(overlay.querySelector('.modal') as HTMLElement, close);
    (overlay.querySelector<HTMLElement>('.btn.primary') ?? overlay.querySelector<HTMLElement>('.btn'))?.focus();
  });
}

export async function confirmModal(
  title: string,
  body: string,
  confirmLabel = 'Confirmer',
  danger = false,
): Promise<boolean> {
  const value = await showModal({
    title,
    body,
    tone: 'normal',
    actions: [
      { label: 'Annuler', value: 'no', kind: 'ghost' },
      { label: confirmLabel, value: 'yes', kind: danger ? 'danger' : 'primary' },
    ],
  });
  return value === 'yes';
}

// ---- Toasts -------------------------------------------------------------------------------

export interface ToastOptions {
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export function toast(message: string, options: ToastOptions = {}): void {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  const remove = (): void => {
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), 200);
  };
  if (options.action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn small primary';
    b.textContent = options.action.label;
    b.addEventListener('click', () => {
      options.action?.onClick();
      remove();
    });
    el.append(b);
  }
  host.append(el);
  if (options.duration !== 0) window.setTimeout(remove, options.duration ?? 3600);
}

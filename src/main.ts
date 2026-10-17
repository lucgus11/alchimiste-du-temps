import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/vt323/latin-400.css';
import './styles.css';
import { App } from './app';
import { toast } from './ui/modal';

const root = document.getElementById('app');
if (!root) throw new Error('#app introuvable');
new App(root).start();

/** Service worker : uniquement en production (en dev, le cache gênerait le rechargement à chaud). */
function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        const offerUpdate = (worker: ServiceWorker): void => {
          toast('Une nouvelle version est disponible.', {
            duration: 0,
            action: { label: 'Mettre à jour', onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }) },
          });
        };
        // Une mise à jour est déjà en attente (page rouverte).
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });
        // Vérifie régulièrement si une nouvelle version existe (PWA ouverte longtemps).
        window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch((err: unknown) => console.warn('Service worker non enregistré', err));
  });
}

registerServiceWorker();

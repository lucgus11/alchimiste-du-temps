# ⚗️ L'Alchimiste du Temps

PWA pixel art (TypeScript + Vite) qui transforme le temps passé **hors de l'écran** en ressources d'alchimie, puis en **quêtes à vivre pour de vrai**.

## Comment ça marche

- **Récolte hors-écran** (Page Visibility API) : au retour dans l'app, chaque palier de temps donne 10 min = 💧 · 20 min = ✨ · 30 min = 🌿 · 60 min = 💎 (cumulables, plafonné à 3 h par absence).
- **Mode Méditation** : minuteur visuel (10/20/30/60 min), récolte + bonus de concentration.
- **Chaudron** : 2 à 3 ingrédients (toucher ou glisser-déposer). 14 recettes secrètes → parchemins thématiques (cuisine, création, balade, sport, bien-être). Mélange inconnu : 70 % quête **Épique**, 30 % **explosion** 💥 (micro-défi d'1 minute).
- **Grimoire** : « Accomplir la Quête » → XP, niveaux, historique.
- **Offline-first** : manifest + service worker (tout est précaché), données en `localStorage`.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests de la logique de jeu
npm run build      # typecheck + build + injection du précache dans dist/sw.js
npm run preview    # http://localhost:4173 — teste la PWA / le mode hors-ligne
```

> Le service worker n'est actif qu'en build de production (`npm run build && npm run preview`).

## Déploiement

Dépôt GitHub → import dans Vercel (preset Vite détecté, `vercel.json` fournit les en-têtes de cache : `sw.js` jamais mis en cache, `/assets/*` immuable).

## Structure

```
src/data/      ressources, recettes, quêtes
src/game/      logique pure et testée (récolte, craft, présence, stockage)
src/ui/        chaudron canvas, sprites, modales, glisser-déposer, sons
public/        manifest.json, sw.js, icônes (générées par tools/make-icons.py)
```

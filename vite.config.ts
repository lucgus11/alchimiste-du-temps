import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Liste récursivement tous les fichiers d'un dossier. */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/**
 * Après le build, injecte dans dist/sw.js :
 *  - la liste complète des fichiers à précacher (offline-first complet),
 *  - un identifiant de version dérivé du contenu (invalide l'ancien cache à chaque déploiement).
 */
function serviceWorkerPrecache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'alchimiste-sw-precache',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      const files = walk(outDir)
        .filter((f) => f !== swPath && !f.endsWith('.map'))
        .sort();

      const urls = files.map((f) => '/' + relative(outDir, f).split(sep).join('/'));
      urls.unshift('/');

      const hash = createHash('sha1');
      for (const f of files) {
        hash.update(f);
        hash.update(readFileSync(f));
      }
      const buildId = hash.digest('hex').slice(0, 10);

      const source = readFileSync(swPath, 'utf8');
      if (!source.includes("'__PRECACHE__'") || !source.includes('__BUILD_ID__')) {
        throw new Error('sw.js : marqueurs __PRECACHE__ / __BUILD_ID__ introuvables');
      }
      writeFileSync(
        swPath,
        source.replace("'__PRECACHE__'", JSON.stringify(urls)).replace('__BUILD_ID__', buildId),
      );
      console.log(`\n[sw] ${urls.length} fichiers précachés — version ${buildId}`);
    },
  };
}

export default defineConfig({
  plugins: [serviceWorkerPrecache()],
  server: { host: true },
  preview: { host: true },
  build: { target: 'es2022', sourcemap: false },
});

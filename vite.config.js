import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const musicDirectory = path.join(root, 'public', 'music');
const virtualId = 'virtual:music-library';
const resolvedId = '\0' + virtualId;

function musicLibrary() {
  return {
    name: 'local-music-library',
    resolveId(id) { if (id === virtualId) return resolvedId; },
    load(id) {
      if (id !== resolvedId) return;
      const tracks = readdirSync(musicDirectory, { withFileTypes: true })
        .filter(file => file.isFile() && /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(file => ({ name: file.name.replace(/\.[^.]+$/, ''), url: `/music/${encodeURIComponent(file.name)}` }));
      return `export default ${JSON.stringify(tracks)};`;
    },
    configureServer(server) {
      const refresh = (event, file) => {
        if (!['add', 'unlink'].includes(event) || path.resolve(path.dirname(file)) !== musicDirectory) return;
        const module = server.moduleGraph.getModuleById(resolvedId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('all', refresh);
      server.httpServer?.once('close', () => server.watcher.off('all', refresh));
    },
  };
}

export default defineConfig({
  plugins: [musicLibrary()],
  resolve: { alias: { '@': path.join(root, 'src') } },
  esbuild: { jsx: 'automatic' },
});

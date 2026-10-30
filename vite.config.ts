import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// SPA fallback plugin to ensure client-side routing and browser refresh (F5) never 404
function spaFallbackPlugin(): Plugin {
  return {
    name: 'speaksheet-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (
          req.method === 'GET' &&
          req.url &&
          !req.url.includes('.') &&
          !req.url.startsWith('/@') &&
          !req.url.startsWith('/node_modules')
        ) {
          req.url = '/index.html';
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.method === 'GET' && req.url && !req.url.includes('.')) {
          req.url = '/index.html';
        }
        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  appType: 'spa',
  server: {
    port: 3000,
    open: false,
    host: true
  },
  preview: {
    port: 3000,
    host: true
  }
});

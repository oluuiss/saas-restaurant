import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Caminhos sem extensão (/assinar, /painel, /<slug>, /<slug>/conta…) são do app React (app.html),
// como nos rewrites do vercel.json. "/" e os arquivos (.html, .css, .svg…) continuam estáticos.
function isAppRoute(url) {
  const path = url.split(/[?#]/)[0];
  if (path === '/' || path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/')) return false;
  return !/\.[a-z0-9]+$/i.test(path);
}

/** No dev, atende /api com o mesmo código das funções da Vercel e manda as rotas do app para app.html. */
function lumenuDev() {
  return {
    name: 'lumenu-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url.startsWith('/api/') || req.url === '/api') {
          try {
            const { handle } = await server.ssrLoadModule('/server/router.js');
            await handle(req, res);
          } catch (error) {
            next(error);
          }
          return;
        }
        if (isAppRoute(req.url)) req.url = '/app.html';
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza DATABASE_URL etc. (de .env.local) para a API no dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    appType: 'mpa',
    plugins: [react(), lumenuDev()],
    server: { port: 5173 },
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          privacidade: resolve(import.meta.dirname, 'privacidade.html'),
          termos: resolve(import.meta.dirname, 'termos.html'),
          app: resolve(import.meta.dirname, 'app.html'),
        },
      },
    },
  };
});

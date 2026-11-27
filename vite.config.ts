import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { routes } from './src/sections';

const compatibility = new Map([
  ['desk/index.html', '../team/'],
  ['legacy/index.html', '../sandbox/'],
  ['legacy/sandbox/index.html', '../../sandbox/'],
]);
function redirect(relative: string) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>GAAC 技术支持</title><meta http-equiv="refresh" content="0;url=${relative}"><a href="${relative}">继续</a><script>location.replace(${JSON.stringify(relative)} + location.hash)</script></html>`;
}

function staticRoutes(base: string): Plugin {
  return {
    name: 'gaac-static-routes',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith(base)) return next();
        const relative = decodeURIComponent(pathname.slice(base.length)).replace(/\/$/, '/index.html');
        if (relative === 'legacy' || compatibility.has(relative + '/index.html')) {
          response.writeHead(301, { Location: pathname + '/' });
          response.end();
          return;
        }
        const path = relative;
        const target = compatibility.get(path);
        if (!target) return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(redirect(target));
      });
    },
    writeBundle({ dir }) {
      if (!dir) return;
      const html = readFileSync(resolve(dir, 'index.html'), 'utf8');
      writeFileSync(resolve(dir, '404.html'), html);
      for (const { path } of routes) {
        const target = path.replace(/\/\*$/, '').slice(1);
        if (!target || target.includes(':') || target.includes('*')) continue;
        const file = resolve(dir, target, 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, html);
      }
      for (const [path, content] of compatibility) {
        const file = resolve(dir, path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, redirect(content));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = loadEnv(mode, process.cwd(), '').GAAC_BASE ?? '/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('GAAC_BASE must be / or a path such as /gaac-support/');
  return { base, plugins: [react(), staticRoutes(base)] };
});

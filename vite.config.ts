import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { routes } from './src/sections';

const sandboxPath = 'legacy/sandbox/index.html';
const handbookPath = 'legacy/agent-bench/deep-research/research-plan/rules.html';

function redirect(relative: string) {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>GAAC 技术支持</title><meta http-equiv="refresh" content="0;url=${relative}"><a href="${relative}">继续</a><script>location.replace(${JSON.stringify(relative)} + location.hash)</script></html>`;
}

function legacyFiles(root: string) {
  const documents = new Map<string, string>();
  const sandboxSource = resolve(root, sandboxPath);
  if (existsSync(sandboxSource)) {
    const html = readFileSync(sandboxSource, 'utf8')
      .replace(/href="(?=(?:infra|prep|agent-bench|blog|comic)\/)/g, 'href="../')
      .replace('href="support/index.html"', 'href="../../"');
    documents.set(sandboxPath, html);
    documents.set('legacy/index.html', redirect('sandbox/'));
  }
  if (existsSync(resolve(root, 'legacy/agent-bench/deep-research/notes/rules.html'))) {
    documents.set(handbookPath, redirect('../notes/rules.html'));
  }
  return documents;
}

function staticRoutes(base: string): Plugin {
  return {
    name: 'gaac-static-routes',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith(base)) return next();
        const relative = pathname.slice(base.length).replace(/\/$/, '/index.html');
        if (relative === 'legacy' || relative === 'legacy/sandbox') {
          response.writeHead(301, { Location: pathname + '/' });
          response.end();
          return;
        }
        const path = relative;
        if (![sandboxPath, handbookPath, 'legacy/index.html'].includes(path)) return next();
        const html = legacyFiles(server.config.publicDir).get(path);
        if (!html) return next();
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
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
      for (const [path, content] of legacyFiles(dir)) writeFileSync(resolve(dir, path), content);
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = loadEnv(mode, process.cwd(), '').GAAC_BASE ?? '/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('GAAC_BASE must be / or a path such as /gaac-support/');
  return { base, plugins: [react(), staticRoutes(base)] };
});

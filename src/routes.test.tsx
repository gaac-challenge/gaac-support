// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Article, Figure } from './components/Article';
import { routes } from './sections';

const readingPaths = { '/blog/:slug': ['install-agentx', 'mock-server', '393-traces'] };

const supportTitles: Record<string, string> = {
  '/': '五队共用一套 EdgePod', '/tasks': '两个阶段，正式分 100',
  '/model': 'DeepSeek V4.1 Flash 1017', '/search': 'GAAC Agentic Search',
  '/data': '数据集', '/tools': '工具应用', '/eval': '四项测评，进度不一',
  '/notices': '公告与答疑', '/status': '运行状态', '/desk': '本队任务台',
};

beforeAll(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
    configurable: true,
    value: function (this: SVGElement) { return (this.textContent?.length ?? 0) * 8; },
  });
  await import('./sections/support/SupportPage');
});
afterEach(cleanup);

function renderPath(path: string) {
  return render(<MemoryRouter initialEntries={['/gaac-support' + path]} basename="/gaac-support"><App /></MemoryRouter>);
}

describe('registered route smoke test', () => {
  const cases = routes.flatMap((route) => {
    const variants = readingPaths[route.path as keyof typeof readingPaths];
    return variants
      ? variants.map((slug) => ({ route, path: route.path.replace(/:(slug|volume)/, slug) }))
      : [{ route, path: route.path.replace(':slug', 'sample-article').replace('*', 'site/results') }];
  });
  it.each(cases)('renders $path', async ({ route, path }) => {
    renderPath(path);
    const main = within(screen.getByRole('main'));
    const heading = await main.findByRole('heading', { level: 1 }, { timeout: 3000 });
    expect(heading).toBeVisible();
    if (supportTitles[path]) expect(heading).toHaveTextContent(supportTitles[path]);
    if (route.legacy) {
      expect(heading).toHaveTextContent(route.label);
      expect(main.getByRole('link', { name: '打开原版页面' })).toHaveAttribute('href', expect.stringContaining(route.legacy));
    }
  });

  it('shows the shared missing page for unknown paths', async () => {
    renderPath('/missing');
    expect(await screen.findByRole('heading', { name: '页面未找到' })).toBeVisible();
  });

  it('keeps support navigation and fragments under the configured base', async () => {
    renderPath('/eval');
    const links = await within(screen.getByRole('main')).findAllByRole('link', { name: '看计分规则' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/gaac-support/tasks#score-title');
    expect(screen.getByRole('link', { name: '推演' })).toHaveAttribute('href', '/gaac-support/sandbox');
  });
});

it('renders a Chinese article outline, a table, code, footnotes and a figure', () => {
  const markdown = '## 评测规则\n\n> 提示\n\n| 项目 | 说明 |\n| --- | --- |\n| 评测 | 范例 |\n\n```js\nconsole.log(1);\n```\n\n引用[^source]。\n\n[^source]: 参考文档';
  render(<MemoryRouter><Article title="读本示例" markdown={markdown}>
    <Figure src="/example.png" alt="原图" caption="图注" />
  </Article></MemoryRouter>);
  expect(screen.getByRole('link', { name: '评测规则' })).toHaveAttribute('href', '#section-评测规则');
  expect(screen.getByRole('heading', { name: '评测规则' })).toHaveAttribute('id', 'section-评测规则');
  expect(screen.getByRole('table')).toBeVisible();
  expect(screen.getByText('console.log(1);')).toBeVisible();
  expect(screen.getByText('参考文档')).toBeVisible();
  expect(screen.getByRole('img', { name: '原图' })).toHaveAttribute('src', '/example.png');
});

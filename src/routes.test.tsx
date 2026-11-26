// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Article, Figure } from './components/Article';
import { routes } from './sections';
import { createMockFetch } from './sections/team/mock';

const readingPaths = { '/blog/:slug': ['install-agentx', 'mock-server', '393-traces'] };

const supportTitles: Record<string, string> = {
  '/': 'GAAC 技术支持', '/tasks': '比赛任务',
  '/model': '统一模型', '/search': 'GAAC Agentic Search',
  '/data': '数据集', '/tools': '工具应用', '/eval': '测评服务',
  '/notices': '公告与答疑', '/status': '运行状态', '/desk': '我的队伍',
};

beforeAll(async () => {
  vi.stubGlobal('fetch', createMockFetch());
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

  it('keeps support navigation under the configured base', async () => {
    renderPath('/eval');
    const main = within(screen.getByRole('main'));
    expect(await main.findByRole('link', { name: '搜索服务' })).toHaveAttribute('href', '/gaac-support/search/');
    expect(main.getByRole('link', { name: '我的队伍' })).toHaveAttribute('href', '/gaac-support/team/');
    expect(main.getByText('这部分还在筹备，比赛流程定下来以后在这里发布。')).toBeVisible();
    expect(screen.getByRole('link', { name: '赛程沙盘' })).toHaveAttribute('href', '/gaac-support/sandbox');
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

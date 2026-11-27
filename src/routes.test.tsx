// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { Article, Figure } from './components/Article';
import { routes } from './sections';
import { createMockFetch } from './sections/team/mock';

const supportTitles: Record<string, string> = {
  '/': 'GAAC 技术支持', '/tasks': '比赛任务',
  '/model': '统一模型', '/search': '搜索服务',
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
  const cases = routes.map((route) => ({ route, path: route.path.replace('*', 'demo-join') }));
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

describe('search overview', () => {
  async function openSearch() {
    renderPath('/search');
    const main = within(screen.getByRole('main'));
    await main.findByRole('heading', { name: '搜索服务', level: 1 }, { timeout: 3000 });
    return main;
  }

  it('shows the four figures, five datasets, and all 17 tools', async () => {
    const main = await openSearch();
    const overview = within(main.getByRole('list', { name: '服务概览' }));
    expect(overview.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '5 类数据', '9 个平台来源', '17 个工具', '3 种接法',
    ]);
    const data = within(main.getByRole('region', { name: '数据内容' }));
    expect(data.getAllByRole('article')).toHaveLength(5);
    for (const title of ['网页', '平台数据源', '文档语料', '市场数据', '图片与演示文稿']) {
      expect(data.getByRole('article', { name: title })).toBeVisible();
    }
    expect(data.getAllByRole('code').map((tool) => tool.textContent).sort()).toEqual([
      'web_search', 'web_read', 'web_locate', 'source_list', 'source_search', 'source_browse', 'source_read',
      'corpus_search', 'corpus_read', 'corpus_locate', 'corpus_table', 'market_lookup', 'market_data',
      'image_search', 'image_fetch', 'pptx_render', 'search_status',
    ].sort());
  });

  it('selects connection tabs by click and arrow keys', async () => {
    const main = await openSearch();
    const tabs = within(main.getByRole('tablist', { name: '接入方式' }));
    const rest = tabs.getByRole('tab', { name: 'REST', selected: true });
    const mcp = tabs.getByRole('tab', { name: 'MCP' });
    const searxng = tabs.getByRole('tab', { name: 'SearXNG 兼容' });
    expect(main.getByRole('tabpanel', { name: 'REST' })).toBeVisible();
    fireEvent.click(mcp);
    expect(mcp).toHaveAttribute('aria-selected', 'true');
    expect(main.getByRole('tabpanel', { name: 'MCP' })).toBeVisible();
    expect(main.queryByRole('tabpanel', { name: 'REST' })).toBeNull();
    fireEvent.keyDown(mcp, { key: 'ArrowRight' });
    expect(searxng).toHaveFocus();
    expect(main.getByRole('tabpanel', { name: 'SearXNG 兼容' })).toBeVisible();
    fireEvent.keyDown(searxng, { key: 'ArrowRight' });
    expect(rest).toHaveFocus();
    expect(rest).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(rest, { key: 'ArrowLeft' });
    expect(searxng).toHaveFocus();
    expect(rest).toHaveAttribute('tabindex', '-1');
  });

  it('keeps troubleshooting collapsed with the API reference available', async () => {
    const main = await openSearch();
    const troubleshooting = main.getByText('出错了先看这里').closest('details');
    expect(troubleshooting).not.toHaveAttribute('open');
    expect(main.getByRole('table')).not.toBeVisible();
    expect(main.getByRole('link', { name: '接入指南的 API 参考' })).toBeVisible();
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

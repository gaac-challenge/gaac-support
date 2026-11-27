const platformGroups = [
  { label: '技术社区', sources: ['GitHub（仓库、README、Issue 和 PR 及评论）', 'Hacker News（帖子和热门评论）', 'V2EX（热门、最新、节点帖子和回复）'] },
  { label: '学术', sources: ['arXiv（论文和摘要）', 'OpenAlex（论文、摘要、参考文献，可查引用与被引）', 'Crossref（论文信息和参考文献）'] },
  { label: '金融与预测', sources: ['雪球（证券行情快照）', 'Polymarket（预测市场事件和价格）'] },
  { label: '视频', sources: ['YouTube（视频信息和字幕）'] },
];

type Field = { label: string; text: string };
type SearchDataset = {
  id: string;
  title: string;
  mode: '实时' | '固定版本';
  description: string;
  tools: string[];
} & ({ lines: string[] } | { groups: Field[] } | { cells: Field[] });

export const datasets: SearchDataset[] = [
  {
    id: 'web', title: '网页', mode: '实时', description: '搜索公开网页，读正文，核对引文。',
    lines: [
      '汇总多个公开搜索引擎的网页、新闻和学术结果',
      '读取公开网页和 PDF 的正文',
      '核对一句话是否真的出现在读过的网页里，并给出位置',
    ],
    tools: ['web_search', 'web_read', 'web_locate'],
  },
  {
    id: 'platforms', title: '平台数据源', mode: '实时', description: '9 个平台的结构化内容。',
    groups: platformGroups.map(({ label, sources }) => ({ label, text: sources.join(' · ') })),
    tools: ['source_list', 'source_search', 'source_browse', 'source_read'],
  },
  {
    id: 'corpus', title: '文档语料', mode: '固定版本', description: '公司披露文件，可按页核对。',
    lines: [
      'A 股、港股、美股公司的年报和交易所公告',
      '美股 8-K、6-K 文件和新闻稿',
      '搜片段、读原文、按页定位引文、读结构化表格',
    ],
    tools: ['corpus_search', 'corpus_read', 'corpus_locate', 'corpus_table'],
  },
  {
    id: 'media', title: '图片与演示文稿', mode: '实时', description: '开放许可配图和 PPT 预览。',
    lines: [
      '开放许可图片：Openverse 和 Wikimedia Commons，默认只返回可商用、可修改的许可（CC0、公有领域、CC BY、CC BY-SA），每张附署名',
      '也可使用固定图库，同一查询返回同样的图片',
      'PPTX 预览：渲染成逐页图片，和评审使用同一个渲染器',
    ],
    tools: ['image_search', 'image_fetch', 'pptx_render'],
  },
  {
    id: 'market', title: '市场数据', mode: '固定版本', description: '三大指数成分股的行情、财报和宏观数据，截止到固定日期。',
    cells: [
      { label: '覆盖范围', text: '沪深 300、标普 500、恒生指数成分股' },
      { label: '公司资料', text: '中英文名、交易所、行业、币种、财年' },
      { label: '日行情', text: '开高低收、成交量和成交额、复权因子' },
      { label: '财务报表', text: '2023–2025 年报（A 股另有 2026 半年报）；资产负债表、利润表、现金流量表，另有营收、净利润、经营现金流等 10 项核心指标' },
      { label: 'ETF', text: '8 只跟踪三大指数的 ETF' },
      { label: '汇率', text: '美元、人民币、港币日度汇率' },
      { label: '宏观', text: '中美 CPI、政策利率、GDP；美国国债 14 个期限收益率；17 种大宗商品月度价格' },
    ],
    tools: ['market_lookup', 'market_data'],
  },
];

export const statusTool = 'search_status';
export const platformCount = platformGroups.reduce((count, group) => count + group.sources.length, 0);
export const toolCount = datasets.reduce((count, dataset) => count + dataset.tools.length, 1);

// Deduplicated REST tuples from search_gateway/mcp_server.py's ToolSpec registry.
export const restEndpoints = [
  { label: '接入状态', paths: ['GET /v1/status'] },
  { label: '网页与文档', paths: ['POST /v1/search', 'POST /v1/read', 'POST /v1/web/locate', 'POST /v1/locate', 'POST /v1/corpus/table'] },
  { label: '平台数据源', paths: ['GET /v1/sources', 'POST /v1/sources/search', 'POST /v1/sources/browse', 'POST /v1/sources/read'] },
  { label: '市场数据', paths: ['POST /v1/market/lookup', 'POST /v1/market/data'] },
  { label: '图片与演示文稿', paths: ['POST /v1/images/search', 'POST /v1/images/fetch', 'POST /v1/render/pptx'] },
];

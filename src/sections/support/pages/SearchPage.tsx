import { useRef, useState, type KeyboardEvent } from 'react';
import { IndexTable, SupportFrame, SupportLink, SupportList } from '../components';
import { datasets, platformCount, restEndpoints, statusTool, toolCount } from '../content/search';
import './search.css';

const guide = 'https://search-api.54-82-224-126.sslip.io/guide/';
const connections = [
  { id: 'rest', label: 'REST' },
  { id: 'mcp', label: 'MCP' },
  { id: 'searxng', label: 'SearXNG 兼容' },
];

function SearchCurl() {
  return <><b>{"curl"}</b>{" -sS \"https://search-api.54-82-224-126.sslip.io/v1/search\" \\\n  -H \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"query\":\"open source agents\",\"limit\":5}'"}</>;
}

function SearchOverview() {
  const figures = [
    { value: datasets.length, label: '类数据' },
    { value: platformCount, label: '个平台来源' },
    { value: toolCount, label: '个工具' },
    { value: connections.length, label: '种接法' },
  ];
  return <section className="card page-heading search-overview" aria-labelledby="page-title">
    <p className="search-eyebrow">GAAC Agentic Search</p>
    <h1 id="page-title">搜索服务</h1>
    <p className="page-heading-lead">一把队伍密钥，让智能体查网页、平台、文档、行情和图片。</p>
    <ul className="search-figures" aria-label="服务概览">
      {figures.map(({ value, label }) => <li key={label}><strong>{value}</strong> <span>{label}</span></li>)}
    </ul>
    <div className="search-overview-bottom">
      <ul className="search-overview-facts">
        <li><strong>实时：</strong>网页、平台数据源和图片随搜随取</li>
        <li><strong>固定版本：</strong>文档语料和市场数据有版本号，同一查询结果始终一致</li>
        <li>具体开放哪些，以 <code>{statusTool}</code> 返回为准</li>
      </ul>
      <div className="actions">
        <SupportLink className="pill primary" href={guide}>打开接入指南</SupportLink>
        <SupportLink className="pill secondary" href="#connections">看接入方式</SupportLink>
      </div>
    </div>
  </section>;
}

function SearchCoverage() {
  return <section className="search-section" aria-labelledby="search-data-title">
    <h2 id="search-data-title">数据内容</h2>
    <div className="search-data-grid">
      {datasets.map((dataset) => <article className={'card search-data-card' + ('cells' in dataset ? ' search-data-card-wide' : '')} key={dataset.id} aria-labelledby={'search-data-' + dataset.id}>
        <header><h3 id={'search-data-' + dataset.id}>{dataset.title}</h3><span className="search-tag" data-fixed={dataset.mode === '固定版本'}>{dataset.mode}</span></header>
        <p>{dataset.description}</p>
        {'lines' in dataset
          ? <ul className="search-data-lines">{dataset.lines.map((line) => <li key={line}>{line}</li>)}</ul>
          : <dl className={'cells' in dataset ? 'search-market-cells' : 'search-platform-groups'}>
              {('cells' in dataset ? dataset.cells : dataset.groups).map(({ label, text }) =>
                <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}
            </dl>}
        <p className="search-tool-list"><span>工具</span>{dataset.tools.map((tool) => <code key={tool}>{tool}</code>)}</p>
      </article>)}
    </div>
    <p className="search-section-note">另有 <code>{statusTool}</code>：查看当前可用的工具和剩余额度。</p>
  </section>;
}

function FirstCall() {
  return <section className="search-section" id={"first"} aria-labelledby={"first-title"}>
    <div className="card split search-first-call">
      <div>
        <h2 id={"first-title"}>{"首次调用"}</h2>
        <p className={"lead"}>{"在运行智能体的环境里执行。收到 HTTP 200 和 "}<code>{"results"}</code>{" 数组就是通了。"}</p>
        <SupportList className={"steps"} items={[
            <><div><b>{"设置密钥"}</b><span>{"终端会隐藏输入，密钥只放在环境变量 "}<code>{"GAAC_KEY"}</code>{" 里"}</span></div></>,
            <><div><b>{"查接入状态"}</b><span>{"核对返回的队伍 "}<code>{"team"}</code>{"、阶段 "}<code>{"phase"}</code>{"、工具 "}<code>{"tools"}</code>{" 和额度 "}<code>{"rate_limit"}</code></span></div></>,
            <><div><b>{"搜一次"}</b><span>{"排查问题时记下响应里的 "}<code>{"request_id"}</code></span></div></>,
          ]} />
      </div>
      <pre className={"code"} aria-label={"首次调用的三条命令"}><span className={"code__file"}>{"1 设置密钥"}</span>{"printf 'GAAC API key: '\nIFS= read -r -s GAAC_KEY\nprintf '\\n'\nexport GAAC_KEY\n\n"}<span className={"code__file"}>{"2 查接入状态"}</span><b>{"curl"}</b>{" -sS -H \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\" \\\n  \"https://search-api.54-82-224-126.sslip.io/v1/status\"\n\n"}<span className={"code__file"}>{"3 搜一次"}</span><SearchCurl /></pre>
    </div>
  </section>;
}

function IntegrationMethods() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = connections.length - 1;
    const next = event.key === 'ArrowLeft' ? (index + last) % connections.length
      : event.key === 'ArrowRight' ? (index + 1) % connections.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  const panels = [
    <>
      <p>适合 Python、自写工作流等可发送 HTTP 请求的客户端。可添加 <code>X-Task-Id</code> 请求头（最长 128 字符），将请求与智能体任务对应。</p>
      <pre className="code" aria-label="REST 搜索示例"><SearchCurl /></pre>
      <dl className="search-endpoints">
        {restEndpoints.map(({ label, paths }) => <div key={label}>
          <dt>{label}</dt><dd>{paths.map((path) => <code key={path}>{path}</code>)}</dd>
        </div>)}
      </dl>
    </>,
    <>
      <p>Claude Code、Codex 等客户端通过 Streamable HTTP 连接 <code>/mcp</code>。连接后先调用 <code>{statusTool}</code>，再用 <code>web_search</code>。</p>
      <pre className="code" aria-label="Claude Code 的 MCP 配置"><span className={"code__file"}>{"Claude Code 接 MCP"}</span><b>{"claude"}</b>{" mcp add --transport http gaac-search \\\n  \"https://search-api.54-82-224-126.sslip.io/mcp\" \\\n  --header \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\""}</pre>
    </>,
    <>
      <p>适合已支持 SearXNG JSON 的工具，例如读取 <code>SEARXNG_URL</code> 的客户端。基础地址含密钥，请勿写进共享配置、日志、截图或代码仓库。</p>
      <pre className="code" aria-label="SearXNG JSON 搜索示例">{'GET /search?q=open+source+agents&format=json'}</pre>
    </>,
  ];

  return <section className="search-section" id="connections" aria-labelledby="ways-title">
    <h2 id="ways-title">接入方式</h2>
    <div className="card search-connection">
      <div className="search-tabs" role="tablist" aria-labelledby="ways-title">
        {connections.map(({ id, label }, index) => <button key={id} ref={(button) => { tabs.current[index] = button; }}
          type="button" role="tab" id={'search-tab-' + id} aria-controls={'search-panel-' + id} aria-selected={index === active}
          tabIndex={index === active ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => moveTab(event, index)}>{label}</button>)}
      </div>
      {connections.map(({ id }, index) => <div key={id} className="search-panel" role="tabpanel" id={'search-panel-' + id}
        aria-labelledby={'search-tab-' + id} tabIndex={0} hidden={index !== active}>{panels[index]}</div>)}
    </div>
  </section>;
}

function Troubleshooting() {
  return <section className="search-section" aria-labelledby="help-title">
    <details className="card search-troubleshooting">
      <summary><h2 id="help-title">出错了先看这里</h2></summary>
      <p className="lead">找组织方时，附上接口路径、HTTP 状态码和请求 ID。</p>
      <div className="search-troubleshooting-table">
        <IndexTable headings={[{ content: "情况" , scope: "col" }, { content: "怎么办" , scope: "col" }]} rows={[
            { cells: [{ content: "401 / 403" , className: "name" }, { content: <>{"确认运行客户端的终端设了 "}<code>{"GAAC_KEY"}</code>{"，请求带了 Bearer 头。如密钥过期或被撤销，请联系组委会"}</> }] },
            { cells: [{ content: "429" , className: "name" }, { content: <>{"按错误里的 "}<code>{"retry_after"}</code>{" 等一会儿再试；剩余额度和重置时间用 "}<code>{"GET /v1/status"}</code>{" 看"}</> }] },
            { cells: [{ content: "503 / 504" , className: "name" }, { content: <>{"看错误里的 "}<code>{"code"}</code>{" 分清维护、队伍暂停、语料未就绪还是上游异常；"}<code>{"retryable"}</code>{" 为 true 才重试"}</> }] },
            { cells: [{ content: "密钥丢失或泄露" , className: "name" }, { content: "队长提供队伍 ID 和已知的密钥前缀，申请撤销旧密钥并换发" }] },
            { cells: [{ content: "搜索来源有变化" , className: "name" }, { content: <>{"正常：默认来源随模式切换。先看 "}<code>{"/v1/status"}</code>{" 里的 "}<code>{"mode"}</code>{" 和 "}<code>{"tools"}</code></> }] },
          ]} />
      </div>
    </details>
    <p className="note search-section-note">{"完整的接口参数、Codex 配置和各数据源的示例，见 "}<SupportLink className={"ext"} href={"https://search-api.54-82-224-126.sslip.io/guide/#reference"}>{"接入指南的 API 参考"}</SupportLink>{"。"}</p>
  </section>;
}

export function SearchPage() {
  return <SupportFrame title={"搜索服务：GAAC 技术支持"} banner={<>{"API 密钥由组委会发放。"}<SupportLink href={"https://search-api.54-82-224-126.sslip.io/guide/#onboarding"}>{"查看密钥接入说明"}</SupportLink></>}>
    <SearchOverview />
    <SearchCoverage />
    <IntegrationMethods />
    <FirstCall />
    <Troubleshooting />
  </SupportFrame>;
}

import { PageHeader } from '../../../components/PageHeader';
import { IndexTable, SupportFrame, SupportLink, SupportList } from '../components';

function FirstCall() {
  return <section className={"section--s"} id={"first"} aria-labelledby={"first-title"}>
    <div className={"container split"}>
      <div>
        <h2 id={"first-title"}>{"首次调用"}</h2>
        <p className={"lead"}>{"在运行智能体的环境里执行。收到 HTTP 200 和 "}<code>{"results"}</code>{" 数组就是通了。"}</p>
        <SupportList className={"steps"} items={[
            <><div><b>{"设置密钥"}</b><span>{"终端会隐藏输入，密钥只放在环境变量 "}<code>{"GAAC_KEY"}</code>{" 里"}</span></div></>,
            <><div><b>{"查接入状态"}</b><span>{"核对返回的队伍 "}<code>{"team"}</code>{"、阶段 "}<code>{"phase"}</code>{"、工具 "}<code>{"tools"}</code>{" 和额度 "}<code>{"rate_limit"}</code></span></div></>,
            <><div><b>{"搜一次"}</b><span>{"排查问题时记下响应里的 "}<code>{"request_id"}</code></span></div></>,
          ]} />
      </div>
      <pre className={"code"} aria-label={"首次调用的三条命令"}><span className={"code__file"}>{"1 设置密钥"}</span>{"printf 'GAAC API key: '\nIFS= read -r -s GAAC_KEY\nprintf '\\n'\nexport GAAC_KEY\n\n"}<span className={"code__file"}>{"2 查接入状态"}</span><b>{"curl"}</b>{" -sS -H \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\" \\\n  \"https://search-api.54-82-224-126.sslip.io/v1/status\"\n\n"}<span className={"code__file"}>{"3 搜一次"}</span><b>{"curl"}</b>{" -sS \"https://search-api.54-82-224-126.sslip.io/v1/search\" \\\n  -H \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"query\":\"open source agents\",\"limit\":5}'"}</pre>
    </div>
  </section>;
}

function IntegrationMethods() {
  return <section className={"section"} aria-labelledby={"ways-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"ways-title"}>{"接入方式"}</h2>
        <p className={"lead"}>{"按客户端选。需要把请求和智能体任务对上，可以加 "}<code>{"X-Task-Id"}</code>{" 请求头，最长 128 字符。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "方式" , scope: "col" }, { content: "适合" , scope: "col" }, { content: "入口" , scope: "col" }]} rows={[
            { cells: [{ content: "REST" , className: "name" }, { content: "Python、自写工作流，任何能发 HTTP 请求的客户端" }, { content: <><code>{"POST /v1/search"}</code>{" 搜索，"}<code>{"POST /v1/read"}</code>{" 读网页或语料正文"}</> }] },
            { cells: [{ content: "MCP" , className: "name" }, { content: "Claude Code、Codex 等，通过 Streamable HTTP 连接" }, { content: <><code>{"/mcp"}</code>{"；连上后先调 "}<code>{"search_status"}</code>{"，再用 "}<code>{"web_search"}</code></> }] },
            { cells: [{ content: "SearXNG 兼容" , className: "name" }, { content: <>{"已经支持 SearXNG JSON 的工具，比如读 "}<code>{"SEARXNG_URL"}</code>{" 的客户端"}</> }, { content: <><code>{"GET /search"}</code>{"；基础地址里含密钥，别写进共享配置、日志、截图或代码仓库"}</> }] },
            { cells: [{ content: "数据源" , className: "name" }, { content: "GitHub、V2EX、YouTube 等平台内容，服务端用改编自 Agent Reach 的适配器" }, { content: <><code>{"GET /v1/sources"}</code>{" 列来源，"}<code>{"/v1/sources/search"}</code>{"、"}<code>{"browse"}</code>{"、"}<code>{"read"}</code></> }] },
          ]} />
      </div>
      <pre className={"code code--light"} style={{"marginTop":"var(--space-xl)"}} aria-label={"Claude Code 的 MCP 配置"}><span className={"code__file"}>{"Claude Code 接 MCP"}</span><b>{"claude"}</b>{" mcp add --transport http gaac-search \\\n  \"https://search-api.54-82-224-126.sslip.io/mcp\" \\\n  --header \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\""}</pre>
    </div>
  </section>;
}

function SearchCoverage() {
  return <section className={"section"} aria-labelledby={"cover-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"cover-title"}>{"数据覆盖"}</h2>
        <p className={"lead"}>{"实时模式可搜索公开网页。当前模式和可用工具用 "}<code>{"GET /v1/status"}</code>{" 看。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "数据" , scope: "col" }, { content: "什么时候能用" , scope: "col" }, { content: "内容" , scope: "col" }]} rows={[
            { cells: [{ content: "通用网页" , className: "name" }, { content: "实时模式" }, { content: "经 SearXNG 搜公开网页、新闻和科学内容；公开 HTML 和 PDF 能读正文" }] },
            { cells: [{ content: "文档语料" , className: "name" }, { content: "取决于接入配置" }, { content: "搜文档片段、读原文、定位引文、读表格" }] },
            { cells: [{ content: "金融数据" , className: "name" }, { content: "可用性见接入状态" }, { content: "沪深 300、标普 500、恒生指数成分股；日行情、财务报表、ETF、汇率和部分宏观指标" }] },
            { cells: [{ content: "平台数据" , className: "name" }, { content: "实时模式" }, { content: "GitHub、Hacker News、V2EX；arXiv、OpenAlex、Crossref；雪球、Polymarket；YouTube" }] },
            { cells: [{ content: "图片与图标" , className: "name" }, { content: "取决于服务模式" }, { content: "可检索 Openverse 和 Wikimedia Commons 的开放许可图片。引用时保留许可和署名" }] },
          ]} />
      </div>
    </div>
  </section>;
}

function Troubleshooting() {
  return <section className={"section"} aria-labelledby={"help-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"help-title"}>{"出错了先看这里"}</h2>
        <p className={"lead"}>{"找组织方时，附上接口路径、HTTP 状态码和请求 ID。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "情况" , scope: "col" }, { content: "怎么办" , scope: "col" }]} rows={[
            { cells: [{ content: "401 / 403" , className: "name" }, { content: <>{"确认运行客户端的终端设了 "}<code>{"GAAC_KEY"}</code>{"，请求带了 Bearer 头。如密钥过期或被撤销，请联系组委会"}</> }] },
            { cells: [{ content: "429" , className: "name" }, { content: <>{"按错误里的 "}<code>{"retry_after"}</code>{" 等一会儿再试；剩余额度和重置时间用 "}<code>{"GET /v1/status"}</code>{" 看"}</> }] },
            { cells: [{ content: "503 / 504" , className: "name" }, { content: <>{"看错误里的 "}<code>{"code"}</code>{" 分清维护、队伍暂停、语料未就绪还是上游异常；"}<code>{"retryable"}</code>{" 为 true 才重试"}</> }] },
            { cells: [{ content: "密钥丢失或泄露" , className: "name" }, { content: "队长提供队伍 ID 和已知的密钥前缀，申请撤销旧密钥并换发" }] },
            { cells: [{ content: "搜索来源有变化" , className: "name" }, { content: <>{"正常：默认来源随模式切换。先看 "}<code>{"/v1/status"}</code>{" 里的 "}<code>{"mode"}</code>{" 和 "}<code>{"tools"}</code></> }] },
          ]} />
      </div>
      <p className={"note"}>{"完整的接口参数、Codex 配置和各数据源的示例，见 "}<SupportLink className={"ext"} href={"https://search-api.54-82-224-126.sslip.io/guide/#reference"}>{"接入指南的 API 参考"}</SupportLink>{"。"}</p>
    </div>
  </section>;
}

export function SearchPage() {
  return <SupportFrame title={"搜索服务：GAAC 技术支持"} banner={<>{"API 密钥由组委会发放。"}<SupportLink href={"https://search-api.54-82-224-126.sslip.io/guide/#onboarding"}>{"查看密钥接入说明"}</SupportLink></>}>
    <PageHeader title={"GAAC Agentic Search"} id={"page-title"} description={<><p className={"lead"}>{"一把队伍密钥，三种接法：REST、MCP、SearXNG 兼容接口。可用工具和额度请查看接入状态。"}</p></>} actions={<><SupportLink className={"pill primary"} href={"https://search-api.54-82-224-126.sslip.io/guide/"}>{"打开接入指南"}</SupportLink><SupportLink className={"pill secondary"} href={"#first"}>{"看首次调用"}</SupportLink></>}>{<></>}</PageHeader>
    <FirstCall />
    <IntegrationMethods />
    <SearchCoverage />
    <Troubleshooting />
  </SupportFrame>;
}

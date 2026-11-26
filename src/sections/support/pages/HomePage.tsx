import { Facts, IndexTable, Street, SupportFrame, SupportLink, SupportList } from '../components';
import { deskSteps, rotation, services } from '../content/home';

function HomeHero() {
  return <section className={"hero"} aria-labelledby={"hero-title"}>
    <Street title={"六个板块的示意图"} />
    <div className={"hero__base"}>
      <div className={"container"}>
        <div>
          <h1 id={"hero-title"}>{"五队共用一套 EdgePod"}</h1>
          <p className={"lead"}>{"模型、资源、预算与评测条件一致；正式评测只认封存的版本。"}</p>
        </div>
        <div className={"actions"}><SupportLink className={"pill primary"} href={"desk.html"}>{"进入本队任务台"}</SupportLink><SupportLink className={"pill secondary"} href={"tasks.html"}>{"看比赛任务"}</SupportLink></div>
      </div>
    </div>
  </section>;
}

function Services() {
  return <section className={"section"} aria-labelledby={"six-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"six-title"}>{"六项服务"}</h2>
        <p className={"lead"}>{"模型、数据和工具都带版本号和哈希，五队拿到的是同一份。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "板块" , scope: "col" }, { content: "这里查得到" , scope: "col" }, { content: "这里能用" , scope: "col" }]} rows={services.map(({ key, title, description, access }) => ({ building: key, cells: [
          { className: 'name', content: <SupportLink href={key + '.html'}>{title}</SupportLink> },
          { content: description }, { content: access },
        ] }))} />
      </div>
    </div>
  </section>;
}

function SearchSummary() {
  return <section className={"section--l"} aria-labelledby={"search-title"}>
    <div className={"container split"}>
      <div>
        <h2 id={"search-title"}>{"搜索服务已上线"}</h2>
        <p className={"lead"}>{"GAAC Agentic Search 支持 REST、MCP 和 SearXNG 兼容接口，三种都用本队的 API 密钥。"}</p>
        <Facts className={"facts"} facts={[
            { label: "搜索来源", value: "随比赛模式切换：实时模式搜公开网页，冻结模式搜本队分配的语料" },
            { label: "平台数据", value: "GitHub、arXiv、YouTube 等，经改编自 Agent Reach 的适配器" },
            { label: "接入指南", value: <><SupportLink className={"ext"} href={"https://search-api.54-82-224-126.sslip.io/guide/"}>{"search-api…/guide"}</SupportLink></> },
          ]} />
      </div>
      <pre className={"code"} aria-label={"搜索请求示例"}><span className={"code__file"}>{"POST /v1/search"}</span><b>{"curl"}</b>{" -sS \"https://search-api.54-82-224-126.sslip.io/v1/search\" \\\n  -H \"Authorization: Bearer "}<i>{"$GAAC_KEY"}</i>{"\" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"query\":\"open source agents\",\"limit\":5}'"}</pre>
    </div>
  </section>;
}

function DeskPreview() {
  return <section className={"section--l"} aria-labelledby={"desk-title"}>
    <div className={"container split split--rev"}>
      <div>
        <h2 id={"desk-title"}>{"本队任务台"}</h2>
        <p className={"lead"}>{"只给本队看。一道题按四步走，铅封要两步确认，封完不能撤销。"}</p>
        <SupportList className={"steps"} items={deskSteps.map(({ title, description }) =>
          <div><b>{title}</b><span>{description}</span></div>
        )} />
        <div className={"actions"} style={{"marginTop":"var(--space-xl)"}}><SupportLink className={"pill secondary"} href={"desk.html"}>{"打开本队任务台"}</SupportLink></div>
      </div>
      <div className={"entry"} data-slot={"desk"} data-kind={"product"} data-alt={"本队任务台的铅封确认，示例数据"}>
        <div className={"entry__head"}><b>{"铅封确认"}</b><span className={"num"}>{"示例"}</span></div>
        <div className={"entry__big"}>{"示例题 1"}</div>
        <div className={"notebook cells"}>
          <div><small>{"队伍"}</small><span>{"A 队"}</span></div>
          <div><small>{"应用"}</small><span>{"可编辑 PPT"}</span></div>
          <div><small>{"文件"}</small><span>{"deck.pptx"}</span></div>
          <div><small>{"哈希"}</small><span className={"num"}>{"3f9a…c2e1"}</span></div>
          <div><small>{"文件"}</small><span>{"trace.jsonl"}</span></div>
          <div><small>{"哈希"}</small><span className={"num"}>{"8b07…41d9"}</span></div>
        </div>
        <div className={"entry__foot"}><span className={"chip"}>{"封完不能撤销"}</span><span className={"plain-support-reference"} aria-hidden={"true"}>{"输入 A 确认铅封"}</span></div>
      </div>
    </div>
  </section>;
}

function ContestSchedule() {
  return <section className={"section--l"} aria-labelledby={"run-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"run-title"}>{"运行状态"}</h2>
        <p className={"lead"}>{"抽签定顺序，五队依次上机，每队一周：144 小时上机，24 小时清场。这里只写队名和所处阶段，不显示分数。"}</p>
      </div>
      <p className={"now"}><b>{"尚未开赛"}</b><span className={"fill"} data-fill={"start-date"}>{"开赛日期待定"}</span></p>
      <div className="rotation" role="list" aria-label="五支队伍的上机窗口">
        {rotation.map(({ team, week }) => <div className="slotwin" role="listitem" key={team}>
          <h3>{team}</h3><div className="slotwin__bar" aria-hidden="true"><span /><span /></div><small>{week}</small>
        </div>)}
      </div>
      <p className={"legend"}><span><i />{"上机 144 小时"}</span><span><i className={"clean"} />{"清场 24 小时"}</span><SupportLink href={"status.html"}>{"看运行状态"}</SupportLink></p>
    </div>
  </section>;
}

export function HomePage() {
  return <SupportFrame title={"GAAC 技术支持"} home banner={<>{"开赛日期和上机顺序都还没有公布，抽签后在这里更新。"}<SupportLink href={"status.html"}>{"看运行状态"}</SupportLink></>}>
    <HomeHero />
    <Services />
    <SearchSummary />
    <DeskPreview />
    <ContestSchedule />
  </SupportFrame>;
}

import { PageHeader } from '../../../components/PageHeader';
import { IndexTable, SupportFrame, SupportLink, SupportList } from '../components';

function Progress() {
  return <section className={"section--s"} aria-labelledby={"all-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"all-title"}>{"现在到哪一步"}</h2>
        <p className={"lead"}>{"第二阶段三类应用各有一项质量测评；第一阶段的推理服务另有一项效率测量。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "测评" , scope: "col" }, { content: "测什么" , scope: "col" }, { content: "进度" , scope: "col" }, { content: "去哪看" , scope: "col" }]} rows={[
            { cells: [{ content: <><SupportLink href={"#dr"}>{"Deep Research"}</SupportLink></> , className: "name" }, { content: "研究报告的深度和可靠：结论对不对、出处是不是真的、挖到哪一层" }, { content: <><span className={"chip chip--green"}>{"基本可用"}</span></> }, { content: <><span className={"ext"}>{"资料站"}</span></> }] },
            { cells: [{ content: <><SupportLink href={"#perf"}>{"推理效率"}</SupportLink></> , className: "name" }, { content: "重放智能体会话，量推理服务的缓存命中、时延和吞吐" }, { content: <><span className={"chip"}>{"试跑中"}</span></> }, { content: <><SupportLink className={"ext"} href={"https://xiaokuge.github.io/gaac-sandbox/blog/"}>{"动手笔记"}</SupportLink></> }] },
            { cells: [{ content: <><SupportLink href={"#ppt"}>{"可编辑 PPT"}</SupportLink></> , className: "name" }, { content: "文件能不能打开、是不是原生可编辑、版式有没有越界和重叠" }, { content: <><span className={"chip"}>{"调研完成"}</span></> }, { content: "评法设计中" }] },
            { cells: [{ content: <><SupportLink href={"#fin"}>{"财报分析"}</SupportLink></> , className: "name" }, { content: "数据计算口径、图表可编辑、结论与局限" }, { content: <><span className={"chip"}>{"调研完成"}</span></> }, { content: "评法设计中" }] },
          ]} />
      </div>
    </div>
  </section>;
}

function ResearchEvaluation() {
  return <section className={"section"} id={"dr"} aria-labelledby={"dr-title"}>
    <div className={"container split"}>
      <div>
        <h2 id={"dr-title"}>{"Deep Research 测评"}</h2>
        <p className={"lead"}>{"比的是报告。重点是调研的深，前提是可靠。篇幅、格式、引用条数和文笔都不进名次。"}</p>
        <SupportList className={"steps"} items={[
            <><div><b>{"预处理"}</b><span>{"统一格式，去掉队名和产品名，评委看不到是谁写的"}</span></div></>,
            <><div><b>{"断言核验"}</b><span>{"带来源的结论逐条打开来源核对；“找不到”要经第二次核查才算编造"}</span></div></>,
            <><div><b>{"要点池"}</b><span>{"合并各份报告和出题人的深度地图，逐条判对错、切题与否、深到哪一层"}</span></div></>,
            <><div><b>{"环节评级"}</b><span>{"切题、查找过程、甄别来源、分析、结论与把握，各评 0、1、2 档，引原文为证"}</span></div></>,
            <><div><b>{"两两比较"}</b><span>{"只用来核对名次，不能推翻已经查实的问题"}</span></div></>,
          ]} />
      </div>
      <pre className={"code"} aria-label={"申报文件里的调用方式，二选一"}><span className={"code__file"}>{"命令行：题目从标准输入进，报告从标准输出出"}</span>{"{\"方式\": \"命令行\",\n \"命令\": [\"python3\", \"agent.py\"],\n \"工作目录\": \".\"}\n\n"}<span className={"code__file"}>{"网络接口：POST 题目，回报告"}</span>{"{\"方式\": \"网络接口\",\n \"地址\": \"http://127.0.0.1:8000/run\"}\n\n"}<i>{"# 请求  {\"题目\": \"题目原文\", \"往来\": []}"}</i><i>{"# 回应  {\"报告\": \"报告全文\"}"}</i></pre>
    </div>
  </section>;
}

function ResearchDelivery() {
  return <section className={"section--s"} aria-labelledby={"dr-more-title"}>
    <div className={"container"}>
      <h2 id={"dr-more-title"} className={"visually-hidden"}>{"Deep Research 测评的交付、名次与评委"}</h2>
      <div className={"cols3"}><article><h3>{"报告要有五个部分"}</h3><SupportList className={"ticks"} items={[
          "主要结论，放在开头",
          "论证与解释",
          "出处",
          "把握程度",
          "查找与来源说明",
        ]} /></article><article><h3>{"名次怎么定"}</h3><SupportList className={"ticks"} items={[
          "有硬伤的排在没有硬伤的后面",
          "同一档里比深度净分：写对、切题的要点得分，写错的扣分",
          "公布名次区间，例如“第 1 至 2 名”，分不开就并列",
        ]} /></article><article><h3>{"评委"}</h3><SupportList className={"ticks"} items={[
          "至少三家厂商的模型，每个评委评两次",
          "关键判定全部人工审计，另随机抽查一成",
          "现在由 Claude、Codex、Gemini 三家模拟评审",
        ]} /></article></div>
    </div>
  </section>;
}

function AvailableEvaluations() {
  return <section className={"section--s"} aria-labelledby={"dr-have-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"dr-have-title"}>{"已经能用的"}</h2>
        <p className={"lead"}>{"用三月 6 个产品对同一道题的真实报告试跑过一遍：故意改错的 3 处全部查出，编造的来源被识别，同一评委重评一次 83% 相同。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "材料" , scope: "col" }, { content: "用来做什么" , scope: "col" }]} rows={[
            { cells: [{ content: <><span>{"技术文档"}</span></> , className: "name" }, { content: "智能体怎样申报、主办方怎样调用、运行环境、反问的统一答复" }] },
            { cells: [{ content: <><span>{"规则手册"}</span></> , className: "name" }, { content: "出题、冻结与申报、运行、交付、评审、名次、申诉，草案第 4 版" }] },
            { cells: [{ content: <><span>{"新手包"}</span></> , className: "name" }, { content: <>{"申报表模板、示例智能体、练习题，和检查报告五个部分的 "}<code>{"check_report.py"}</code></> }] },
            { cells: [{ content: <><span>{"一道题走完全程"}</span></> , className: "name" }, { content: "以“中国最大的淡水湖”为例，从出题走到名次，分数按真实规则算" }] },
            { cells: [{ content: <><span>{"试评名次"}</span></> , className: "name" }, { content: "六份报告的名次区间和每份的复核页；只是演示，不是对产品的评价" }] },
          ]} />
      </div>
      <pre className={"code code--light"} style={{"marginTop":"var(--space-xl)"}} aria-label={"交付前自查报告"}><span className={"code__file"}>{"交付前自查：在新手包目录里运行"}</span><b>{"python3"}</b>{" check_report.py 报告.md"}</pre>
      <p className={"note"}>{"自查程序只帮你看五个部分齐不齐，评审不用它。折算成 GAAC 第二阶段 Deep Research 质量 15 分的办法："}<span className={"fill"} data-fill={"dr-mapping"}>{"待定"}</span></p>
    </div>
  </section>;
}

function EfficiencyTrial() {
  return <section className={"section"} id={"perf"} aria-labelledby={"perf-title"}>
    <div className={"container split split--rev"}>
      <div>
        <h2 id={"perf-title"}>{"推理效率：拿 AgentX 试跑"}</h2>
        <p className={"lead"}>{"AgentX 是 SemiAnalysis 开源的推理基准：把真实的智能体编程会话去掉文字、留下形状，原样重放给推理服务。我们先装起来，对着假服务端跑通，再上真显卡。"}</p>
        <p className={"note"}>{"每一步的过程和找到的差距，写在 "}<SupportLink className={"ext"} href={"https://xiaokuge.github.io/gaac-sandbox/blog/"}>{"GAAC 精英赛动手笔记"}</SupportLink>{"。"}</p>
      </div>
      <div>
        <SupportList className={"steps"} items={[
            <><div><b>{"装起来"}</b><span>{"在我们手里跑通，找到 10 条差距"}</span></div></>,
            <><div><b>{"拆开假服务端"}</b><span>{"列出推理服务端必须提供的接口和特性"}</span></div></>,
            <><div><b>{"看懂 393 条会话"}</b><span>{"它们怎样录下、从 13,316 条里挑出来，适合测什么"}</span></div></>,
            <><div><b>{"接通录、转、回放"}</b><span>{"下一步，不用等显卡"}</span></div></>,
            <><div><b>{"上真显卡跑一个合规点"}</b><span>{"DeepSeek V4.1 Flash 在 EdgePod 上的缓存命中和时延"}</span></div></>,
          ]} />
      </div>
    </div>
  </section>;
}

function OtherEvaluations() {
  return <section className={"section"} aria-labelledby={"pf-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"pf-title"}>{"PPT 和财报：调研做完了"}</h2>
        <p className={"lead"}>{"两项都先精读已有的评测基准，再对照 GAAC 要回答的问题逐篇审视。评法还在设计，定下来后在这里发布自测工具。"}</p>
      </div>
      <div className={"cols2"}><article id={"ppt"}><h3>{"可编辑 PPT"}</h3><p className={"pts"}>{"精读 14 篇"}</p><SupportList className={"ticks"} items={[
          "文件有效性、越界、重叠、结构比对，已有确定、可重复的程序，大多是 MIT 许可",
          "文字溢出还没有哪篇用程序在演示文稿文件上查过，要我们先验证",
          "可编辑性只有两篇查，规则都挡不住整页贴图之类的绕法",
          "评委自身的摆动和被测差距同一量级，评委要冻结并先体检",
        ]} /></article><article id={"fin"}><h3>{"财报分析"}</h3><p className={"pts"}>{"精读 17 篇"}</p><SupportList className={"ticks"} items={[
          "三篇报告了同一系统重复运行的波动，量级都不小",
          "没有一篇做过只换推理后端的对比",
          "预测类全按公式算分；分析类多数靠评委，评委和人逐条一致的程度几乎没人测",
        ]} /></article></div>
    </div>
  </section>;
}

export function EvaluationPage() {
  return <SupportFrame title={"测评服务：GAAC 技术支持"} banner={<>{"自测分只给本队参考，和正式分分开记。计分规则见比赛任务。"}<SupportLink href={"tasks.html#score-title"}>{"看计分规则"}</SupportLink></>}>
    <PageHeader title={"四项测评，进度不一"} id={"page-title"} description={<><p className={"lead"}>{"Deep Research 测评的评法、运行程序和新手包已经能用；推理效率测量在试跑；PPT 和财报的评法调研做完了。"}</p></>} actions={<><SupportLink className={"pill primary"} href={"#dr"}>{"看 Deep Research 测评"}</SupportLink><SupportLink className={"pill secondary"} href={"tasks.html#score-title"}>{"看计分规则"}</SupportLink></>}>{<></>}</PageHeader>
    <Progress />
    <ResearchEvaluation />
    <ResearchDelivery />
    <AvailableEvaluations />
    <EfficiencyTrial />
    <OtherEvaluations />
  </SupportFrame>;
}

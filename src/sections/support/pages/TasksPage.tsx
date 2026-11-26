import { PageHeader } from '../../../components/PageHeader';
import { Facts, IndexTable, SupportFrame, SupportLink, SupportList, WeekBar } from '../components';
import { enterpriseTasks, foundationTasks, teamWeek } from '../content/contest';

function TeamWeek() {
  return <section className={"section--s"} id={"week"} aria-labelledby={"week-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"week-title"}>{"每队一周：144 小时上机，24 小时清场"}</h2>
        <p className={"lead"}>{"第 30 小时封存正式系统。之后的测量、正式运行、用户测试和审计，都对着封存的版本做，参赛队不能再改。"}</p>
      </div>
      <WeekBar label={"一周 168 小时的时段，按长度画，数字是小时"} slots={teamWeek} />
      <p className={"week-seal"} aria-hidden={"true"}><span>{"开卷"}</span><span>{"第 30 小时封存"}</span></p>
      <p className={"note"}>{"数字是从上机开始算的小时。时段长度是技术规格草案的估算，要在开赛前的内测里实测确认。人工评审不在这一周里做：五队全部结束后，打乱队伍集中盲评，异议和答辩随后进行。"}</p>
    </div>
  </section>;
}

function FoundationTask() {
  return <section className={"section"} aria-labelledby={"p1-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"p1-title"}>{"第一阶段 25 分：验证可重建的全栈底座"}</h2>
        <p className={"lead"}>{"开卷准备，允许复用成熟的开源推理引擎和缓存系统。测量对着第 30 小时封存的系统做。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "考题" , scope: "col" }, { content: "分值" , scope: "col" }, { content: "考什么" , scope: "col" }]} rows={foundationTasks.map(({ title, points, goal }) => ({ cells: [
          { content: title, className: 'name' }, { content: points, className: 'pts' }, { content: goal },
        ] }))} />
      </div>
      <div className={"cols2"} style={{"marginTop":"var(--space-2xl)"}}><article><h3>{"六个主指标"}</h3><SupportList className={"ticks"} items={[
          "任务成功率，越高越好",
          "任务完成时间 P95，越低越好",
          "首 token 延迟 P95，越低越好",
          "单流生成速度，越高越好",
          "满足服务等级的并发数，越高越好",
          "每个成功任务的成本，越低越好",
        ]} /><p className={"note"}>{"P95：95% 的请求不超过这个值。"}</p></article><article><h3>{"单独判定，不能用部分分抵消"}</h3><SupportList className={"ticks is-no"} items={[
          "错误的 KV 命中",
          "越权",
          "泄露",
          "数据毁损",
        ]} /></article></div>
    </div>
  </section>;
}

function EnterpriseTasks() {
  return <section className={"section"} aria-labelledby={"p2-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"p2-title"}>{"第二阶段 75 分：三类企业高频任务"}</h2>
        <p className={"lead"}>{"每类 6 道隐藏题，每题独立跑 3 次，三类共 54 次正式尝试。研究素材和图片由组委会统一提供。"}</p>
      </div>
      <div className="cols3">{enterpriseTasks.map(({ title, points, input, deliverable, quality, budget }) =>
        <article key={title}><h3>{title}</h3><p className="pts">{points}</p><Facts className="kv" facts={[
          { label: '输入', value: input },
          { label: '交付', value: deliverable },
          { label: '质量 15 分', value: quality },
          { label: '单次预算', value: budget },
        ]} /></article>
      )}</div>
    </div>
  </section>;
}

function Scoring() {
  return <section className={"section"} aria-labelledby={"score-title"}>
    <div className={"container split"}>
      <div>
        <h2 id={"score-title"}>{"先过门槛，再比效率"}</h2>
        <p className={"lead"}>{"每类应用 25 分 = 质量 15 + 效率 6 + 复现证据 4。没过门槛，这一类的效率分记 0。"}</p>
      </div>
      <div className={"cols2"}><article><h3>{"门槛，每类都要过"}</h3><SupportList className={"ticks"} items={[
          "质量平均不低于 12/15",
          "用户结果与体验不低于 10.4/13",
          "18 次里至少 15 次完整接受",
          "每道题 3 次里至少过 2 次",
          "安全与正确性门禁全部通过",
        ]} /></article><article><h3>{"效率 6 分怎么比"}</h3><SupportList className={"ticks"} items={[
          "和同样资源的本地参考系统配对比较",
          "比耗时、成本、逻辑 token 三项，各 2 分",
          "失败和超时按预算上限计",
        ]} /></article></div>
    </div>
  </section>;
}

function PlatformBonus() {
  return <section className={"section"} aria-labelledby={"bonus-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"bonus-title"}>{"平台优化加分，最高 20 分"}</h2>
        <p className={"lead"}>{"可选，不参加不影响正式 100 分。在隔离副本上做，独立验收，结果不回填正式分。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "环节" , scope: "col" }, { content: "分值" , scope: "col" }, { content: "交什么" , scope: "col" }]} rows={[
            { cells: [{ content: "A1 定义" , className: "name" }, { content: "3" , className: "pts" }, { content: "目标、范围、风险与成功标准" }] },
            { cells: [{ content: "A2 设计" , className: "name" }, { content: "3" , className: "pts" }, { content: "架构、接口、资源与评测计划" }] },
            { cells: [{ content: "A3 构建" , className: "name" }, { content: "4" , className: "pts" }, { content: "可运行的平台改造与可复用组件" }] },
            { cells: [{ content: "A4 验证" , className: "name" }, { content: "4" , className: "pts" }, { content: "独立复测、对照实验与完整证据" }] },
            { cells: [{ content: "A5 发布与运行" , className: "name" }, { content: "3" , className: "pts" }, { content: "部署、观测、安全与故障恢复" }] },
            { cells: [{ content: "A6 演进与退役" , className: "name" }, { content: "3" , className: "pts" }, { content: "版本、维护、迁移与退出机制" }] },
          ]} />
      </div>
      <p className={"note"}>{"资格门槛：必须实际改变基线，提交可运行的实现，并给出能独立验证的复用证据。"}</p>
    </div>
  </section>;
}

function RuleBoundaries() {
  return <section className={"section"} aria-labelledby={"rules-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"rules-title"}>{"规则边界"}</h2>
        <p className={"lead"}>{"开卷可用智能体工具；正式评测版本封存，平台优化和正式评分隔离。"}</p>
      </div>
      <div className={"cols2"}><article><h3>{"人工可以做的"}</h3><SupportList className={"ticks"} items={[
          "发起统一、留痕的规则澄清",
          "提出停机申请",
        ]} /><h3 style={{"marginTop":"var(--space-xl)"}}>{"人工不能做的"}</h3><SupportList className={"ticks is-no"} items={[
          "代写报告、编辑产出文件、改公式",
          "给解题提示、补齐证据",
        ]} /></article><article><h3>{"诚信红线"}</h3><SupportList className={"ticks is-no"} items={[
          "挖矿、后门",
          "权限绕过、横向访问",
          "篡改评分器、伪造 trace",
          "按任务指纹硬编码",
        ]} /><p className={"note"}>{"严重越权、泄露、伪证，违反在线智能体禁令或保密承诺的队伍，不论分数都不进入任何奖项。封存以后的网络规则："}<span className={"fill"} data-fill={"network-rule"}>{"待定"}</span></p></article></div>
    </div>
  </section>;
}

function PublicMaterials() {
  return <section className={"section"} aria-labelledby={"pub-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"pub-title"}>{"公开材料"}</h2>
        <p className={"lead"}>{"所有队伍同一时间收到，答疑的回答同步给全部队伍。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "材料" , scope: "col" }, { content: "内容" , scope: "col" }, { content: "在哪里" , scope: "col" }]} rows={[
            { cells: [{ content: "参赛手册" , className: "name" }, { content: "参赛须知、接口规范、奖项规则" }, { content: <><span className={"fill"} data-fill={"handbook"}>{"发布后放在这里"}</span></> }] },
            { cells: [{ content: "公开开发集" , className: "name" }, { content: "每类应用至少 3 道练习题，带判分自检" }, { content: <><SupportLink href={"data.html"}>{"数据集"}</SupportLink></> }] },
            { cells: [{ content: "自检工具" , className: "name" }, { content: "参赛队自检工具，对着接口规范检查自己的系统" }, { content: <><SupportLink href={"tools.html"}>{"工具应用"}</SupportLink></> }] },
          ]} />
      </div>
    </div>
  </section>;
}

export function TasksPage() {
  return <SupportFrame title={"比赛任务：GAAC 技术支持"} banner={<>{"这一页按技术规格草案整理，最终以参赛手册为准。"}<SupportLink href={"notices.html"}>{"看公告"}</SupportLink></>}>
    <PageHeader title={"两个阶段，正式分 100"} id={"page-title"} description={<><p className={"lead"}>{"把全栈智能体从“能跑”推进到“可交付、可衡量、可复制”。另有可选的平台优化加分，最高 20 分。"}</p></>} actions={<><SupportLink className={"pill primary"} href={"#week"}>{"看一周怎么过"}</SupportLink><SupportLink className={"pill secondary"} href={"eval.html"}>{"看测评服务"}</SupportLink></>}>{<><div className={"container"}>
  <div className={"figures"}>
    <div><b>{"168 小时"}</b><span>{"每队一个窗口"}</span></div>
    <div><b>{"25 分"}</b><span>{"第一阶段，六项基础考题"}</span></div>
    <div><b>{"75 分"}</b><span>{"第二阶段，三类应用全部必做"}</span></div>
    <div><b>{"+20 分"}</b><span>{"平台优化加分，可选"}</span></div>
  </div>
</div></>}</PageHeader>
    <TeamWeek />
    <FoundationTask />
    <EnterpriseTasks />
    <Scoring />
    <PlatformBonus />
    <RuleBoundaries />
    <PublicMaterials />
  </SupportFrame>;
}

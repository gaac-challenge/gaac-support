import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { Link } from 'react-router-dom';
import { config, stageNames, type Params, type Result, type Risk } from './simulation';

export const anchors = [
  ['overview', '总览'], ['timeline', '时间轴'], ['now', '此刻'], ['log', '推演日志'],
  ['risks', '情景与风险'], ['params', '推演参数'], ['sched', '排期一览'], ['team', '一队的窗口'],
  ['score', '怎么算分'], ['prep', '赛前任务表'], ['register', '风险登记册'], ['notes', '说明'],
] as const;

const navIcons = ['home', 'gantt', 'clock', 'list', 'alert', 'sliders', 'table', 'user', 'score', 'check', 'shield', 'book'];
const navGroups = [{ name: '推演', start: 0, end: 4 }, { name: '设置', start: 4, end: 6 }, { name: '明细', start: 6, end: 12 }];

export function Sidebar({ selected, riskCount, riskHit }: { selected: string; riskCount: number; riskHit: number }) {
  const scenario = config.presets.find(({ id }) => id === selected)?.name ?? (selected === '__dice' ? '随机' : '自定义');
  const [active, setActive] = useState<string>('overview');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-30% 0px -60% 0px' });
    for (const [id] of anchors) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);
  return <aside className="sandbox-side card">
    <div className="sandbox-brand"><span className="sandbox-icon-chip info"><Icon name="gantt" /></span>
      <div><strong>GAAC 沙盘</strong><small>智能体大奖赛 · 全程推演</small></div></div>
    <nav aria-label="推演导航">
      {navGroups.map(({ name, start, end }) => <div className="sandbox-nav-group" key={name}>
        <small>{name}</small>
        {anchors.slice(start, end).map(([id, label], index) => <a key={id} href={'#' + id}
          aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>
          <Icon name={navIcons[start + index]} />{label}
        </a>)}
      </div>)}
      <div className="sandbox-nav-group"><small>相关</small><Link to="/blog"><Icon name="list" />动手笔记 · 一篇一个小问题</Link>
        <Link to="/"><Icon name="infra" />GAAC 技术支持</Link></div>
    </nav>
    <div className="sandbox-side-scenario"><small>当前情景</small><b>{scenario}</b>
      <small>{riskCount ? `${riskCount} 条风险 · ${riskHit} 条触发` : '没有注入风险'}</small></div>
  </aside>;
}

export function Panel({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return <section className="sandbox-section" id={id} aria-labelledby={id + '-title'}>
    <div><h2 id={id + '-title'}>{title}</h2>{description && <p>{description}</p>}</div>{children}
  </section>;
}

function Table({ titles, children }: { titles: string[]; children: ReactNode }) {
  return <div className="sandbox-scroll" tabIndex={0}><table>
    <thead><tr>{titles.map((title) => <th key={title} scope="col">{title}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div>;
}

export function Schedule({ result, select }: { result: Result; select: (index: number) => void }) {
  const { F, event } = result;
  return <div className="card sandbox-card"><Table titles={['队伍', '上机', '转开发期', '封存', '下机', '补时', '节假日', '备注']}>
    {event.slots.map((slot, index) => {
      const empty = slot.kind === 'empty';
      const makeup = event.mk.find((entry) => entry.sl === slot);
      const holidayNames = empty ? [] : result.holidays.filter(({ h }) => h < slot.e && h + 24 > slot.s).map(({ name }) => name);
      const notes = [
        slot.kind === 'standby' && `候补，接 ${slot.L} 队`,
        empty && '赛前退出，空档作缓冲',
        slot.delay > 0 && `比公布的 ${F.dt(slot.ann)} 晚 ${F.dur(slot.delay)}`,
        slot.quit && `第 ${slot.quit.at} 小时退出`,
        slot.moved && `剩余 ${slot.moved.remain} 小时 ${makeup ? F.dt(makeup.a) + ' 起补赛' : '挪到补赛'}`,
        slot.standbyQ && '用备用题',
        slot.degraded && '条件不一致',
        slot.outs.map((outage) => `#${outage.n} 宕机 ${outage.hours}h`).join('、'),
      ].filter(Boolean);
      const date = (hour?: number) => empty || hour == null ? '—' : F.dt(hour);
      return <tr key={slot.L}>
        <td><button className="sandbox-text-button" type="button" disabled={empty} onClick={() => select(index)}><span className="sandbox-team-badge">{slot.who ?? slot.L}</span>{slot.kind === 'standby' ? '候补' : '队'}</button></td>
        <td>{date(slot.s)}</td><td>{date(slot.p1)}</td><td>{date(slot.seal)}</td><td>{date(slot.e)}</td>
        <td>{slot.makeup ? slot.makeup + ' h' : '—'}</td><td>{holidayNames.join(' ') || '—'}</td>
        <td>{notes.join('；') || '—'}</td>
      </tr>;
    })}
  </Table></div>;
}

export function scoringDescription() {
  const total = config.tasks.reduce((sum, task) => sum + task.points, 0);
  return `正式分 ${total} 分，${config.tasks.length} 个任务各 ${config.tasks[0].points} 分；平台优化可选，最高再加 ${config.bonus.max} 分，总分最高 ${total + config.bonus.max}。`;
}

export function Scoring() {
  return <div className="card sandbox-card">
    <div className="sandbox-score-bar" role="img" aria-label={config.tasks.map(({ en, points }) => en + ' ' + points).join('、')}>
      {config.tasks.map(({ id, points }) => <span className={'score-' + id} style={{ flex: points }} key={id} />)}
      <span className="score-opt" style={{ flex: config.bonus.max }} />
    </div>
    <div className="sandbox-score-rows">{config.tasks.map((task) => <div key={task.id}>
      <span className={'sandbox-icon-chip task-' + task.id}><Icon name={task.icon} /></span>
      <div><b>{task.en}</b><small>{task.zh} · {config.phases[task.phase === 1 ? 0 : 1].name}</small></div>
      <strong>{task.points}<small>分</small></strong>
    </div>)}
      <div><span className="sandbox-icon-chip"><Icon name="opt" /></span><div><b>{config.bonus.en}</b>
        <small>{config.bonus.zh} · 可选 · {config.bonus.note}</small></div><strong>≤ {config.bonus.max}<small>分</small></strong></div>
    </div>
    <div className="sandbox-score-notes">
      <div><h4>每类应用 {config.appScore.reduce((sum, [, score]) => sum + score, 0)} 分的构成</h4>
        <div className="sandbox-score-bar" aria-hidden="true">{config.appScore.map(([label, score], index) => <span key={label} className={'score-split-' + index} style={{ flex: score }} />)}</div>
        <p>{config.appScore.map(([name, score]) => `${name} ${score} 分`).join(' · ')}。{config.appScoreNote}</p></div>
      <div><h4>两个阶段的工具边界</h4><p>{config.phases[0].name}（{config.phases[0].tag}）：{config.phases[0].tools}。{config.phases[1].name}：{config.phases[1].tools}。</p></div>
      <div><h4>团队大奖</h4><b>{config.prize.amount}</b><p>{config.prize.count} · {config.prize.note}</p></div>
    </div>
  </div>;
}

export function PrepTasks({ result, params, change, reset }: { result: Result; params: Params; change: (id: string, days: number) => void; reset: () => void }) {
  return <>
    <button type="button" className="pill secondary" onClick={reset}>工期恢复估计值</button>
    <details className="card sandbox-card"><summary><b>全部任务</b><small>{params.scope === 'mvp' ? '最低可用版' : '完整版'} · {result.prep.list.length} 项 · 关键路径 {result.prep.list.filter(({ crit }) => crit).length} 项</small></summary>
      <Table titles={['任务', '负责', '工期（天）', '开始', '完成', '余量', '状态']}>
        {result.prep.list.slice().sort((a, b) => a.es - b.es || a.ef - b.ef).map((task) => <tr key={task.id}>
          <td>{task.name}</td><td>{result.lanes.find(({ id }) => id === task.lane)?.owner}</td>
          <td><div className="sandbox-row sandbox-stepper">
            <button type="button" aria-label="减一天" onClick={() => change(task.id, task.base - 1)}>−</button>
            <input type="number" aria-label={task.name + ' 工期（天）'} min={0} max={60} value={task.base} onChange={(event) => change(task.id, +event.target.value)} />
            <button type="button" aria-label="加一天" onClick={() => change(task.id, task.base + 1)}>+</button>
          </div></td>
          <td>{result.F.day(task.es)}</td><td>{result.F.day(task.ef)}</td><td>{task.slack == null ? '—' : result.F.days(task.slack)}</td><td>{[task.crit && '关键路径', task.gate && (task.gate === 'hard' ? '门禁 · 必须' : '门禁'),
            task.state === 'drop' && '没做完 · 机器被占', task.state === 'late' && '开赛时没做完',
            task.state === 'short' && ('练习期只有 ' + result.F.days(task.leadGot)),
            ...(task.hits ?? []).map((risk) => `#${risk.n} +${risk.days} 天`),
          ].filter(Boolean).join(' · ') || '—'}</td>
        </tr>)}
      </Table>
    </details>
  </>;
}

const riskStageOrder = ['pre', 'in', 'post'];
const register = config.register.slice().sort((a, b) => riskStageOrder.indexOf(a.stage) - riskStageOrder.indexOf(b.stage));

export function registerDescription(risks: Risk[]) {
  const registered = register.filter(({ inject }) => inject);
  const injected = registered.filter(({ inject }) => risks.some(({ type }) => type === inject)).length;
  return `预案第 3–7 节共 ${register.length} 项，其中 ${registered.length} 项可以注入推演${risks.length ? `；本次注入 ${injected} 项` : ''}。`;
}

export function RiskRegister({ risks, inject }: { risks: Risk[]; inject: (type: string) => void }) {
  return <details className="card sandbox-card"><summary><b>预案第 3–7 节的全部风险</b><small>可注入的风险可以直接加进推演</small></summary>
    <Table titles={['阶段', '风险', '怎么应对', '提前准备', '出处', '']}>
      {register.map((risk, index) => {
        const injected = risk.inject ? risks.flatMap(({ type }, index) => type === risk.inject ? [index + 1] : []) : [];
        return <tr key={index} data-injected={injected.length > 0}><td>{stageNames[risk.stage]}</td><th scope="row">{risk.risk}
          {injected.length > 0 && <span className="sandbox-badge critical"> #{injected.join(' #')}</span>}</th>
          <td>{risk.resp}</td><td>{risk.prep}</td><td>{risk.ref}</td>
          <td>{risk.inject ? <button className="pill secondary" type="button" onClick={() => inject(risk.inject!)}>＋ 注入</button> : '只登记'}</td></tr>;
      })}
    </Table>
  </details>;
}

export function Notes({ params }: { params: Params }) {
  return <div className="card sandbox-card">
    <ol>{config.notes.map(({ kind, text }) => <li key={kind}><b>{kind}：</b>{text}</li>)}
      <li><b>当前推演参数：</b>{params.teams} 队，每队 {params.window} 小时（第一阶段 {params.phase1} 小时，第 {params.sealAt} 小时封存），原定 {params.start} {String(params.hour).padStart(2, '0')}:00 开赛，换队间隔 {String(params.gap)} 小时，{params.scope === 'mvp' ? '最低可用版' : '完整版'} Benchmark，{params.launch === 'gate' ? '按启动门禁开赛' : '按日期硬开'}。</li>
    </ol>
    <p>赛制来源：{config.source.label}。预案：<code>{config.doc}</code>。默认场景在 <code>scenario.js</code>，推演规则在 <code>engine.js</code>；页面上调的参数和风险只做临时推演，刷新即回到默认。旧版保留在 <code>v1/</code>、<code>v2/</code>。</p>
  </div>;
}

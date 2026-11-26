import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { config, describeSlot, stageNames, type Params, type Result } from './simulation';

export const anchors = [
  ['overview', '总览'], ['timeline', '时间轴'], ['now', '此刻'], ['log', '推演日志'],
  ['risks', '情景与风险'], ['params', '推演参数'], ['sched', '排期一览'], ['team', '一队的窗口'],
  ['score', '怎么算分'], ['prep', '赛前任务表'], ['register', '风险登记册'], ['notes', '说明'],
] as const;

export function Sidebar() {
  return <aside className="sandbox-side card">
    <strong>GAAC 沙盘</strong><small>智能体大奖赛 · 全程推演</small>
    <nav aria-label="推演导航">
      {anchors.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
      <Link to="/blog">动手笔记 · 一篇一个小问题</Link><Link to="/">GAAC 技术支持</Link>
    </nav>
  </aside>;
}

export function Panel({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return <section className="sandbox-section" id={id} aria-labelledby={id + '-title'}>
    <div><h2 id={id + '-title'}>{title}</h2>{description && <p>{description}</p>}</div>{children}
  </section>;
}

export function Overview({ result, params, children }: { result: Result; params: Params; children: ReactNode }) {
  const { metrics: m, F, stages } = result;
  const days = (index: number) => Math.round((stages[index].b - stages[index].a) / 24);
  const teamCount = ['零','一','两','三','四','五','六','七','八'][params.teams];
  return <section className="sandbox-section" id="overview" aria-labelledby="sandbox-title">
    <p className="sandbox-disclaimer">推演假设，非正式赛程</p><p className="sandbox-eyebrow">{config.eyebrow}</p>
    <h1 id="sandbox-title">{teamCount}支队伍，一台 {config.machineName}。<small>赛前 {days(0)} 天，比赛 {days(1)} 天，再加赛后 90 天。</small></h1>
    <div className="sandbox-overview-grid">
      <div className="card sandbox-card sandbox-start"><span>开赛</span><strong>{F.dt(m.start)}</strong>
        <p>{m.slip > 0 ? '比原定晚 ' + F.dur(m.slip) : '按原定日期'} · 原定 {F.dt(m.planned)} · {params.launch === 'gate' ? '按启动门禁' : '按日期硬开'}</p>
        <dl><div><dt>启动门禁</dt><dd>{F.day(m.gateReady)}</dd></div><div><dt>全部完赛</dt><dd>{F.day(m.eventEnd)}</dd></div><div><dt>赛后第 90 天</dt><dd>{F.day(m.day90 - 24)}</dd></div></dl>
      </div>
      <div className="card sandbox-card sandbox-findings">
        <div><b>启动门禁 {F.day(m.gateReady)} 才满足</b><p>{m.critTxt}</p></div>
        <div><b>{params.teams} 队 {F.day(m.start)} – {F.day(m.eventEnd)} 依次独占 {config.machineName}</b><p>{config.platform}</p></div>
        <div><b>{m.announce == null ? '—' : F.day(m.announce)} 公布成绩，{m.prize == null ? '—' : F.day(m.prize)} 奖金到账</b></div>
        <div><b>{result.risks.length ? `${result.risks.length} 条风险 · ${m.riskHit} 条触发` : '还没有注入风险'}</b><p>在“情景与风险”里选一个情景，或者在顶栏掷骰子。</p></div>
      </div>
    </div>
    <div className="card sandbox-card"><h3>从准备到赛后 90 天</h3>{children}</div>
  </section>;
}

function Table({ titles, children }: { titles: string[]; children: ReactNode }) {
  return <div className="sandbox-scroll" tabIndex={0}><table>
    <thead><tr>{titles.map((title) => <th key={title} scope="col">{title}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div>;
}

export function Schedule({ result, time, select }: { result: Result; time: number; select: (index: number) => void }) {
  const { F, event } = result;
  return <div className="card sandbox-card"><Table titles={['队伍', '上机', '转开发期', '封存', '下机', '补时', '节假日', '备注']}>
    {event.slots.map((slot, index) => {
      const status = describeSlot(result, slot, time);
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
        <td><button className="sandbox-text-button" type="button" disabled={empty} onClick={() => select(index)}>{slot.who ?? slot.L} 队</button></td>
        <td>{date(slot.s)}</td><td>{date(slot.p1)}</td><td>{date(slot.seal)}</td><td>{date(slot.e)}</td>
        <td>{slot.makeup ? slot.makeup + ' h' : '—'}</td><td>{holidayNames.join('、') || '—'}</td>
        <td>{notes.join('；') || status.label}</td>
      </tr>;
    })}
  </Table></div>;
}

export function TeamWindow({ result, params, time, slotIndex, select }: { result: Result; params: Params; time: number; slotIndex: number; select: (index: number) => void }) {
  const slot = result.event.slots[slotIndex] ?? result.event.slots[0];
  if (!slot || slot.kind === 'empty') return null;
  const makeup = result.event.mk.find((entry) => entry.sl === slot);
  const x = (hour: number) => 170 + hour / params.window * 700;
  const tasks = config.tasks;
  let clock = 0;
  if (time >= slot.e) clock = slot.moved?.from ?? slot.quit?.at ?? params.window;
  else while (clock < params.window && (slot.wall?.(clock + 1) ?? slot.s + clock + 1) <= time) clock++;
  if (makeup && slot.moved && time >= makeup.a) clock = Math.min(params.window, slot.moved.from + time - makeup.a);
  return <>
    <div className="sandbox-row" role="group" aria-label="选择队伍">{result.event.slots.map((entry, index) =>
      <button className="pill secondary" key={entry.L} type="button" disabled={entry.kind === 'empty'} aria-pressed={slotIndex === index} onClick={() => select(index)}>{entry.who ?? entry.L} 队</button>)}</div>
    <div className="card sandbox-card"><h3>{slot.who} 队 · {result.F.dt(slot.s)} – {result.F.dt(slot.e)}</h3>
      <p>第 {Math.floor(clock)} 小时 · 补时 {slot.makeup} 小时 · 损失 {slot.lost} 小时</p>
      <div className="sandbox-scroll"><svg className="sandbox-gantt" viewBox={`0 0 890 ${80 + tasks.length * 38}`} aria-label="一队的窗口">
        <rect className="stage-pre" x="170" y="8" width={x(params.phase1) - 170} height="22" />
        <rect className="stage-in" x={x(params.phase1)} y="8" width={x(params.sealAt) - x(params.phase1)} height="22" />
        <rect className="stage-post" x={x(params.sealAt)} y="8" width={x(params.window) - x(params.sealAt)} height="22" />
        {[0, params.phase1, params.sealAt, params.window].map((hour) => <text key={hour} x={x(hour)} y="47" textAnchor="middle">{hour}h</text>)}
        {tasks.map((task, index) => <g className="gantt-bar" key={task.id} transform={`translate(0 ${58 + index * 38})`}><text x="5" y="18">{task.en}</text>
          <rect x={x(task.phase === 1 ? 0 : params.phase1)} y="2" width={task.phase === 1 ? x(params.phase1) - x(0) : x(params.window) - x(params.phase1)} height="22" rx="5" /></g>)}
        {slot.outs.map((entry, index) => <rect className="gantt-outage" key={index} x={x(entry.at)} width={Math.max(2, x(Math.min(params.window, entry.at + entry.hours)) - x(entry.at))} y="54" height={tasks.length * 38}><title>{entry.cause}</title></rect>)}
        <line className="sandbox-playhead" x1={x(clock)} x2={x(clock)} y1="1" y2={72 + tasks.length * 38} />
      </svg></div>
    </div>
  </>;
}

export function Scoring() {
  const total = config.tasks.reduce((sum, task) => sum + task.points, 0);
  return <div className="card sandbox-card">
    <p>正式分 {total} 分，{config.tasks.length} 个任务各 {config.tasks[0].points} 分；平台优化可选，最高再加 {config.bonus.max} 分，总分最高 {total + config.bonus.max}。</p>
    <ul>{config.tasks.map((task) => <li key={task.id}><b>{task.en}</b> · {task.zh} · {config.phases[task.phase === 1 ? 0 : 1].name} · {task.points} 分</li>)}
      <li><b>{config.bonus.en}</b> · {config.bonus.zh} · 可选 · {config.bonus.note} · ≤ {config.bonus.max} 分</li></ul>
    <h3>每类应用 {config.appScore.reduce((sum, [, score]) => sum + score, 0)} 分的构成</h3>
    <p>{config.appScore.map(([name, score]) => `${name} ${score} 分`).join(' · ')}。{config.appScoreNote}</p>
    <h3>两个阶段的工具边界</h3>
    {config.phases.map((phase) => <p key={phase.name}>{phase.name}（{phase.tag}）：{phase.tools}。</p>)}
    <h3>团队大奖</h3><p>{config.prize.amount} · {config.prize.count} · {config.prize.note}</p>
  </div>;
}

export function PrepTasks({ result, change, reset }: { result: Result; change: (id: string, days: number) => void; reset: () => void }) {
  return <>
    <button type="button" className="pill secondary" onClick={reset}>工期恢复估计值</button>
    <details className="card sandbox-card"><summary>全部任务 · {result.prep.list.length} 项</summary>
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

export function RiskRegister({ inject }: { inject: (type: string) => void }) {
  return <details className="card sandbox-card" open><summary>预案第 3–7 节的全部风险 · 可注入的风险可以直接加进推演</summary>
    <Table titles={['阶段', '风险', '怎么应对', '提前准备', '出处', '']}>
      {config.register.map((risk, index) => <tr key={index}><td>{stageNames[risk.stage]}</td><th scope="row">{risk.risk}</th>
        <td>{risk.resp}</td><td>{risk.prep}</td><td>{risk.ref}</td><td>{risk.inject ? <button className="pill secondary" type="button" onClick={() => inject(risk.inject!)}>＋ 注入</button> : '只登记'}</td></tr>)}
    </Table>
  </details>;
}

export function Notes({ params }: { params: Params }) {
  return <div className="card sandbox-card">
    <ol>{config.notes.map(({ kind, text }) => <li key={kind}><b>{kind}：</b>{text}</li>)}
      <li><b>当前推演参数：</b>{params.teams} 队，每队 {params.window} 小时（第一阶段 {params.phase1} 小时，第 {params.sealAt} 小时封存），原定 {params.start} {String(params.hour).padStart(2, '0')}:00 开赛，换队间隔 {String(params.gap)} 小时，{params.scope === 'mvp' ? '最低可用版' : '完整版'} Benchmark，{params.launch === 'gate' ? '按启动门禁开赛' : '按日期硬开'}。</li>
    </ol>
    <p>赛制来源：{config.source.label}。预案：<code>{config.doc}</code>。默认场景在 <code>scenario.js</code>，推演规则在 <code>engine.js</code>；页面上调的参数和风险只做临时推演，刷新即回到默认。</p>
  </div>;
}

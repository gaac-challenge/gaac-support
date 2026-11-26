import { estimateText } from './Gantt';
import { Icon } from './icons';
import { clockOf, config, slotState, type Params, type Result } from './simulation';

export function TeamWindow({ result, params, time, slotIndex, select }: { result: Result; params: Params; time: number; slotIndex: number; select: (index: number) => void }) {
  const slot = result.event.slots[slotIndex] ?? result.event.slots.find(({ kind }) => kind !== 'empty');
  const buttons = <div className="sandbox-row" role="group" aria-label="选择队伍">{result.event.slots.map((entry, index) =>
    <button className="pill secondary" key={entry.L} type="button" title={entry.kind === 'empty' ? entry.L + ' 队空档' : entry.who + ' 队'}
      disabled={entry.kind === 'empty'} aria-pressed={slotIndex === index} onClick={() => select(index)}>{entry.who}</button>)}</div>;
  if (!slot || slot.kind === 'empty') return <>{buttons}<div className="card sandbox-card"><h3>没有队伍上机。</h3></div><TaskCards params={params} /></>;
  const { F } = result;
  const state = slotState(result, slot, time);
  const makeup = result.event.mk.find(({ sl }) => sl === slot);
  const active = ['p1', 'dev', 'formal', 'out', 'mk'].includes(state.kind);
  const clock = active ? state.kind === 'mk' && slot.moved && makeup ? slot.moved.from + time - makeup.a : clockOf(slot, time, params.window)
    : ['done', 'quit'].includes(state.kind) ? slot.quit?.at ?? params.window : 0;
  const status = state.kind === 'wait' ? `等待上机，还有 ${F.dur(slot.s - time)}` : state.kind === 'mk' ? '补赛中'
    : active ? `进行中 · 第 ${clockOf(slot, time, params.window)} 小时`
    : state.kind === 'mkwait' ? '等补赛' : state.kind === 'quit' ? '已退出' : '已完成';
  const width = 1060, left = 236, right = 24, top = 60, rowHeight = 46;
  const bottom = top + (config.tasks.length + 1) * rowHeight;
  const x = (hour: number) => left + hour / params.window * (width - left - right);
  const wall = (hour: number) => makeup && slot.moved && hour > slot.moved.from ? makeup.a + hour - slot.moved.from : slot.wall?.(hour) ?? slot.s + hour;
  const step = params.window <= 240 ? 24 : params.window <= 480 ? 48 : 96;
  const ticks = Array.from({ length: Math.floor(params.window / step) + 1 }, (_, i) => i * step);
  const finalTick = ticks.at(-1)!;
  if (finalTick !== params.window) {
    if (x(params.window) - x(finalTick) < 40) ticks.pop();
    ticks.push(params.window);
  }
  const bands = [
    { a: 0, b: params.phase1, label: config.phases[0].name + ' · 开卷' },
    { a: params.phase1, b: params.sealAt, label: '开发期' },
    { a: params.sealAt, b: params.window, label: '正式评测 · 组委会运行' },
  ];
  const line = x(Math.min(params.window, clock)), lineLabel = `现在 ${Math.floor(clock)}h`;
  const labelWidth = estimateText(lineLabel, 10.5) + 16, labelPosition = Math.min(Math.max(line - labelWidth / 2, left), width - right - labelWidth);
  return <>
    <div className="sandbox-team-controls"><p>{result.event.played.length} 队的结构相同，只是日期依次后移。横轴是这一队自己的比赛时钟；平台故障补时期间时钟停走，所以补时的宕机画成一条细线。</p>{buttons}</div>
    <div className="card sandbox-card">
      <div><h3>{slot.who} 队{slot.kind === 'standby' && `（候补，接 ${slot.L} 队）`} · {status}</h3>
        <p>{F.long(slot.s)} → {F.long(slot.e)}{makeup && '，补赛到 ' + F.dt(makeup.b)}</p></div>
      <div className="sandbox-scroll" tabIndex={0}><svg className="sandbox-gantt detail" viewBox={`0 0 ${width} ${bottom + 42}`} role="img" aria-label={`${slot.who} 队 ${params.window} 小时窗口`}>
        {bands.map(({ a, b, label }, i) => <g key={label}>
          <rect className={'detail-band detail-band-' + i} x={x(a) + 1.5} y="6" width={Math.max(1, x(b) - x(a) - 3)} height="24" rx="6" />
          {x(b) - x(a) > estimateText(label, 11.5) + 17 && <text className="detail-band-label" x={x(a) + 10} y="22">{label}</text>}
        </g>)}
        {ticks.map((hour) => <g key={hour} textAnchor={hour === 0 ? 'start' : hour === params.window ? 'end' : 'middle'}>
          <line className="grid" x1={x(hour)} x2={x(hour)} y1={top - 6} y2={bottom} />
          <text className="t-d" x={x(hour)} y={bottom + 16}>{hour}h</text>
          <text className="t-d" x={x(hour)} y={bottom + 31}>{slot.quit && hour > slot.quit.at ? '' : F.day(wall(hour))}</text>
        </g>)}
        {[params.phase1, params.sealAt].map((hour) => <line key={hour} className="detail-stage-line" x1={x(hour)} x2={x(hour)} y1={top - 6} y2={bottom} />)}
        {config.tasks.map((task, index) => {
          const cy = top + index * rowHeight + rowHeight / 2;
          const [a, b] = task.phase === 1 ? [0, params.phase1] : [params.phase1, params.window];
          const done = Math.min(b, Math.max(a, clock));
          return <g key={task.id}>
            <rect className={'chart-task chart-task-' + task.id} x="14" y={cy - 12} width="24" height="24" rx="7" />
            <use href={'#i-' + task.icon} x="19" y={cy - 7} width="14" height="14" />
            <text className="nm" x="48" y={cy - 2}>{task.en}</text><text className="nm-s" x="48" y={cy + 14}>{task.zh} · {task.points} 分</text>
            <rect className="trk" x={x(a) + 1.5} y={cy - 8} width={Math.max(1, x(b) - x(a) - 3)} height="16" rx="5" />
            {done > a && <rect className="el2" x={x(a) + 1.5} y={cy - 8} width={Math.max(0, x(done) - x(a) - 3)} height="16" rx="5" />}
            {task.phase !== 1 && <line className="detail-seal-line" x1={x(params.sealAt)} x2={x(params.sealAt)} y1={cy - 8} y2={cy + 8} />}
          </g>;
        })}
        <g transform={`translate(0 ${top + config.tasks.length * rowHeight + rowHeight / 2})`}>
          <rect className="opt" x="14" y="-12" width="24" height="24" rx="7" /><use href="#i-opt" x="19" y="-7" width="14" height="14" />
          <text className="nm" x="48" y="-2">{config.bonus.en}</text><text className="nm-s" x="48" y="14">{config.bonus.zh} · 可选，最高 +{config.bonus.max}</text>
          <rect className="opt" x={x(params.phase1) + 2} y="-9" width={Math.max(0, x(params.window) - x(params.phase1) - 4)} height="18" rx="6" />
        </g>
        {slot.quit && <g><rect className="void" x={x(slot.quit.at)} y={top - 6} width={Math.max(0, x(params.window) - x(slot.quit.at))} height={bottom - top + 6} opacity=".85" />
          <text className="detail-alert" x={x(slot.quit.at) + 8} y={top + 8}>退出 · 剩余 {slot.quit.voidH} 小时作废</text></g>}
        {slot.moved && <text className="detail-alert" x={x(slot.moved.from) + 8} y={top + 8}>
          {makeup ? `之后的部分在补赛窗口完成（${F.dt(makeup.a)} 起）` : '剩余时间挪到补赛窗口'}
        </text>}
        {slot.outs.map((outage) => {
          const thin = outage.comp || outage.move || outage.cause === 'degraded';
          return <g key={outage.n}><rect className={`out ${outage.cause === 'degraded' ? 'deg' : ''}`} x={x(outage.at) - (thin ? 1.5 : 0)}
            width={thin ? 3 : Math.max(3, x(outage.at + outage.hours) - x(outage.at))} y={top - 6} height={bottom - top + 6} opacity={thin ? 1 : .5} />
            <text className="detail-alert" x={x(outage.at) + 6} y={bottom - 6}>
              #{outage.n} 宕机 {outage.hours}h · {outage.move ? '挪补赛' : outage.comp ? '补时' : outage.cause === 'degraded' ? '降配' : '不补'}
            </text></g>;
        })}
        {active && <g><line className="phl" x1={line} x2={line} y1={top - 8} y2={bottom} />
          <rect className="php" x={labelPosition} y={top - 28} width={labelWidth} height="18" rx="9" />
          <text className="pht" x={labelPosition + labelWidth / 2} y={top - 15.5} textAnchor="middle">{lineLabel}</text></g>}
      </svg></div>
    </div>
    <TaskCards params={params} />
  </>;
}

function TaskCards({ params }: { params: Params }) {
  return <div className="sandbox-task-cards">
    {config.tasks.map((task) => <article className="card sandbox-card" key={task.id}>
      <div className="sandbox-task-heading"><span className={'sandbox-icon-chip task-' + task.id}><Icon name={task.icon} /></span>
        <div><b>{task.en}</b><small>{task.zh}</small></div></div>
      <div className="sandbox-life-title"><small>{task.phase === 1 ? `${config.phases[0].name} · 0–${params.phase1}h`
        : `${config.phases[1].name} · ${params.phase1}–${params.window}h`}</small><b>{task.points} 分</b></div>
      <dl><div><dt>交付</dt><dd>{task.deliver}</dd></div><div><dt>验收要点</dt><dd>{task.check}</dd></div></dl>
    </article>)}
  </div>;
}

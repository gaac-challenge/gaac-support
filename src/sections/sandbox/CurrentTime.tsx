import { BigDate } from './Overview';
import { Icon } from './icons';
import { atStage, clamp, clockOf, config, describeSlot, stamp, stageNames, type Params, type Result } from './simulation';

function machineAt(result: Result, params: Params, time: number) {
  const { event, F } = result;
  const active = event.played.find(({ s, e }) => time >= s && time < e);
  if (active) {
    const outage = active.outs.find(({ a, b }) => time >= a && time < b);
    const phase = active.seal != null && time >= active.seal ? '正式评测' : active.p1 != null && time >= active.p1 ? '开发期' : config.phases[0].name;
    const text = outage ? `#${outage.n} 宕机中，${outage.comp ? '停表，补等长时间' : outage.move ? '剩余时间挪到补赛窗口' : '不补时'}。`
      : phase === config.phases[0].name ? `${config.tasks.filter((task) => task.phase === 1).map(({ en }) => en).join('、')} · 已用 ${clockOf(active, time, params.window)} / ${params.phase1} 小时`
      : phase === '开发期' ? `${config.tasks.filter((task) => task.phase !== 1).length} 类应用并行 · ${F.dur((active.seal ?? active.e) - time)}后封存`
      : `组委会运行，断网考场 · ${F.dur(active.e - time)}后下机`;
    return { tone: outage ? 'critical' : 'info', title: `${active.who} 队 · ${phase}`, text };
  }
  const outage = event.played.flatMap((slot) => slot.outs.map((out) => ({ ...out, who: slot.who }))).find(({ a, b }) => time >= a && time < b);
  if (outage) return { tone: 'critical', title: `${outage.who} 队长时间宕机`, text: `#${outage.n} 修复中，剩余时间挪到补赛窗口。` };
  const makeup = event.mk.find(({ ra, b }) => time >= ra && time < b);
  if (makeup) return { tone: 'info', title: `${makeup.sl.who} 队补赛`,
    text: time < makeup.a ? '从归档恢复现场中。' : `补剩余的 ${makeup.sl.moved?.remain} 小时，${F.dur(makeup.b - time)}后结束。` };
  const handover = event.played.find(({ ho }) => ho && time >= ho.a && time < ho.b);
  if (handover) {
    const next = event.slots.find(({ i, kind }) => kind !== 'empty' && i > handover.i);
    return { tone: '', title: next ? `换队交接：${handover.who} → ${next.who}` : `${handover.who} 队下机后归档`,
      text: config.handover + '。' + (next ? `${F.dur(next.s - time)}后 ${next.who} 队上机。` : '') };
  }
  const empty = event.slots.find(({ kind, s, e }) => kind === 'empty' && time >= s && time < e);
  if (empty) return { tone: 'warning', title: `${empty.L} 队的空档`, text: '赛前退出，候补没补上，作缓冲。' };
  const prep = result.prep.list.find((task) => task.lane === 'pod' && task.durH > 0 && time >= task.es && time < task.ef && task.state !== 'drop');
  if (prep) return { tone: '', title: prep.name, text: prep.note || '赛前，机器上的准备。' };
  const post = result.post.list.find((task) => task.lane === 'pod' && time >= task.es && time < task.ef);
  if (post) return { tone: '', title: post.name, text: post.note || '' };
  if (event.pause && time >= event.pause[0] && time < event.pause[1]) return { tone: '', title: '节前停赛', text: '这段时间不排队伍。' };
  const acceptance = result.prep.list.find(({ id }) => id === 'pod_accept');
  if (acceptance && time < acceptance.es) return { tone: '', title: '还没到位', text: F.day(acceptance.es) + ' 到位验收。' };
  if (time >= result.stages[2].a) return { tone: '', title: '赛后空闲', text: '可以作 Testbed。' };
  return { tone: '', title: '空闲', text: time >= result.stages[1].a ? '等下一队上机。' : '' };
}

export function CurrentTime({ result, params, time }: { result: Result; params: Params; time: number }) {
  const { metrics: m, F, stages, event } = result;
  const stage = atStage(result, time);
  const dayIndex = (start: number) => Math.floor((time - start) / 24) + 1;
  const detail = stage === 'pre' ? `赛前第 ${dayIndex(Math.floor(stages[0].a / 24) * 24)} 天 · 距开赛 ${F.dur(m.start - time)}`
    : stage === 'in' ? `开赛第 ${dayIndex(Math.floor(m.start / 24) * 24)} 天 · 第 ${Math.floor(time - m.start)} / ${Math.round(m.eventEnd - m.start)} 小时`
    : time >= stages[2].b ? '赛后 90 天计划已走完' : `赛后第 ${dayIndex(m.dayOne)} 天 · ${result.post.bands.find(({ a, b }) => time >= a && time < b)?.name ?? ''}`;
  const machine = machineAt(result, params, time);
  const visible = result.items.filter((item) => item.b !== undefined && time >= item.a && time < item.b);
  const work = visible.filter(({ kind, lane, id }) => kind === 'bar' && lane !== 'pod' && !id?.startsWith('review'))
    .map(({ lane, label }) => ({ owner: result.lanes.find(({ id }) => id === lane)?.name, label }));
  const reviewing = visible.filter(({ id }) => id?.startsWith('review'));
  if (reviewing.length) work.push({ owner: '评审与复现', label: reviewing.map(({ label }) => label).join('、') });
  const next = result.items.filter(({ kind, a, cls }) => kind === 'ms' && a > time && !cls?.includes('ghost'))
    .sort((a, b) => a.a - b.a || Number(!!b.cls?.includes('key')) - Number(!!a.cls?.includes('key')))[0];
  const recent = result.log.filter(({ kind, h }) => ['risk', 'warn', 'resp'].includes(kind) && h <= time && h > time - 72).slice(-3);
  return <div className="sandbox-overview-grid">
    <div className="card sandbox-card sandbox-now">
      <small>时间轴所在时刻 · {stageNames[stage]}</small>
      <strong className="sandbox-current-date"><BigDate result={result} hour={time} withHour={stage === 'in'} /></strong>
      <small>{detail}</small>
      <div className="sandbox-now-list">
        <div><span className={'sandbox-icon-chip ' + machine.tone}><Icon name="infra" /></span>
          <div><b>{machine.title}</b><p>{machine.text}</p></div><span className="sandbox-badge">{config.machineName}</span></div>
        {work.length > 0 && <div><Icon name="people" /><div><b>各组在做</b><ul>{work.slice(0, 6).map(({ owner, label }, i) =>
          <li key={i}><span>{owner}</span>{label}</li>)}</ul></div></div>}
        {recent.length > 0 && <div><Icon name="alert" /><div><b>最近 3 天</b><ul>{recent.map(({ n, title }, i) =>
          <li key={i}>{n ? <span>#{n} </span> : null}{title.replace(/^#\d+\s*/, '')}</li>)}</ul></div></div>}
        {next && <div><Icon name="flag" /><div><b>{next.label}</b><p>下一个节点 · {stamp(result, next.a)}</p></div>
          <span className="sandbox-badge info">还有 {F.dur(next.a - time)}</span></div>}
      </div>
    </div>
    <div className="card sandbox-card"><div className="sandbox-life-title"><h3>各队</h3><small>{event.slots.length} 个窗口，按上机顺序</small></div>
      <ul className="sandbox-ledger">{event.slots.map((slot) => {
        const status = describeSlot(result, slot, time), makeup = event.mk.find(({ sl }) => sl === slot);
        const played = slot.kind === 'empty' || time < slot.s ? 0 : makeup && slot.moved && time >= makeup.a
          ? slot.moved.from + Math.min(time, makeup.b) - makeup.a : clockOf(slot, Math.min(time, slot.e), params.window);
        const flags = result.flags.filter(({ team, h }) => team === slot.L && h <= time);
        return <li key={slot.L}>
          <span className="sandbox-avatar">{slot.who}</span>
          <div><b>{slot.who} {slot.kind === 'standby' ? <>候补 <span className="sandbox-badge">接 {slot.L} 队</span></> : '队'}<span className="sandbox-badge">{status.label}</span></b>
            <small>{status.note}</small>
            {flags.map((flag) => <span key={flag.n} className="sandbox-badge warning">#{flag.n} {result.risks[flag.n - 1]?.effect || flag.title}</span>)}
          </div>
          <div className="sandbox-ledger-progress"><div className="sandbox-meter" aria-hidden="true">
            <span style={{ flex: params.phase1 }}><i style={{ width: clamp(played / params.phase1, 0, 1) * 100 + '%' }} /></span>
            <span style={{ flex: params.window - params.phase1 }}><i style={{ width: clamp((played - params.phase1) / (params.window - params.phase1), 0, 1) * 100 + '%' }} /></span>
          </div><div className="sandbox-row">{config.tasks.map((task) => <span key={task.id} className={'sandbox-icon-chip task-' + task.id}><Icon name={task.icon} /></span>)}</div></div>
          <span>{slot.kind === 'empty' ? '—' : <>{Math.min(params.window, played)}<small>/ {params.window} h</small></>}</span>
        </li>;
      })}</ul>
    </div>
  </div>;
}

import type { ReactNode } from 'react';
import { config, type Params, type Result } from './simulation';
import { Icon } from './icons';

export function BigDate({ result, hour, withHour }: { result: Result; hour: number; withHour?: boolean }) {
  const date = result.F.D(hour);
  return <>{date.getUTCMonth() + 1}月{date.getUTCDate()}日{withHour && <sup>{String(date.getUTCHours()).padStart(2, '0')}:00</sup>}</>;
}

export function Overview({ result, baseline, params, children }: {
  result: Result; baseline: Result; params: Params; children: ReactNode;
}) {
  const { metrics: m, F, stages, event, holidays, risks, disputes } = result;
  const base = baseline.metrics;
  const days = (index: number) => Math.round((stages[index].b - stages[index].a) / 24);
  const teamCount = ['零','一','两','三','四','五','六','七','八'][params.teams];
  const holidaysDuringPlay = holidays.filter(({ h }) => h + 12 >= m.start && h + 12 < m.eventEnd).map(({ h, name }) => {
    const team = event.played.find(({ s, e }) => h + 12 >= s && h + 12 < e);
    return name + (team ? `落在 ${team.who} 队窗口` : '时机器空闲');
  });
  const difference = (current: number | null, previous: number | null) =>
    risks.length && current != null && previous != null && Math.abs(current - previous) >= 1
      ? <span className="sandbox-badge warning">比无风险{current > previous ? '晚' : '早'} {F.dur(Math.abs(current - previous))}</span> : null;
  const findings = [
    { icon: 'flag', tone: m.slip > 0 || m.unfinished ? 'warning' : 'good',
      title: m.slip > 0 ? `启动门禁 ${F.day(m.gateReady)} 才满足` : m.unfinished ? `硬开，${m.unfinished} 项准备没做完` : '启动门禁按时满足',
      detail: `卡住开赛的是这条线：${m.critTxt}。` },
    { icon: 'infra', tone: m.over > 0 ? 'warning' : 'info',
      title: `${event.played.length} 队 ${F.day(m.start)} – ${F.day(m.eventEnd)} 依次独占 ${config.machineName}`,
      detail: (holidaysDuringPlay.length ? holidaysDuringPlay.join('，') + '。' : '') + (m.over > 0 ? `比公布的赛程晚 ${F.dur(m.over)}结束。` : '按公布的赛程结束。') },
    { icon: 'check', tone: m.prizeExt ? 'warning' : 'info',
      title: `${m.announce == null ? '—' : F.day(m.announce)} 公布成绩，${m.prize == null ? '—' : F.day(m.prize)} 奖金到账`,
      detail: m.prizeExt ? `奖金发放撞上春节，顺延 ${F.days(m.prizeExt)}。` : '赛后流程顺利。' },
    { icon: 'alert', tone: disputes.some(({ star }) => star) ? 'critical' : risks.length ? 'warning' : 'info',
      title: risks.length ? `注入 ${risks.length} 条风险，${m.riskHit} 条触发` : '还没有注入风险',
      detail: risks.length ? `引出 ${disputes.length} 类可能的争执${m.riskDead ? `；${m.riskDead} 条没生效` : ''}。` : '在“情景与风险”里选一个情景，或者在顶栏掷骰子。' },
  ];
  const postDay = (hour: number) => `赛后第 ${Math.floor((hour - m.dayOne) / 24) + 1} 天`;
  const stats = [
    { label: '全部完赛', value: F.day(m.eventEnd), note: m.over > 0 ? `比公布晚 ${F.dur(m.over)}` : '按公布的赛程', delta: difference(m.eventEnd, base.eventEnd) },
    { label: '比赛', value: <>{days(1)}<small>天</small></>, note: `${event.played.length} 队 × ${params.window} 小时` },
    { label: '公布成绩', value: m.announce == null ? '—' : F.day(m.announce), note: m.announce == null ? '' : postDay(m.announce), delta: difference(m.announce, base.announce) },
    { label: '奖金到账', value: m.prize == null ? '—' : F.day(m.prize), note: m.prizeExt ? `遇春节顺延 ${F.days(m.prizeExt)}` : m.prize == null ? '' : postDay(m.prize), delta: difference(m.prize, base.prize) },
    { label: '补时 / 作废', value: <>{m.makeupH}<small>/ {m.voidH + m.emptyH} 小时</small></>, note: [
      m.delayedN ? `${m.delayedN} 队晚开表` : '', m.movedN ? `${m.movedN} 队补赛` : '', m.standbyN ? `${m.standbyN} 支候补` : '',
    ].filter(Boolean).join(' · ') || '没有补时和空档' },
    { label: '可能的争执', value: <>{disputes.length}<small>类</small></>, note: disputes.some(({ star }) => star)
      ? `★ ${disputes.filter(({ star }) => star).length} 类最容易闹大` : disputes.length ? '预案 §5' : '没有' },
  ];
  return <section className="sandbox-section" id="overview" aria-labelledby="sandbox-title">
    <p className="sandbox-eyebrow">{config.eyebrow}</p>
    <h1 id="sandbox-title">{params.teams === 1 ? '一支队伍' : teamCount + '支队伍'}，一台 {config.machineName}。<small>赛前 {days(0)} 天，比赛 {days(1)} 天，再加赛后 90 天。</small></h1>
    <div className="sandbox-overview-grid">
      <div className="card sandbox-card sandbox-start"><span>开赛</span><strong><BigDate result={result} hour={m.start} withHour /></strong>
        <div className="sandbox-row">
          <span className={'sandbox-badge ' + (m.slip > 0 || m.unfinished ? 'warning' : 'good')}>
            {m.slip > 0 ? `比原定晚 ${F.dur(m.slip)}` : m.unfinished ? `按期，${m.unfinished} 项没做完` : '按原定日期'}
          </span>
          {difference(m.start, base.start)}<span>原定 {F.dt(m.planned)} · {params.launch === 'gate' ? '按启动门禁' : '按日期硬开'}</span>
        </div>
        <dl><div><dt>启动门禁</dt><dd>{F.day(m.gateReady)}</dd></div><div><dt>全部完赛</dt><dd>{F.day(m.eventEnd)}</dd></div><div><dt>赛后第 90 天</dt><dd>{F.day(m.day90 - 24)}</dd></div></dl>
      </div>
      <div className="card sandbox-findings">
        {findings.map(({ icon, tone, title, detail }) => <div key={icon} className="sandbox-finding">
          <span className={'sandbox-icon-chip ' + tone}><Icon name={icon} /></span><div><b>{title}</b><p>{detail}</p></div>
        </div>)}
      </div>
    </div>
    <dl className="card sandbox-stats">{stats.map(({ label, value, note, delta }) => <div key={label}>
      <dt>{label}</dt><dd>{value}</dd><small>{note}{delta}</small>
    </div>)}</dl>
    {children}
  </section>;
}

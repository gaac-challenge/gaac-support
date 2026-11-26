import { useRef, useState, type PointerEvent } from 'react';
import { atStage, clamp, config, stamp, stageNames, todayHour, type Params, type Result, type Stage } from './simulation';
import { Gantt, timelineDomain } from './Gantt';
import { Icon } from './icons';

function fraction(event: PointerEvent<Element>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
}

export const timelineNotes = {
  pre: '工期是估计值，在“赛前任务表”里可以改。',
  in: '红块是宕机，点状条是换队交接，橙色虚框是比公布时间晚开表的部分，窗口下的细条是评审。',
  post: '赛后步骤都从早上开工。',
};

export function Band({ result, stage = 'pre', time, seek }: { result: Result; stage?: Stage; time: number; seek: (hour: number) => void }) {
  const { F, metrics: m, stages, post, holidays, flags, blackout } = result;
  const start = stages[0].a, end = stages[2].b;
  const segments = [...stages.slice(0, 2), ...post.bands.map((entry) => ({ ...entry, id: 'post' as const }))];
  const x = (hour: number) => (hour - start) / (end - start) * 100;
  const drag = useRef(false);
  const move = (event: PointerEvent<SVGSVGElement>) => seek(start + fraction(event) * (end - start));
  const months = [];
  for (let day = Math.ceil(start / 24) * 24; day < end; day += 24) {
    const date = F.D(day);
    if (date.getUTCDate() === 1) months.push({ at: day, text: (date.getUTCFullYear() !== F.y0 ? date.getUTCFullYear() + '/' : '') + (date.getUTCMonth() + 1) + '月' });
  }
  const placed: number[] = [];
  const today = todayHour(result);
  const holidayNote = (a: number, b: number) => {
    const names = holidays.filter(({ h }) => h < b && h + 24 > a).map(({ name, h }) => name + ' ' + F.day(h));
    return names.length ? '经过' + names.join('、') + '。' : '';
  };
  const riskNote = (stage: Stage) => {
    const count = flags.filter(({ h }) => atStage(result, h) === stage).length;
    return count ? ` ${count} 条风险。` : '';
  };
  const legs: { name: string; when: string; note: string; holiday?: string; detail?: string }[] = [
    { name: '赛前准备', when: `${F.day(start)} – ${F.day(m.start - 1)}`,
      note: `${Math.round((m.start - start) / 24)} 天，启动门禁 ${F.day(m.gateReady)} 满足。` + riskNote('pre') },
    { name: `比赛 · ${result.event.played.length} 队`, when: `${F.day(m.start)} – ${F.day(m.eventEnd - 1)}`,
      note: F.dur(m.eventEnd - m.start) + '。' + riskNote('in'), holiday: holidayNote(m.start, m.eventEnd) },
    ...config.postEvent.map((entry, i) => ({ name: entry.name, when: `${F.day(post.bands[i].a)} – ${F.day(post.bands[i].b - 24)}`,
      note: i === 0 ? (m.announce != null ? F.day(m.announce) + ' 公布成绩。' : '') + riskNote('post')
        : i === 1 && m.prize != null ? F.day(m.prize) + ' 奖金到账。' : '',
      holiday: holidayNote(post.bands[i].a, post.bands[i].b), detail: entry.note })),
  ];
  return <div className="card sandbox-card sandbox-life">
    <div className="sandbox-life-title"><h3>从准备到赛后 90 天</h3><small>{F.day(start)} → {F.day(end - 24)} · 点或拖这条带子跳到任一时刻</small></div>
    <div className="sandbox-band">
      <svg viewBox="0 0 900 48" preserveAspectRatio="none" aria-label="全程时间带，点击或拖动跳到任一时刻"
        onPointerDown={(event) => { if (event.button !== 0 && event.button !== undefined) return; drag.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); move(event); }}
        onPointerMove={(event) => { if (drag.current) move(event); }}
        onLostPointerCapture={() => { drag.current = false; }} onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}>
        {segments.map(({ id, a, b }, index) => <rect key={index} className={`life-segment life-${index} ${id === stage ? 'selected' : ''}`} x={x(a) * 9}
          y="10" width={Math.max(0, (x(b) - x(a)) * 9 - 3)} height="30" rx="4" />)}
        {[...holidays.map(({ h }) => ({ h, duration: 24 })), ...(blackout ? [{ h: blackout.a, duration: blackout.b - blackout.a }] : [])]
          .filter(({ h }) => h >= start && h <= end).map(({ h, duration }, i) =>
            <rect key={i} className="hol" x={x(h) * 9} y="10" width={Math.max(2.7, x(h + duration) * 9 - x(h) * 9)} height="30" />)}
        {today >= start && today <= end && <line className="today" x1={x(today) * 9} x2={x(today) * 9} y1="6" y2="44"><title>今天</title></line>}
        <line className="sandbox-playhead" x1={x(time) * 9} x2={x(time) * 9} y1="5" y2="45" />
      </svg>
      {flags.filter(({ h }) => h >= start && h <= end).map(({ h, n, sev, title }) => {
        let at = x(h);
        while (placed.some((value) => Math.abs(value - at) < 1.8)) at += 1.8;
        placed.push(at);
        return <span key={n} className={'sandbox-life-flag ' + sev} style={{ left: at + '%' }} title={`#${n} ${title}`}>{n}</span>;
      })}
      {months.map(({ at, text }) => <span className="sandbox-life-month" key={at} style={{ left: x(at) + '%' }}>{text}</span>)}
    </div>
    <ol className="sandbox-legs">{legs.map(({ name, when, note, holiday, detail }, index) => <li key={name}>
      <span className={'sandbox-stage-chip life-' + index} /><b>{name}</b><small>{when}</small><p>{note}{holiday}{detail && <><br />{detail}</>}</p>
    </li>)}</ol>
  </div>;
}

const commonLegend = [
  ['critical', '关键路径'], ['task', '任务'], ['risk', '受风险影响'],
] as const;
const dateLegend = [['milestone', '节点'], ['holiday', '节假日'], ['today', '今天']] as const;
const contestLegend = [
  ['stages', '第一阶段 · 开发期 · 正式评测'], ['track', '还没比'], ['outage', '宕机'], ['handover', '交接'], ['late', '晚开表'], ['void', '作废'], ['holiday', '节假日'],
] as const;

export function Timeline({ result, params, stage, time, selected, select, setStage, seek, playing, toggle }: {
  result: Result; params: Params; stage: Stage; time: number; selected: number; select: (index: number) => void; setStage: (stage: Stage) => void;
  seek: (hour: number, follow?: boolean) => void; playing: boolean; toggle: () => void;
}) {
  const domain = timelineDomain(result, stage);
  const { a, b } = domain;
  const left = stage === 'in' ? 168 : 214;
  const drag = useRef(false);
  const [tip, setTip] = useState<{ text: string; x: number; y: number }>();
  const seekPointer = (event: PointerEvent<SVGSVGElement>) => seek(a + clamp((fraction(event) * 1060 - left) / (1040 - left), 0, 1) * (b - a));
  const title = stage === 'in' ? config.machineName + ' 上机日历' : stage === 'pre' ? '赛前：从准备开始到开赛' : '赛后：算分、复现、公布，再到 90 天计划';
  const subtitle = stage === 'in'
    ? `每行一队，窗口 ${params.window} 小时，分三段：第一阶段 ${params.phase1} 小时、开发期、第 ${params.sealAt} 小时封存后的正式评测。已经比完的部分是深青，没比的是灰色轨道。`
    : stage === 'pre' ? '每行一条工作线。深青是关键路径，也就是决定启动门禁时间的那条链；其余是灰色。竖线标出原定开赛、门禁满足和实际开赛。'
    : '从最后一队下机算赛后第 1 天。复现要用机器，算分要等复现，公布要等 7 天异议期；奖金发放遇到春节会顺延。';
  const legend = stage === 'in' ? contestLegend : [...commonLegend, ...(stage === 'pre' ? [['late', '开赛时没做完']] : []), ...dateLegend];
  return <>
    <div className="sandbox-row" role="group" aria-label="看哪一段">{result.stages.map(({ id, a, b }) =>
      <button className="pill secondary" type="button" key={id} aria-pressed={stage === id} onClick={() => setStage(id)}>
        {stageNames[id]}<small>{id === 'post' ? 90 : Math.round((b - a) / 24)} 天</small>
      </button>)}</div>
    <div className="card sandbox-card">
      <div><h3>{title}</h3><p>{subtitle}</p></div>
      <div className="sandbox-scroll" tabIndex={0} aria-label="时间轴图表">
        <Gantt result={result} params={params} time={time} stage={stage} domain={domain} selected={selected} select={select}
          svgProps={{
            onPointerDown: (event) => {
              if (event.button !== 0 || fraction(event) * 1060 < left) return;
              drag.current = true;
              setTip(undefined);
              event.currentTarget.setPointerCapture?.(event.pointerId);
              seekPointer(event);
            },
            onPointerMove: (event) => {
              if (drag.current) { seekPointer(event); return; }
              const text = event.target instanceof Element ? event.target.closest('[data-tip]')?.getAttribute('data-tip') : null;
              setTip(text ? { text, x: event.clientX, y: event.clientY } : undefined);
            },
            onPointerLeave: () => setTip(undefined),
            onPointerUp: () => { drag.current = false; },
            onPointerCancel: () => { drag.current = false; },
            onLostPointerCapture: () => { drag.current = false; },
          }} />
      </div>
      {tip && <div className="sandbox-chart-tip" role="tooltip" style={{
        left: Math.min(tip.x + 14, window.innerWidth - 312),
        top: tip.y > window.innerHeight - 118 ? tip.y - 10 : tip.y + 14,
        transform: tip.y > window.innerHeight - 118 ? 'translateY(-100%)' : undefined,
      }}>{tip.text}</div>}
      <ul className="sandbox-legend" aria-label="图例">{legend.map(([key, label]) =>
        <li key={label}><span className={'sandbox-legend-chip ' + key} />{label}</li>)}
        {stage === 'in' && config.tasks.map((task) => <li key={task.id}><span className={'sandbox-icon-chip task-' + task.id}><Icon name={task.icon} /></span>{task.en}</li>)}
      </ul>
      <div className="sandbox-scrub">
        <button type="button" className="pill primary" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} />{playing ? '暂停' : '播放'}</button>
        <input type="range" min={Math.floor(a)} max={Math.ceil(b)} value={clamp(time, a, b)} aria-label="时间轴" onChange={(event) => seek(+event.target.value, false)} />
        <output aria-label="当前时刻">{stamp(result, time)}</output>
      </div>
    </div>
  </>;
}

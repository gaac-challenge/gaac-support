import { Fragment, type SVGProps } from 'react';
import { atStage, clamp, config, describeSlot, shortLabel, stamp, todayHour, type Item, type Params, type Result, type Stage } from './simulation';

export type Domain = { a: number; b: number };
const width = 1060, right = 20;
export const estimateText = (label: string, size = 11) =>
  [...label].reduce((total, letter) => total + size * (letter.charCodeAt(0) > 0x2e7f ? 1 : .58), 0);

export function timelineDomain(result: Result, stage: Stage): Domain {
  const range = result.stages.find((item) => item.id === stage)!;
  if (stage === 'pre') return { a: range.a - 12, b: range.b + 30 };
  if (stage === 'post') return { a: range.a - 12, b: range.b + 12 };
  return { a: range.a, b: Math.max(range.b, result.event.mkB || 0, range.a + 24, ...result.event.mk.map((entry) => entry.ho.b)) };
}

type Geometry = { domain: Domain; x: (hour: number) => number; top: number; bottom: number };
type ChartProps = { result: Result; params: Params; time: number; stage: Stage; domain: Domain; selected: number; select: (index: number) => void; svgProps: SVGProps<SVGSVGElement> };

function Axis({ result, domain: { a, b }, x, top, bottom, today }: Geometry & { result: Result; today: boolean }) {
  const { F } = result;
  const pxDay = x(a + 24) - x(a);
  const step = [1, 2, 7, 14].find((value) => pxDay * value >= 24) ?? 28;
  const days = [];
  const months = [{ x: x(a), date: F.D(a) }];
  for (let day = Math.floor(a / 24) * 24; day < b; day += 24) {
    const date = F.D(day);
    const first = date.getUTCDate() === 1, monday = date.getUTCDay() === 1;
    const start = x(Math.max(a, day)), end = x(Math.min(b, day + 24));
    if (first && day > a) months.push({ x: x(day), date });
    const label = step === 1 ? end - start >= 14 : day >= a && monday && (step <= 7 || Math.floor(day / 168) % 2 === 0) && x(day) + 14 < x(b);
    days.push(<Fragment key={day}>
      {day > a && (first || (pxDay >= 10 && (step === 1 || monday))) && <line className={'grid ' + (first ? 'month' : '')} x1={x(day)} x2={x(day)} y1={top - 6} y2={bottom} />}
      {label && <text className="t-d" x={step === 1 ? (start + end) / 2 : x(day) + 3} y={top - 14} textAnchor={step === 1 ? 'middle' : 'start'}>{date.getUTCDate()}</text>}
    </Fragment>);
  }
  if (months.length > 1 && months[1].x - months[0].x < 70) months.shift();
  let lastMonth = -Infinity;
  const holidays = result.holidays.map(({ h, name }) => ({ a: h, b: h + 24, name, date: F.day(h) }));
  if (result.blackout) holidays.push({ ...result.blackout, date: '' });
  const at = todayHour(result);
  return <>
    {holidays.map((holiday) => {
      const start = Math.max(a, holiday.a), end = Math.min(b, holiday.b);
      if (end <= start) return null;
      const blackout = result.blackout;
      return <g key={holiday.name}>
        <rect className="hol" x={x(start)} y={top - 6} width={x(end) - x(start)} height={bottom - top + 6} />
        {(!blackout || holiday.name === blackout.name || holiday.a < blackout.a || holiday.a >= blackout.b) &&
          <text className="hol-t" x={(x(start) + x(end)) / 2} y={bottom + 16} textAnchor="middle">{holiday.name}{holiday.date && ' ' + holiday.date}</text>}
      </g>;
    })}
    {days}
    {months.map(({ x: at, date }) => {
      if (at - lastMonth < 70 || at > x(b) - 30) return null;
      lastMonth = at;
      return <text className="t-m" key={at} x={at + 3} y={top - 32}>
        {date.getUTCFullYear() !== F.y0 && date.getUTCFullYear() + '年'}{date.getUTCMonth() + 1}月
      </text>;
    })}
    {today && at >= a && at <= b && <g>
      <line className="today" x1={x(at)} x2={x(at)} y1={top - 6} y2={bottom} />
      <text className="today-t" x={x(at) + 4} y={bottom - 5}>今天</text>
    </g>}
  </>;
}

function Playhead({ result, time, domain: { a, b }, x, top, bottom }: Geometry & { result: Result; time: number }) {
  if (time < a || time > b) return null;
  const position = x(time), label = stamp(result, time);
  const size = Math.max(64, estimateText(label) + 16);
  const left = clamp(position - size / 2, 4, width - size - 2);
  return <g className="gantt-playhead">
    <line className="phl" x1={position} x2={position} y1={top - 8} y2={bottom + 2} />
    <circle className="phk" cx={position} cy={top - 8} r="4.5" />
    <rect className="php" x={left} y={bottom + 24} width={size} height="20" rx="10" />
    <text className="pht" x={left + size / 2} y={bottom + 38} textAnchor="middle">{label}</text>
  </g>;
}

function Flags({ flags, x, y }: { flags: Result['flags']; x: (hour: number) => number; y: number }) {
  const placed: number[] = [];
  return <>{flags.map(({ h, n, sev, title }) => {
    let at = x(h);
    while (placed.some((value) => Math.abs(value - at) < 20)) at += 20;
    placed.push(at);
    return <g key={n} className={'rb ' + sev}><title>#{n} {title}</title><circle cx={at} cy={y} r="8.5" />
      <text x={at} y={y + 3.3} textAnchor="middle">{n}</text></g>;
  })}</>;
}

const rowIcons: Record<string, string> = { pod: 'infra', base: 'base', reg: 'rules', ppl: 'people', score: 'check', svc: 'chat', rules: 'shield', money: 'money', after: 'open' };
type PositionedItem = { item: Item; track: number; labelOutside?: string; leftLabel?: boolean };
function pack(items: Item[], geom: Geometry, pxDay: number) {
  const ends: number[] = [];
  const entries: PositionedItem[] = [];
  for (const item of items) {
    const { domain: { a }, x } = geom;
    let start = x(item.a), end = x(item.b ?? item.a);
    const label = item.label ?? '';
    let labelOutside: string | undefined, leftLabel = false;
    if (item.kind === 'ms') {
      const length = estimateText(label) + 8;
      start -= 7; end += 7 + length;
      if (end > width - right) { leftLabel = true; start -= length; end -= length; }
    } else if (end - start - 1 <= estimateText(shortLabel(label)) + 14 && pxDay >= 8 && item.a >= a && end + 6 + estimateText(shortLabel(label)) < width - right) {
      labelOutside = shortLabel(label);
      end += 8 + estimateText(labelOutside);
    }
    const available = ends.findIndex((edge) => edge + 4 <= start);
    const track = available < 0 ? ends.length : available;
    ends[track] = end;
    entries.push({ item, track, labelOutside, leftLabel });
  }
  return { entries, height: Math.max(50, Math.max(1, ends.length) * 28 + 18) };
}

function LaneChart({ result, time, stage, domain, svgProps }: ChartProps & { stage: 'pre' | 'post' }) {
  const { a, b } = domain;
  const left = 214, x = (hour: number) => left + (clamp(hour, a, b) - a) * (width - left - right) / (b - a);
  const m = result.metrics;
  const markers = stage === 'pre' ? [
    ...(m.start !== m.planned ? [{ hour: m.planned, title: '原定开赛', tone: 'ghost' }] : []),
    { hour: m.gateReady, title: '门禁满足', tone: 'gate' },
    { hour: m.start, title: m.unfinished ? '开赛（硬开）' : '开赛', tone: 'ink' },
  ] : [
    { hour: m.eventEnd, title: '全部完赛', tone: 'ink' },
    ...result.post.bands.slice(1).map((band) => ({ hour: band.a, title: band.name.replace('赛后 ', '第 '), tone: 'soft' })),
  ];
  const placed: { row: number; left: number; right: number }[] = [];
  const markerLayout = markers.sort((first, second) => first.hour - second.hour).map((marker) => {
    const at = x(marker.hour), size = estimateText(marker.title, 10.5) + 16;
    let row = 0;
    while (placed.some((entry) => entry.row === row && at - size / 2 < entry.right && at + size / 2 > entry.left)) row++;
    placed.push({ row, left: at - size / 2 - 4, right: at + size / 2 + 4 });
    return { ...marker, at, size, row };
  });
  const top = 74 + (Math.max(0, ...markerLayout.map(({ row }) => row)) + 1) * 22;
  let y = top;
  const items = new Map(result.items.filter((item) => item.id).map((item) => [item.id, item]));
  const rows = config.views[stage].map((row) => {
    const entries = row.ids.map((id) => items.get(id)).filter((item): item is Item => !!item && (item.b ?? item.a) >= a && item.a <= b);
    const packed = pack(entries.sort((first, second) => first.a - second.a), { domain, x, top, bottom: 0 }, x(a + 24) - x(a));
    const position = y;
    y += packed.height;
    return { ...row, ...packed, position };
  });
  const geometry = { domain, x, top, bottom: y };
  return <svg {...svgProps} className="sandbox-gantt gantt-lanes" viewBox={`0 0 ${width} ${y + 52}`} role="img" aria-label={`${stage === 'pre' ? '赛前' : '赛后'}分行图：${result.F.day(a)} 到 ${result.F.day(b)}`}>
    <Axis result={result} {...geometry} today />
    {rows.map((row, i) => {
      const cy = row.position + 25;
      const task = config.tasks.find(({ id }) => id === row.task);
      return <g key={row.id}>
        {i > 0 && <line className="ln-sep" x1="10" x2={width - 8} y1={row.position} y2={row.position} />}
        <rect className="gantt-row-icon" x="12" y={cy - 12} width="24" height="24" rx="7" />
        <use href={'#i-' + (task?.icon ?? rowIcons[row.id] ?? 'generic')} x="17" y={cy - 7} width="14" height="14" />
        <text className="nm" x="46" y={cy - 2}>{task?.en ?? row.name}</text>
        <text className="nm-s" x="46" y={cy + 13}>{task ? task.zh + ' · 判定器' : row.sub}</text>
      </g>;
    })}
    {markerLayout.map(({ at, hour, title, tone, row, size }) => {
      if (hour < a || hour > b) return null;
      const lineTop = 14 + row * 22;
      return <g key={title} className={'marker ' + tone}>
        <line className="vm" x1={at} x2={at} y1={lineTop + 9} y2={y} />
        <rect className="vmp" x={at - size / 2} y={lineTop - 9} width={size} height="18" rx="9" />
        <text className="vmt" x={at} y={lineTop + 3.6} textAnchor="middle">{title}</text>
      </g>;
    })}
    {rows.map((row) => <g key={row.id}>
        {row.entries.map(({ item, track, labelOutside, leftLabel }) => {
          const at = x(item.a), y0 = row.position + 13 + track * 28;
          const label = item.label ?? '', classes = (item.cls ?? []).join(' ');
          if (item.kind === 'ms') return <g key={item.id}>
            <circle className={'msd ' + classes} cx={at} cy={y0 + 10} r="5"><title>{item.tip}</title></circle>
            <text className="mst" x={at + (leftLabel ? -10 : 10)} y={y0 + 14} textAnchor={leftLabel ? 'end' : 'start'}>{label}</text>
          </g>;
          const size = Math.max(2, x(item.b ?? item.a) - at - 1);
          const short = shortLabel(label);
          const fits = size > estimateText(label) + 14 ? label : size > estimateText(short) + 14 ? short : '';
          const dropped = item.cls?.includes('drop');
          return <g key={item.id}>
            <rect className={'lb ' + classes} x={at} y={y0} width={size} height="20" rx="5"><title>{item.tip}</title></rect>
            {dropped ? size > 64 && <text className="lt" x={at + 7} y={y0 + 14}>没做完：{short}</text>
              : (fits || labelOutside) && <text className={`lt ${!fits ? 'outside' : item.cls?.includes('crit') ? 'inverse' : ''}`}
                x={fits ? at + 7 : at + size + 6} y={y0 + 14}>{fits || labelOutside}</text>}
          </g>;
        })}
    </g>)}
    <Flags flags={result.flags.filter(({ h }) => h >= a && h <= b && atStage(result, h) === stage)} x={x} y={top - 2} />
    <Playhead result={result} time={time} {...geometry} />
  </svg>;
}

function ContestChart({ result, params, time, domain, selected, select, svgProps }: ChartProps) {
  const { a, b } = domain;
  const { event, F } = result;
  const left = 168, top = 62, rowH = 66, barHeight = 26, bottom = top + event.slots.length * rowH;
  const x = (hour: number) => left + (clamp(hour, a, b) - a) * (width - left - right) / (b - a);
  const geometry = { domain, x, top, bottom };
  const windows = [
    event.pause && { label: '节前停赛', a: event.pause[0], b: event.pause[1], className: 'pz' },
    params.makeupDays > 0 && { label: `补赛窗口 ${params.makeupDays} 天`, a: event.mkA, b: event.mkB, className: 'rsv' },
  ];
  return <svg {...svgProps} className="sandbox-gantt gantt-contest" viewBox={`0 0 ${width} ${bottom + 52}`} role="img" aria-label={config.machineName + ' 上机日历'}>
    <rect className="rowsel" x="0" y={top + selected * rowH - 4} width={width} height={rowH} rx="8" />
    {windows.map((window) => window && x(window.b) > x(window.a) && <g key={window.label}>
      <rect className={window.className} x={x(window.a)} y={top - 6} width={x(window.b) - x(window.a)} height={bottom - top + 6} />
      <text className="cap" x={x(window.a) + 6} y={bottom - 6}>{window.label}</text>
    </g>)}
    <Axis result={result} {...geometry} today={false} />
    {event.slots.map((slot, index) => {
      const by = top + rowH * index + 6, cy = by + barHeight / 2;
      const prior = event.slots.slice(0, index).reverse().find((entry) => entry.ho);
      const status = describeSlot(result, slot, time);
      const wait = status.label === '等待';
      const segments = [
        { a: slot.s, b: slot.p1 ?? slot.e, phase: 1, label: 'Infra', tasks: config.tasks.filter((task) => task.phase === 1) },
        { a: slot.p1 ?? slot.e, b: slot.seal ?? slot.e, phase: 2, label: '开发', tasks: config.tasks.filter((task) => task.phase !== 1) },
        { a: slot.seal ?? slot.e, b: slot.e, phase: 3, label: '评测', tasks: [] },
      ].filter(({ a, b }) => b > a);
      const review = result.items.find((item) => item.id === `review:${slot.L}`);
      const reviewWidth = review ? x(review.b ?? review.a) - x(review.a) : 0;
      const makeup = event.mk.find(({ sl }) => sl === slot);
      const flags = result.flags.filter((flag) => flag.team === (flag.type === 'handover_fail' ? prior?.L : slot.L));
      return <g key={slot.L}>
        <g className="gantt-team-trigger" role={slot.kind === 'empty' ? undefined : 'button'} tabIndex={slot.kind === 'empty' ? undefined : 0}
          aria-label={slot.who + ' 队'} onClick={() => { if (slot.kind !== 'empty') select(index); }}
          onKeyDown={(event) => { if (slot.kind !== 'empty' && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(index); } }}>
          <circle className={`av ${status.label === '宕机' ? 'alarm' : !wait && time < slot.e ? 'on' : ''}`} cx="30" cy={cy} r="15" />
          <text className="av-t" x="30" y={cy + 4.5} textAnchor="middle">{slot.who}</text>
          <text className="nm" x="54" y={cy - 2}>{slot.who} {slot.kind === 'standby' ? '候补' : '队'}</text>
          <text className="nm-s" x="54" y={cy + 13}>{status.label}</text>
        </g>
        {slot.kind === 'empty' ? <>
          <rect className="emp" x={x(slot.s)} y={by} width={x(slot.e) - x(slot.s)} height={barHeight} rx="8">
            <title>{slot.L} 队赛前退出，候补没补上，作缓冲。</title>
          </rect>
          {x(slot.e) - x(slot.s) > 150 && <text className="sm" x={x(slot.s) + 12} y={cy + 4}>{slot.L} 队退出 · 空档作缓冲</text>}
        </> : <>
          {prior?.ho && x(prior.ho.b) - x(prior.ho.a) > 2 && <rect className="ho" x={x(prior.ho.a) + 1} y={cy - 4}
            width={x(prior.ho.b) - x(prior.ho.a) - 2} height="8" rx="4"><title>换队交接（{prior.who} 队下机后） · {config.handover}</title></rect>}
          {slot.delay > 0 && x(slot.s) - x(slot.ann) > 2 && <rect className="ghost" x={x(slot.ann)} y={by}
            width={x(slot.s) - x(slot.ann)} height={barHeight} rx="8"><title>公布的上机时间 {F.dt(slot.ann)}，实际 {F.dt(slot.s)}，晚 {F.dur(slot.delay)}</title></rect>}
          {segments.map((segment, segmentIndex) => {
            const start = x(segment.a) + (segmentIndex ? 1.5 : 0);
            const end = x(segment.b) - (segmentIndex < segments.length - 1 ? 1.5 : 0), size = Math.max(1, end - start);
            const iconWidth = segment.tasks.length ? segment.tasks.length * 20 + 6 : 0;
            const nameX = start + 8 + iconWidth;
            const fill = time > segment.a ? Math.max(0, x(Math.min(segment.b, time)) - start) : 0;
            return <g key={segment.phase}>
              <rect className="trk" x={start} y={by} width={size} height={barHeight} rx={segmentIndex ? 3 : 8}><title>{segment.label} · {F.dt(segment.a)} → {F.dt(segment.b)}</title></rect>
              {fill > 0 && <rect className={'el' + segment.phase} x={start} y={by} width={Math.min(size, fill)} height={barHeight} rx={segmentIndex ? 3 : 8} />}
              {size > iconWidth + estimateText(segment.label, 10.5) + 14 && <text className={`seg-t ${start + fill > nameX + estimateText(segment.label) ? 'inverse' : ''}`} x={nameX} y={cy + 3.8}>{segment.label}</text>}
              {size >= segment.tasks.length * 20 + 8 && segment.tasks.map(({ id, icon, en, zh, points }, i) => <g key={id}>
                <title>{en}（{zh}）· {points} 分</title><rect className={'chart-task chart-task-' + id} x={start + 5 + i * 20} y={cy - 8} width="16" height="16" rx="4" />
                <use href={'#i-' + icon} x={start + 8 + i * 20} y={cy - 5} width="10" height="10" />
              </g>)}
            </g>;
          })}
          {slot.outs.filter((outage) => x(outage.b) > x(outage.a)).map((outage) => <rect key={outage.n} className={'out ' + (outage.cause === 'degraded' ? 'deg' : outage.comp || outage.move ? '' : 'soft')} x={x(outage.a)} y={by}
            width={Math.max(2.5, x(outage.b) - x(outage.a))} height={barHeight} rx="3">
            <title>#{outage.n} 第 {outage.at} 小时宕机 {outage.hours} 小时 · {outage.move ? '剩余时间挪到补赛窗口' : outage.comp ? '停表，补等长时间' : outage.cause === 'degraded' ? '不停表，成绩标“条件不一致”' : '不补时'}</title>
          </rect>)}
          {slot.makeup > 0 && x(slot.e) < width - 60 && <text className="sm" x={x(slot.e) + 6} y={cy + 4}>补 {slot.makeup}h</text>}
          {slot.quit && x(slot.s + params.window) - x(slot.e) > 2 && <g>
            <rect className="void" x={x(slot.e) + 1.5} y={by} width={x(slot.s + params.window) - x(slot.e) - 1.5} height={barHeight} rx="3" />
            {x(slot.s + params.window) - x(slot.e) > 70 && <text className="sm" x={x(slot.e) + 10} y={cy + 4}>作废 {slot.quit.voidH}h</text>}
          </g>}
          {makeup && <>
            {x(makeup.a) - x(makeup.ra) > 1 && <rect className="mkr" x={x(makeup.ra)} y={cy - 4} width={x(makeup.a) - x(makeup.ra)} height="8" rx="4"><title>从归档恢复现场中。</title></rect>}
            {x(makeup.b) - x(makeup.a) > 1 && <rect className="mk" x={x(makeup.a) + 1} y={by} width={x(makeup.b) - x(makeup.a) - 1} height={barHeight} rx="8">
              <title>{slot.who} 队补赛：剩余 {slot.moved?.remain} 小时{'\n'}{F.dt(makeup.a)} → {F.dt(makeup.b)}{makeup.b > event.mkB && '\n超出补赛窗口'}</title>
            </rect>}
            {x(makeup.b) - x(makeup.a) > 50 && <text className="seg-t" x={x(makeup.a) + 10} y={cy + 3.8}>补赛</text>}
          </>}
          {review && reviewWidth > 2 && <rect className={`rv ${review.cls?.includes('late') ? 'late' : ''}`} x={x(review.a) + 2} y={by + barHeight + 6} width={reviewWidth - 2} height="4" rx="2"><title>{review.tip}</title></rect>}
          <text className="t-d" x={x(slot.s) + 2} y={by + barHeight + 22}>{F.dt(slot.s)}{slot.delay > 0 && ' · 晚 ' + F.dur(slot.delay)}</text>
          <Flags flags={flags} x={x} y={by - 3} />
        </>}
      </g>;
    })}
    <Playhead result={result} time={time} {...geometry} />
  </svg>;
}

export function Gantt(props: ChartProps) {
  return props.stage === 'in' ? <ContestChart {...props} /> : <LaneChart {...props} stage={props.stage} />;
}

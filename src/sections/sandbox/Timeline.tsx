import { useRef, type PointerEvent } from 'react';
import { clamp, config, stageNames, type Result, type Stage } from './simulation';

type Window = { a: number; b: number };
function fraction(event: PointerEvent<SVGSVGElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
}

export function Band({ result, time, seek }: { result: Result; time: number; seek: (hour: number) => void }) {
  const start = result.stages[0].a;
  const end = result.stages[2].b;
  const x = (hour: number) => (hour - start) / (end - start) * 900;
  const drag = useRef(false);
  const move = (event: PointerEvent<SVGSVGElement>) => seek(start + fraction(event) * (end - start));
  return <div className="sandbox-band">
    <svg viewBox="0 0 900 38" preserveAspectRatio="none" aria-label="全程时间带，点击或拖动跳到任一时刻"
      onPointerDown={(event) => { drag.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); move(event); }}
      onPointerMove={(event) => { if (drag.current) move(event); }}
      onLostPointerCapture={() => { drag.current = false; }} onPointerUp={() => { drag.current = false; }}
      onPointerCancel={() => { drag.current = false; }}>
      {result.stages.map(({ id, a, b }) => <rect key={id} className={'stage-' + id} x={x(a)} y="1" width={x(b) - x(a)} height="36" />)}
      <line className="sandbox-playhead" x1={x(time)} x2={x(time)} y1="0" y2="38" />
    </svg>
    <div className="sandbox-row">{result.stages.map((stage) => <button className="pill secondary" type="button" key={stage.id} onClick={() => seek(stage.a)}>{stage.name} · {result.F.day(stage.a)}</button>)}</div>
  </div>;
}

function domain(result: Result, stage: Stage): Window {
  const range = result.stages.find((item) => item.id === stage)!;
  if (stage === 'pre') return { a: range.a - 12, b: range.b + 30 };
  if (stage === 'post') return { a: range.a - 12, b: range.b + 12 };
  return { a: range.a, b: Math.max(range.b, result.event.mkB || 0, range.a + 24) };
}

export function Timeline({ result, stage, time, setStage, seek, playing, toggle }: {
  result: Result; stage: Stage; time: number; setStage: (stage: Stage) => void; seek: (hour: number, follow?: boolean) => void;
  playing: boolean; toggle: () => void;
}) {
  const { a, b } = domain(result, stage);
  const width = 1040, left = 166, plot = width - left - 22, rowHeight = 48;
  const items = result.items.filter((item) => item.stage === stage);
  const groups = stage === 'in' ? [] : config.views[stage].map((view) => ({
    id: view.id,
    name: view.name ?? config.tasks.find((task) => task.id === view.task)?.en ?? view.id,
    owner: view.sub ?? config.tasks.find((task) => task.id === view.task)?.zh ?? '',
    entries: items.filter((item) => item.id && view.ids.includes(item.id)),
  }));
  const grouped = new Set(groups.flatMap(({ entries }) => entries));
  const lanes = [...groups, ...result.lanes.map((lane) => ({
    ...lane, entries: items.filter((item) => item.lane === lane.id && !grouped.has(item)),
  }))].filter((lane) => lane.entries.length > 0);
  const height = 48 + lanes.length * rowHeight;
  const x = (hour: number) => left + (hour - a) / (b - a) * plot;
  const drag = useRef(false);
  const seekPointer = (event: PointerEvent<SVGSVGElement>) => seek(a + clamp((fraction(event) * width - left) / plot, 0, 1) * (b - a), false);
  const ticks = Array.from({ length: 9 }, (_, i) => Math.round(a + i * (b - a) / 8));

  return <>
    <div className="sandbox-row" role="group" aria-label="看哪一段">{Object.entries(stageNames).map(([id, name]) =>
      <button className="pill secondary" type="button" key={id} aria-pressed={stage === id} onClick={() => setStage(id as Stage)}>{name}</button>)}</div>
    <div className="card sandbox-card">
      <h3>{stageNames[stage]} · {result.F.day(a)} – {result.F.day(b)}</h3>
      <div className="sandbox-scroll" tabIndex={0} aria-label="时间轴图表">
        <svg className="sandbox-gantt" viewBox={`0 0 ${width} ${height}`} aria-label="推演时间轴"
          onPointerDown={(event) => { drag.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); seekPointer(event); }}
          onPointerMove={(event) => { if (drag.current) seekPointer(event); }}
          onPointerUp={() => { drag.current = false; }} onLostPointerCapture={() => { drag.current = false; }}
          onPointerCancel={() => { drag.current = false; }}>
          {ticks.map((hour) => <g key={hour}><line className="sandbox-gridline" x1={x(hour)} y1="25" x2={x(hour)} y2={height} /><text x={x(hour)} y="17" textAnchor="middle">{result.F.day(hour)}</text></g>)}
          {lanes.map((lane, index) => <g key={lane.id + index} transform={`translate(0 ${32 + index * rowHeight})`}>
            <text x="8" y="17">{lane.name}</text><text x="8" y="34" className="sandbox-gantt-owner">{lane.owner}</text>
            <line className="sandbox-gridline" x1="0" y1="44" x2={width} y2="44" />
            {lane.entries.map((item, i) => {
              const start = x(clamp(item.a, a, b));
              const size = x(clamp(item.b ?? item.a, a, b)) - start;
              return <g key={i} className={'gantt-' + item.kind}>
                <title>{item.tip}</title>
                {item.b === undefined ? <circle cx={start} cy="17" r="5" /> : <rect x={start} y="6" width={Math.max(2, size)} height="23" rx="4" />}
                {size > 38 && <text x={start + 5} y="22">{(item.label ?? item.who ?? '').slice(0, Math.floor(size / 13))}</text>}
              </g>;
            })}
          </g>)}
          {time >= a && time <= b && <line className="sandbox-playhead" x1={x(time)} y1="24" x2={x(time)} y2={height} />}
        </svg>
      </div>
      <div className="sandbox-scrub">
        <button type="button" className="pill primary" onClick={toggle}>{playing ? '暂停' : '播放'}</button>
        <input type="range" min={a} max={b} value={clamp(time, a, b)} aria-label="时间轴" onChange={(event) => seek(+event.target.value, false)} />
        <output aria-label="当前时刻">{result.F.dt(time)}</output>
      </div>
    </div>
  </>;
}

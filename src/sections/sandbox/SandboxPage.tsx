import { useEffect, useMemo, useState } from 'react';
import { usePageTitle } from '../../components/Layout';
import { Parameters, RiskControls, TopControls } from './Controls';
import { Notes, Overview, Panel, PrepTasks, RiskRegister, Schedule, Scoring, Sidebar, TeamWindow } from './Sections';
import { Band, Timeline } from './Timeline';
import { adjust, atStage, clamp, config, defaults, describeSlot, makeRisk, riskTypes, roll, run, stageNames, type Risk, type Stage } from './simulation';
import './sandbox.css';

export default function SandboxPage() {
  usePageTitle(config.name);
  const [params, setParams] = useState(defaults);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selected, setSelected] = useState('clean');
  const result = useMemo(() => run(params, risks), [params, risks]);
  const first = result.stages[0].a, last = result.stages[2].b;
  const [position, setPosition] = useState(() => {
    const today = new Date();
    return clamp(Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - result.T0) / 3600000 + today.getHours()), first, last);
  });
  const [stage, setStage] = useState<Stage>(() => atStage(result, position));
  const [playing, setPlaying] = useState(false);
  const [slot, setSlot] = useState(0);
  const [logFilter, setLogFilter] = useState('all');
  const time = clamp(position, first, last);
  const currentStage = atStage(result, time);

  useEffect(() => {
    if (!playing) return;
    let elapsed = time;
    let previous = performance.now();
    const duration = { pre: 10000, in: 18000, post: 10000 };
    const timer = window.setInterval(() => {
      const now = performance.now();
      const stage = atStage(result, elapsed);
      const window = result.stages.find(({ id }) => id === stage)!;
      elapsed += (now - previous) * (window.b - window.a) / duration[stage];
      previous = now;
      setPosition(Math.min(last, Math.floor(elapsed)));
      setStage(atStage(result, elapsed));
      if (elapsed >= last) setPlaying(false);
    }, 50);
    return () => window.clearInterval(timer);
    // Restart playback only when its bounds or playing state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, result, last]);

  function seek(hour: number, follow = true) {
    setPlaying(false);
    const next = clamp(Math.round(hour), first, last);
    setPosition(next);
    if (follow) setStage(atStage(result, next));
  }

  function choose(id: string) {
    if (!id) return;
    setPlaying(false);
    if (id === '__dice') {
      setSelected(id);
      setRisks(roll(params));
    } else if (id === '__clear') {
      setSelected('clean');
      setRisks([]);
    } else {
      const preset = config.presets.find((entry) => entry.id === id);
      if (!preset) return;
      setSelected(id);
      setRisks(preset.risks.map((risk) => makeRisk(risk.type, risk)));
    }
  }

  function addRisk(type: string) {
    if (!type) return;
    setPlaying(false);
    setSelected('__custom');
    setRisks((current) => [...current, makeRisk(type)]);
  }

  function editRisk(index: number, field: string, value: string | number) {
    const definition = riskTypes[risks[index].type].fields.find(({ k }) => k === field);
    if (definition?.type === 'num') value = clamp(Math.round(+value), definition.min, definition.max);
    setPlaying(false);
    setSelected('__custom');
    setRisks((current) => current.map((risk, at) => at === index ? { ...risk, [field]: value } : risk));
  }

  function reset() {
    setPlaying(false);
    setParams(defaults());
    setRisks([]);
    setSelected('clean');
  }

  function select(index: number) {
    setSlot(index);
  }

  const activeSlot = result.event.slots.find(({ s, e, kind }) => kind !== 'empty' && s <= time && time < e);
  const active = result.items.filter(({ a, b }) => b !== undefined && a <= time && time < b);
  const latest = result.log.filter(({ h }) => h <= time).at(-1);
  const upcoming = result.log.find(({ h }) => h > time);
  const logs = result.log.filter(({ kind }) => logFilter === 'all'
    || (logFilter === 'risk' ? ['risk', 'resp', 'warn'].includes(kind) : ['ms', 'warn'].includes(kind)));
  const selectedSlot = result.event.slots[slot]?.kind !== 'empty' && result.event.slots[slot] ? slot : result.event.slots.findIndex(({ kind }) => kind !== 'empty');

  return <div className="sandbox-page">
    <Sidebar />
    <div className="sandbox-main">
      <TopControls selected={selected} choose={choose} reset={reset} />
      <Overview result={result} params={params}><Band result={result} time={time} seek={seek} /></Overview>
      <Panel id="timeline" title="时间轴">
        <Timeline result={result} time={time} stage={stage} setStage={(next) => { setPlaying(false); setStage(next); }}
          seek={seek} playing={playing} toggle={() => {
            if (!playing && time >= last) { setPosition(first); setStage('pre'); }
            setPlaying(!playing);
          }} />
      </Panel>
      <Panel id="now" title="此刻" description="时间轴拖到哪里，这里就显示那一刻：机器上是谁、各组在忙什么、刚发生的风险和下一个节点。">
        <div className="sandbox-overview-grid">
          <div className="card sandbox-card"><h3>{stageNames[currentStage]} · {result.F.dt(time)}</h3>
            <p>{activeSlot ? activeSlot.who + ' 队正在上机' : '没有队伍正在上机'}</p>
            <ul>{active.map((item, index) => <li key={index}>{item.label || item.who || item.tip.split('\n')[0]}</li>)}</ul>
          </div>
          <div className="card sandbox-card"><h3>各队</h3>
            <ul className="sandbox-ledger">{result.event.slots.map((entry) => {
              const status = describeSlot(result, entry, time);
              return <li key={entry.L}><b>{entry.who ?? entry.L} 队 · {status.label}</b><small>{status.note}</small></li>;
            })}</ul>
            {latest && <p>刚发生：{latest.title}</p>}{upcoming && <p>下一个节点：{upcoming.title}</p>}
          </div>
        </div>
      </Panel>
      <Panel id="log" title="推演日志" description="按时间排的每一件事：节点、风险，以及按预案做出的应对。点任意一条，时间轴跳过去。">
        <div className="sandbox-overview-grid">
          <div className="card sandbox-card">
            <label>日志筛选 <select value={logFilter} onChange={(event) => setLogFilter(event.target.value)}><option value="all">全部</option>
              <option value="risk">风险与应对</option><option value="ms">节点</option>
            </select></label>
            <ol className="sandbox-log">{logs.map(({ h, title, text }, index) => <li key={index} data-future={h > time}>
              <button type="button" className="sandbox-text-button" onClick={() => seek(Math.ceil(h))}>{result.F.dt(h)} · {title}</button>{text && <small>{text}</small>}
            </li>)}</ol>
          </div>
          <div className="card sandbox-card">
            <h3>可能引出的争执</h3>{result.disputes.slice().sort((a, b) => b.star - a.star).map((issue) => <p key={issue.id}><b>{issue.title ?? issue.name}</b> {issue.text ?? issue.resp}</p>)}
            <h3>排期里的隐患</h3>{result.warns.map((warning) => <p key={warning.name}><b>{warning.name}</b> {warning.consequence}</p>)}
          </div>
        </div>
      </Panel>
      <Panel id="risks" title="情景与风险" description="选一个情景，或自己添加风险。每条风险按预案第 3–7 节的规则处置，结果画进时间轴和日志。">
        <RiskControls selected={selected} choose={choose} params={params} risks={risks} result={result} add={addRisk} edit={editRisk}
          remove={(index) => {
            setPlaying(false); setSelected(risks.length === 1 ? 'clean' : '__custom');
            setRisks((current) => current.filter((_, at) => at !== index));
          }} />
      </Panel>
      <Panel id="params" title="推演参数">
        <Parameters params={params} change={(key, value) => { setPlaying(false); setParams((current) => adjust(current, key, value)); }}
          literal={() => { setPlaying(false); setParams((current) => ({ ...current, ...config.literal })); }} />
      </Panel>
      <Panel id="sched" title="排期一览"><Schedule result={result} time={time} select={select} /></Panel>
      <Panel id="team" title="一队的窗口"><TeamWindow result={result} params={params} time={time} slotIndex={selectedSlot} select={select} /></Panel>
      <Panel id="score" title="怎么算分"><Scoring /></Panel>
      <Panel id="prep" title="赛前任务表"><PrepTasks result={result}
        change={(id, days) => { setPlaying(false); setParams((current) => ({ ...current, dur: { ...current.dur, [id]: clamp(Math.round(days), 0, 60) } })); }}
        reset={() => { setPlaying(false); setParams((current) => ({ ...current, dur: {} })); }} /></Panel>
      <Panel id="register" title="风险登记册"><RiskRegister inject={(type) => { addRisk(type); window.location.hash = 'risks'; }} /></Panel>
      <Panel id="notes" title="哪些是官网写的，哪些是假设"><Notes params={params} /></Panel>
    </div>
  </div>;
}

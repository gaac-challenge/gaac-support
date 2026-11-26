import { useEffect, useMemo, useState } from 'react';
import { usePageTitle } from '../../components/Layout';
import { Parameters, RiskControls, TopControls } from './Controls';
import { Notes, Panel, PrepTasks, RiskRegister, Schedule, Scoring, Sidebar, registerDescription, scoringDescription } from './Sections';
import { Overview } from './Overview';
import { CurrentTime } from './CurrentTime';
import { LogPanel } from './LogPanel';
import { TeamWindow } from './TeamWindow';
import { SandboxSymbols } from './icons';
import { timelineDomain } from './Gantt';
import { Band, Timeline, timelineNotes } from './Timeline';
import { adjust, atStage, clamp, config, defaults, makeRisk, riskTypes, roll, run, type Risk, type Stage } from './simulation';
import './sandbox.css';

export default function SandboxPage() {
  usePageTitle(config.name);
  const [params, setParams] = useState(defaults);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selected, setSelected] = useState('clean');
  const result = useMemo(() => run(params, risks), [params, risks]);
  const baseline = useMemo(() => run(params, []), [params]);
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

  useEffect(() => {
    if (!playing) return;
    let elapsed = time;
    let previous = performance.now();
    const duration = { pre: 10000, in: 18000, post: 10000 };
    const timer = window.setInterval(() => {
      const now = performance.now();
      const stage = atStage(result, elapsed);
      const window = timelineDomain(result, stage);
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

  const selectedSlot = result.event.slots[slot]?.kind !== 'empty' && result.event.slots[slot] ? slot : result.event.slots.findIndex(({ kind }) => kind !== 'empty');

  return <div className="sandbox-page">
    <SandboxSymbols />
    <Sidebar selected={selected} riskCount={risks.length} riskHit={result.metrics.riskHit} />
    <div className="sandbox-main">
      <TopControls selected={selected} choose={choose} reset={reset} stage={stage} />
      <p className="sandbox-disclaimer">推演假设，非正式赛程</p>
      <Overview result={result} baseline={baseline} params={params}><Band result={result} stage={stage} time={time} seek={seek} /></Overview>
      <Panel id="timeline" title="时间轴" description={timelineNotes[stage]}>
        <Timeline result={result} params={params} time={time} stage={stage} selected={selectedSlot} select={select} setStage={(next) => {
          setPlaying(false); setStage(next);
          const domain = timelineDomain(result, next);
          if (time < domain.a || time > domain.b) setPosition(result.stages.find(({ id }) => id === next)!.a);
        }}
          seek={seek} playing={playing} toggle={() => {
            if (!playing && time >= last) { setPosition(first); setStage('pre'); }
            setPlaying(!playing);
          }} />
      </Panel>
      <Panel id="now" title="此刻" description="时间轴拖到哪里，这里就显示那一刻：机器上是谁、各组在忙什么、刚发生的风险和下一个节点。">
        <CurrentTime result={result} params={params} time={time} />
      </Panel>
      <Panel id="log" title="推演日志" description="按时间排的每一件事：节点、风险，以及按预案做出的应对。点任意一条，时间轴跳过去。">
        <LogPanel result={result} params={params} time={time} filter={logFilter} setFilter={setLogFilter} seek={seek} />
      </Panel>
      <Panel id="risks" title="情景与风险" description="选一个情景，或自己添加风险。每条风险按预案第 3–7 节的规则处置，结果画进时间轴和日志。">
        <RiskControls selected={selected} choose={choose} params={params} risks={risks} result={result} add={addRisk} edit={editRisk}
          remove={(index) => {
            setPlaying(false); setSelected(risks.length === 1 ? 'clean' : '__custom');
            setRisks((current) => current.filter((_, at) => at !== index));
          }} />
      </Panel>
      <Panel id="params" title="推演参数" description="默认值是预案里的建议值（还没拍板），写在同目录的 scenario.js。整数参数用 − / + 调，二选一的直接点。“官网字面口径” = 00:00 开赛、换队不留间隔。">
        <Parameters params={params} change={(key, value) => { setPlaying(false); setParams((current) => adjust(current, key, value)); }}
          literal={() => { setPlaying(false); setParams((current) => ({ ...current, ...config.literal })); }} />
      </Panel>
      <Panel id="sched" title="排期一览" description={`每队 ${params.window} 小时，第 ${params.sealAt} 小时封存。换队留 ${params.gap} 小时，交接实际要 ${result.HM} 小时${result.plan === 'pause' ? '；节前停赛' : ''}。补赛窗口 ${params.makeupDays} 天。${result.metrics.over > 0 ? `最后一队比公布晚 ${result.F.dur(result.metrics.over)}。` : ''}`}><Schedule result={result} select={select} /></Panel>
      <Panel id="team" title="一队的窗口"><TeamWindow result={result} params={params} time={time} slotIndex={selectedSlot} select={select} /></Panel>
      <Panel id="score" title="怎么算分" description={scoringDescription()}><Scoring /></Panel>
      <Panel id="prep" title="赛前任务表" description={`工期是估计值，用 − / + 改，整条时间线马上重算。余量按原定 ${result.F.dateCN(result.metrics.planned)} 开赛倒推。`}><PrepTasks result={result} params={params}
        change={(id, days) => { setPlaying(false); setParams((current) => ({ ...current, dur: { ...current.dur, [id]: clamp(Math.round(days), 0, 60) } })); }}
        reset={() => { setPlaying(false); setParams((current) => ({ ...current, dur: {} })); }} /></Panel>
      <Panel id="register" title="风险登记册" description={registerDescription(risks)}><RiskRegister risks={risks} inject={(type) => { addRisk(type); window.location.hash = 'risks'; }} /></Panel>
      <Panel id="notes" title="哪些是官网写的，哪些是假设"><Notes params={params} /></Panel>
    </div>
  </div>;
}

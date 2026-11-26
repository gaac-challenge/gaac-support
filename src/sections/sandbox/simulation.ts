// @ts-expect-error The verified simulation modules preserve the original JavaScript.
import scenario from './scenario.js';
// @ts-expect-error The verified simulation modules preserve the original JavaScript.
import { simulate, isoUTC } from './engine.js';

export type Stage = 'pre' | 'in' | 'post';
type Value = string | number;
export type Risk = { type: string } & Record<string, Value>;
type Field = { k: string; label: string; unit?: string } & (
  { type: 'num'; min: number; max: number; def: number } |
  { type: 'team'; def: string } |
  { type: 'sel'; def: string; options: [string, string][] }
);
type RiskType = { type: string; stage: Stage; name: string; fields: Field[]; sev: string; ref: string };
type Task = { id: string; en: string; zh: string; points: number; phase: number };
export type Params = Record<string, Value | Record<string, number>> & {
  start: string; hour: number; prepStart: string; edgepodArrive: string; teams: number;
  window: number; phase1: number; sealAt: number; scope: string; launch: string; dur: Record<string, number>;
};
type Item = { id?: string; a: number; b?: number; lane: string; stage: Stage; kind: string; label?: string; who?: string; tip: string };
export type Slot = { i: number; L: string; who: string; kind: string; s: number; e: number; p1?: number; seal?: number; ann: number; standbyQ?: boolean; degraded?: boolean; delay: number; makeup: number; lost: number; wall?: (hour: number) => number; quit?: { at: number }; moved?: { from: number; remain: number }; ho?: { a: number; b: number }; outs: { a: number; b: number; at: number; n: number; hours: number; cause: string; comp?: boolean; move?: boolean }[] };
type Prep = { id: string; name: string; lane: string; durH: number; base: number; state?: string; leadGot: number; hits: { n: number; days: number }[]; es: number; ef: number; slack: number | null; crit: boolean; gate?: string };
type Log = { h: number; kind: string; title: string; text: string; lane: string };
export type Result = {
  T0: number;
  HM: number; plan: string; holidays: { h: number; name: string }[];
  F: { dt: (h: number) => string; day: (h: number) => string; dur: (h: number) => string; days: (h: number) => string };
  lanes: { id: string; name: string; owner: string }[];
  stages: { id: Stage; name: string; a: number; b: number }[];
  items: Item[];
  log: Log[];
  event: { slots: Slot[]; mk: { sl: Slot; ra: number; a: number; b: number }[]; mkB: number };
  prep: { list: Prep[] };
  metrics: { start: number; planned: number; gateReady: number; gateBy: string; eventEnd: number; day90: number; slip: number; announce: number | null; prize: number | null; makeupH: number; voidH: number; critTxt: string; riskHit: number };
  risks: { def: RiskType; status: string; effect: string }[];
  warns: { name: string; consequence: string }[];
  disputes: { id: string; title?: string; name?: string; text?: string; resp?: string; star: number; by: string[] }[];
};

export const config = scenario as {
  name: string; eyebrow: string; machineName: string; platform: string; teamNames: string[];
  defaults: Omit<Params, 'dur'>; literal: Record<string, Value>; riskTypes: RiskType[];
  presets: { id: string; name: string; desc: string; risks: Risk[] }[];
  register: { stage: Stage; risk: string; resp: string; prep: string; ref: string; inject?: string }[];
  views: Record<'pre' | 'post', { id: string; name?: string; sub?: string; task?: string; ids: string[] }[]>;
  tasks: Task[]; phases: { name: string; tag: string; tools: string }[];
  bonus: { zh: string; en: string; max: number; note: string };
  appScore: [string, number][]; appScoreNote: string;
  prize: { amount: string; count: string; note: string };
  notes: { kind: string; text: string }[]; source: { label: string; url: string }; doc: string;
};

export const stageNames = { pre: '赛前', in: '赛中', post: '赛后' };
export const riskTypes = Object.fromEntries(config.riskTypes.map((type) => [type.type, type]));
export const defaults = (): Params => ({ ...config.defaults, dur: {} } as Params);
export const run = (params: Params, risks: Risk[]): Result => simulate(config, params, risks);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const atStage = (result: Result, time: number): Stage =>
  time < result.stages[1].a ? 'pre' : time < result.stages[2].a ? 'in' : 'post';

export function makeRisk(type: string, overrides: Partial<Risk> = {}): Risk {
  return { type, ...Object.fromEntries(riskTypes[type].fields.map(({ k, def }) => [k, overrides[k] ?? def])) };
}

export function roll(params: Params): Risk[] {
  const pick = <T,>(choices: T[]) => choices[Math.floor(Math.random() * choices.length)];
  const by = (stage: Stage) => config.riskTypes.filter((type) => type.stage === stage);
  const selected = [pick(by('pre')), pick(by('in')), pick(by('in')), pick(by('post'))];
  if (Math.random() < .5) selected.push(pick(config.riskTypes));
  const seen = new Set<string>();
  return selected.flatMap(({ type, fields }) => {
    if (seen.has(type) && type !== 'outage') return [];
    seen.add(type);
    const choices = fields.map((field) => {
      if (field.type === 'team') return [field.k, pick(config.teamNames.slice(0, params.teams))];
      if (field.type === 'sel') return [field.k, pick(field.options)[0]];
      const hi = field.k === 'at' ? params.window - 1 : Math.min(field.max, Math.max(field.def * 2, field.min + 1));
      const lo = field.k === 'at' ? 1 : Math.max(field.min, Math.round(field.def / 2));
      return [field.k, Math.round(lo + Math.random() * (hi - lo))];
    });
    return [makeRisk(type, Object.fromEntries(choices))];
  });
}

export const parameterFields = [
    {g: '赛制', k: 'start', label: '开赛日期（原定）', help: '推演假设，官网未公布', type: 'date'},
    {g: '赛制', k: 'hour', label: '开赛时刻', help: '预案建议 09:00', type: 'hour'},
    {g: '赛制', k: 'teams', label: '队伍数', help: '官网：首届 5 队', type: 'num', min: 1, max: 8},
    {g: '赛制', k: 'window', label: '每队窗口（小时）', help: '官网：168 小时', type: 'num', min: 24, max: 720, step: 6},
    {g: '赛制', k: 'phase1', label: '第一阶段（小时）', help: '官网：0–30 小时', type: 'num', min: 1, max: 700},
    {g: '赛制', k: 'sealAt', label: '封存点（第几小时）', help: 'V1.3 参考：第 120 小时', type: 'num', min: 2, max: 719, step: 6},
    {g: '赛前', k: 'prepStart', label: '准备开始', help: '默认今天', type: 'date'},
    {g: '赛前', k: 'edgepodArrive', label: 'EdgePod 到位', help: '假设已在现场', type: 'date'},
    {g: '赛前', k: 'scope', label: 'Benchmark 范围', help: '最低可用版见预案 §2.4', type: 'seg', options: [['mvp', '最低可用'], ['full', '完整版']]},
    {g: '赛前', k: 'launch', label: '开赛策略', help: '预案建议按启动门禁', type: 'seg', options: [['gate', '按门禁'], ['fixed', '硬开']]},
    {g: '赛前', k: 'practiceLead', label: '练习期（天）', help: '开赛前至少开放几天', type: 'num', min: 0, max: 30},
    {g: '预案', k: 'gap', label: '换队间隔（小时）', help: '预案建议 24 小时', type: 'num', min: 0, max: 168, step: 6},
    {g: '预案', k: 'handover', label: '交接耗时（小时）', help: '估计 7–15 小时', type: 'num', min: 1, max: 96},
    {g: '预案', k: 'makeupDays', label: '补赛窗口（天）', help: '最后一队之后的缓冲', type: 'num', min: 0, max: 14},
    {g: '预案', k: 'standby', label: '候补队', help: '预案建议 2 支', type: 'num', min: 0, max: 2},
    {g: '预案', k: 'holidayPlan', label: '节假日方案', help: '保障不了就节前停赛', type: 'seg', options: [['keep', '照常比'], ['pause', '节前停赛']]},
    {g: '预案', k: 'noMakeupMax', label: '不补时上限（小时）', help: '累计不超过就不补', type: 'num', min: 0, max: 24},
    {g: '预案', k: 'moveOver', label: '挪补赛阈值（小时）', help: '单次宕机超过就挪', type: 'num', min: 2, max: 168, step: 6}
] as const;

export function adjust(params: Params, key: string, value: Value): Params {
  const next = { ...params, [key]: value };
  if (key === 'scope') next.dur = {};
  const field = parameterFields.find((item) => item.k === key);
  if (field?.type === 'date' && isoUTC(value) === null) return params;
  if (field?.type === 'num') next[key] = clamp(Math.round(Number(value)), field.min, field.max);
  if (key === 'hour') next.hour = clamp(Math.round(Number(value)), 0, 23);
  next.phase1 = clamp(next.phase1, 1, next.window - 2);
  next.sealAt = clamp(next.sealAt, next.phase1 + 1, next.window - 1);
  return next;
}

export function describeSlot(result: Result, slot: Slot, time: number) {
  const { F } = result;
  if (slot.kind === 'empty') return { label: '空档', note: '赛前退出，空档作缓冲' };
  if (time < slot.s) return { label: '等待', note: F.dt(slot.s) + ' 上机 · 还有 ' + F.dur(slot.s - time) };
  const outage = slot.outs.find(({ a, b }) => time >= a && time < b);
  if (outage) return { label: '宕机', note: `#${outage.n} 宕机 ${outage.hours} 小时${outage.comp ? '，补时' : outage.move ? '，剩余挪到补赛' : ''}` };
  if (time < slot.e) {
    if (slot.seal != null && time >= slot.seal) return { label: '正式评测', note: '组委会运行正式评测 · ' + F.dur(slot.e - time) + '后下机' };
    if (slot.p1 != null && time >= slot.p1) return { label: '开发期', note: '距封存还有 ' + F.dur((slot.seal ?? slot.e) - time) };
    return { label: config.phases[0].name, note: F.dur((slot.p1 ?? slot.e) - time) + '后转开发期' };
  }
  const makeup = result.event.mk.find((entry) => entry.sl === slot);
  if (makeup && slot.moved && time < makeup.b) return {
    label: time < makeup.a ? '等补赛' : '补赛',
    note: `剩余 ${slot.moved.remain} 小时 · ${F.dt(makeup.a)} 起补赛`,
  };
  if (slot.quit) return { label: '已退出', note: `第 ${slot.quit.at} 小时退出，剩余作废` };
  return { label: '完成', note: F.dt(slot.e) + ' 下机' + (slot.makeup ? ` · 含补时 ${slot.makeup} 小时` : '') };
}

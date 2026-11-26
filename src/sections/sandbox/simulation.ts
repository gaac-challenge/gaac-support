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
export type Task = { icon: string; deliver: string; check: string; id: string; en: string; zh: string; points: number; phase: number };
export type Params = Record<string, Value | Record<string, number>> & {
  start: string; hour: number; prepStart: string; edgepodArrive: string; teams: number; makeupDays: number; gap: number;
  window: number; phase1: number; sealAt: number; scope: string; launch: string; dur: Record<string, number>;
};
export type Item = { cls?: string[]; id?: string; a: number; b?: number; lane: string; stage: Stage; kind: string; label?: string; who?: string; tip: string };
export type Slot = { i: number; L: string; who: string; kind: string; s: number; e: number; p1?: number; seal?: number; ann: number; standbyQ?: boolean; degraded?: boolean; delay: number; makeup: number; lost: number; wall?: (hour: number) => number; quit?: { at: number; voidH: number }; moved?: { from: number; remain: number }; ho?: { a: number; b: number; extra?: number }; outs: { a: number; b: number; at: number; n: number; hours: number; cause: string; comp?: boolean; move?: boolean }[] };
type Prep = { note?: string; id: string; name: string; lane: string; durH: number; base: number; state?: string; leadGot: number; hits: { n: number; days: number }[]; es: number; ef: number; slack: number | null; crit: boolean; gate?: string };
type Log = { n?: number; h: number; kind: string; title: string; text: string; lane: string };
export type Result = {
  T0: number;
  HM: number; plan: string; holidays: { h: number; name: string }[];
  F: { D: (h: number) => Date; y0: number; long: (h: number) => string; dateCN: (h: number) => string; dt: (h: number) => string; day: (h: number) => string; dur: (h: number) => string; days: (h: number) => string };
  lanes: { id: string; name: string; owner: string }[];
  stages: { id: Stage; name: string; a: number; b: number }[];
  items: Item[];
  log: Log[];
  event: { slots: Slot[]; played: Slot[]; pause: [number, number] | null; mk: { sl: Slot; ra: number; a: number; b: number; ho: { b: number } }[]; mkA: number; mkB: number };
  prep: { list: Prep[] };
  post: { list: Prep[]; bands: { a: number; b: number; name: string }[] };
  flags: { h: number; n: number; sev: string; title: string; team?: string; type: string }[];
  blackout: { a: number; b: number; name: string } | null;
  metrics: { unfinished: number; over: number; dayOne: number; delayedN: number; movedN: number; standbyN: number; maxDelay: number; emptyH: number; prizeExt: number; riskDead: number; start: number; planned: number; gateReady: number; gateBy: string; eventEnd: number; day90: number; slip: number; announce: number | null; prize: number | null; makeupH: number; voidH: number; critTxt: string; riskHit: number };
  risks: { h?: number; def: RiskType; status: string; effect: string }[];
  warns: { name: string; consequence: string; state?: string; leadGot: number }[];
  disputes: { id: string; name: string; area: string; prevent: string; star: number; by: string[] }[];
};

export const config = scenario as {
  name: string; eyebrow: string; machineName: string; platform: string; teamNames: string[];
  defaults: Omit<Params, 'dur'>; literal: Record<string, Value>; riskTypes: RiskType[];
  presets: { id: string; name: string; desc: string; risks: Risk[] }[];
  register: { stage: Stage; risk: string; resp: string; prep: string; ref: string; inject?: string }[];
  views: Record<'pre' | 'post', { id: string; name?: string; sub?: string; task?: string; ids: string[] }[]>;
  handover: string; postEvent: { name: string; note: string }[];
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

export function roll(params: Params, random = Math.random): Risk[] {
  const pick = <T,>(choices: T[]) => choices[Math.floor(random() * choices.length)];
  const by = (stage: Stage) => config.riskTypes.filter((type) => type.stage === stage);
  const selected = [pick(by('pre')), pick(by('in')), pick(by('in')), pick(by('post'))];
  if (random() < .5) selected.push(pick(config.riskTypes));
  const seen = new Set<string>();
  return selected.flatMap(({ type, fields }) => {
    if (seen.has(type) && type !== 'outage') return [];
    seen.add(type);
    const choices = fields.map((field) => {
      if (field.type === 'team') return [field.k, pick(config.teamNames.slice(0, params.teams))];
      if (field.type === 'sel') return [field.k, pick(field.options)[0]];
      const hi = field.k === 'at' ? params.window - 1 : Math.min(field.max, Math.max(field.def * 2, field.min + 1));
      const lo = field.k === 'at' ? 1 : Math.max(field.min, Math.round(field.def / 2));
      return [field.k, Math.round(lo + random() * (hi - lo))];
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

export function slotState(result: Result, slot: Slot, time: number) {
  if (slot.kind === 'empty') return { kind: 'empty', label: '空档' } as const;
  if (time < slot.s) return { kind: 'wait', label: '等待' } as const;
  const outage = slot.outs.find(({ a, b }) => time >= a && time < b);
  if (outage && time < Math.max(slot.e, outage.b)) return { kind: 'out', label: '宕机', outage } as const;
  if (time < slot.e) {
    if (slot.seal != null && time >= slot.seal) return { kind: 'formal', label: '正式评测' } as const;
    if (slot.p1 != null && time >= slot.p1) return { kind: 'dev', label: '开发期' } as const;
    return { kind: 'p1', label: config.phases[0].name } as const;
  }
  const makeup = result.event.mk.find((entry) => entry.sl === slot);
  if (makeup && time < makeup.a) return { kind: 'mkwait', label: '等补赛' } as const;
  if (makeup && time < makeup.b) return { kind: 'mk', label: '补赛' } as const;
  if (slot.quit) return { kind: 'quit', label: '已退出' } as const;
  return { kind: 'done', label: '完成' } as const;
}

export function describeSlot(result: Result, slot: Slot, time: number) {
  const state = slotState(result, slot, time);
  const { F } = result;
  const notes = {
    empty: () => '赛前退出，空档作缓冲',
    wait: () => `${F.dt(slot.s)} 上机 · 还有 ${F.dur(slot.s - time)}${slot.delay ? `（比公布晚 ${F.dur(slot.delay)}）` : ''}`,
    p1: () => `${config.tasks.filter((task) => task.phase === 1).map(({ en }) => en).join('、')} · ${F.dur((slot.p1 ?? slot.e) - time)}后转开发期`,
    dev: () => `${config.tasks.filter((task) => task.phase !== 1).length} 类应用并行 · ${F.dur((slot.seal ?? slot.e) - time)}后封存`,
    formal: () => `组委会运行正式评测 · ${F.dur(slot.e - time)}后下机`,
    out: () => state.kind === 'out' ? `#${state.outage.n} 宕机 ${state.outage.hours} 小时${state.outage.comp ? '，补时' : state.outage.move ? '，剩余挪到补赛' : ''}` : '',
    mkwait: () => `剩余 ${slot.moved?.remain} 小时，等补赛`,
    mk: () => `补赛中 · 剩余 ${slot.moved?.remain} 小时`,
    quit: () => `第 ${slot.quit?.at} 小时退出，剩余作废`,
    done: () => `${F.dt(slot.e)} 下机${slot.makeup ? ` · 含补时 ${slot.makeup} 小时` : ''}`,
  };
  return { ...state, note: notes[state.kind]() };
}

export const shortLabel = (label: string) => label.split(/：| · |（| → /)[0];
export const stamp = (result: Result, hour: number) => atStage(result, hour) === 'in' ? result.F.dt(hour) : result.F.day(hour);
export function todayHour(result: Result) {
  const now = new Date();
  return (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - result.T0) / 3600000 + now.getHours();
}

export function clockOf(slot: Slot, wallHour: number, window: number) {
  if (wallHour >= slot.e) return slot.quit?.at ?? slot.moved?.from ?? window;
  let lo = 0, hi = window;
  for (let step = 0; step < 22; step++) {
    const middle = (lo + hi) / 2;
    if ((slot.wall?.(middle) ?? slot.s + middle) <= wallHour) lo = middle;
    else hi = middle;
  }
  return Math.floor(lo);
}

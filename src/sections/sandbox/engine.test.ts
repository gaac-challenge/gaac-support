import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
// @ts-expect-error These modules intentionally preserve the original JavaScript.
import * as engine from './engine.js';
// @ts-expect-error This module intentionally preserves the original JavaScript.
import scenario from './scenario.js';

const original = (file: string) => execFileSync('git', ['show', 'f90b82d:public/legacy/sandbox/' + file], { encoding: 'utf8' });
const legacy = { window: { GAACEngine: engine, SANDBOX: scenario } };
runInNewContext(original('engine.js'), legacy);
runInNewContext(original('scenario.js'), legacy);

type RiskDefinition = { type: string; fields: { k: string; def: unknown }[] };
type Risk = { type: string; [key: string]: unknown };
type Preset = { id: string; risks: Risk[] };
const types: RiskDefinition[] = scenario.riskTypes;
const presets: Preset[] = scenario.presets;

function risk({ type, ...overrides }: Risk) {
  const definition = types.find((item) => item.type === type)!;
  return { type, ...Object.fromEntries(definition.fields.map(({ k, def }) => [k, overrides[k] ?? def])) };
}

function snapshot(result: unknown) {
  return JSON.parse(JSON.stringify(result, (_key, value) =>
    typeof value === 'function' ? [-24, 0, 1, 12, 24, 30, 120, 168, 720].map((hour) => value(hour)) : value));
}

describe('sandbox engine golden parity', () => {
  const cases: [string, Risk[]][] = [
    ['default', []],
    ...presets.map(({ id, risks }): [string, Risk[]] => ['preset ' + id, risks.map(risk)]),
    ...types.map(({ type }): [string, Risk[]] => ['risk ' + type, [risk({ type })]]),
  ];
  it.each(cases)('%s', (_name, risks) => {
    const expected = legacy.window.GAACEngine.simulate(legacy.window.SANDBOX, { ...legacy.window.SANDBOX.defaults, dur: {} }, risks);
    const actual = engine.simulate(scenario, { ...scenario.defaults, dur: {} }, risks);
    expect(snapshot(actual)).toEqual(snapshot(expected));
  });
});

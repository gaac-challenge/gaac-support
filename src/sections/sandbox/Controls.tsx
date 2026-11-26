import { Icon } from './icons';
import { config, parameterFields, riskTypes, stamp, stageNames, type Params, type Result, type Risk, type Stage } from './simulation';

type Presets = { selected: string; choose: (id: string) => void };

export function TopControls({ selected, choose, reset, stage }: Presets & { stage: Stage; reset: () => void }) {
  return <div className="sandbox-top card">
    <span>GAAC / 全程沙盘 / <b>{stageNames[stage]}</b></span>
    <div className="sandbox-row">
      <label>情景 <select aria-label="情景" value={config.presets.some((preset) => preset.id === selected) ? selected : ''} onChange={(event) => choose(event.target.value)}>
        {config.presets.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        {!config.presets.some((preset) => preset.id === selected) && <option value="">{selected === '__dice' ? '随机' : '自定义'}</option>}
      </select></label>
      <button type="button" className="pill secondary" onClick={() => choose('__dice')}><Icon name="dice" />掷骰子</button>
      <button type="button" className="pill secondary" onClick={reset}><Icon name="reset" />恢复默认</button>
    </div>
  </div>;
}

export function RiskControls({ selected, choose, risks, result, params, add, edit, remove }: Presets & {
  risks: Risk[]; result: Result; params: Params; add: (type: string) => void;
  edit: (index: number, field: string, value: string | number) => void; remove: (index: number) => void;
}) {
  const active = config.presets.find(({ id }) => selected === id);
  return <div className="card sandbox-card">
    <div className="sandbox-row" role="group" aria-label="一键情景">
      {config.presets.map(({ id, name }) => <button type="button" className="pill secondary" key={id} aria-pressed={id === selected} onClick={() => choose(id)}>{name}</button>)}
      <button type="button" className="pill secondary" aria-pressed={selected === '__dice'} onClick={() => choose('__dice')}><Icon name="dice" />掷骰子</button>
      {risks.length > 0 && <button type="button" className="pill secondary" onClick={() => choose('__clear')}>清空</button>}
    </div>
    <p>{active?.desc ?? (selected === '__dice' ? '随机抽了几件事，赛前、赛中、赛后各至少一件。再掷一次换一组。' : '自定义组合。')}</p>
    {!risks.length && <p className="sandbox-risk-empty">还没有注入风险，现在看到的是预案本身的节奏。</p>}
    {risks.map((risk, index) => {
      const definition = riskTypes[risk.type];
      const outcome = result.risks[index];
      return <div key={index} className="sandbox-risk">
        <span className={'sandbox-icon-chip ' + definition.sev}>#{index + 1}</span>
        <div><strong>{definition.name}</strong> <small>{stageNames[definition.stage]} · 预案 {definition.ref}</small>
        <div className="sandbox-row">{definition.fields.map((field) => {
          const value = risk[field.k];
          const label = field.label || definition.name;
          const teams = config.teamNames.slice(0, params.teams);
          if (field.type === 'team' && !teams.includes(String(value))) teams.push(String(value));
          const options = field.type === 'team' ? teams.map((team) => [team, team + ' 队']) : field.type === 'sel' ? field.options : [];
          return <label key={field.k}>{field.label} {field.type === 'num'
            ? <input aria-label={label} type="number" min={field.min} max={field.max} value={value}
                onChange={(event) => { if (event.target.value !== '') edit(index, field.k, +event.target.value); }} />
            : <select aria-label={label} value={value} onChange={(event) => edit(index, field.k, event.target.value)}>
                {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
              </select>} {field.unit}</label>;
        })}</div>
        {outcome.status === 'dead' ? <p>{outcome.effect}</p> : outcome.status === 'hit' && <p><b>{outcome.effect}</b>{outcome.h != null && ' · ' + stamp(result, outcome.h)}</p>}
        </div>
        <div className="sandbox-row sandbox-risk-actions">
          <span className={'sandbox-badge ' + (outcome.status === 'hit' ? definition.sev : '')}>{outcome.status === 'dead' ? '未生效' : outcome.status === 'hit' ? '已触发' : '没有触发'}</span>
          <button type="button" className="pill secondary" aria-label="删除这条风险" onClick={() => remove(index)}><Icon name="x" /></button>
        </div>
      </div>;
    })}
    <label className="sandbox-add"><Icon name="plus" />
      <select aria-label="添加风险" value="" onChange={(event) => add(event.target.value)}>
        <option value="">添加一条风险…</option>
        {Object.entries(stageNames).map(([stage, label]) => <optgroup key={stage} label={label}>
          {config.riskTypes.filter((risk) => risk.stage === stage).map(({ type, name }) => <option key={type} value={type}>{name}</option>)}
        </optgroup>)}
      </select>{risks.length > 0 && <small>共 {risks.length} 条</small>}
    </label>
  </div>;
}

export function Parameters({ params, change, literal }: { params: Params; change: (key: string, value: string | number) => void; literal: () => void }) {
  return <>
    <button className="pill secondary" type="button" aria-pressed={Object.entries(config.literal).every(([key, value]) => params[key] === value)} onClick={literal}>官网字面口径</button>
    <div className="sandbox-parameter-grid">{['赛制', '赛前', '预案'].map((group) => <div key={group} className="sandbox-card card">
      <div className="sandbox-life-title"><h3>{group}</h3><small>{group === '赛制' ? '每队的窗口和阶段' : group === '赛前' ? '准备的假设' : '换队、补时和节假日的规则'}</small></div>
      {parameterFields.filter(({ g }) => g === group).map((field) => <div className="sandbox-param" key={field.k}>
        <div><strong>{field.label}</strong><small>{field.help}</small></div>
        {field.type === 'seg' ? <div className="sandbox-row" role="group" aria-label={field.label}>
          {field.options.map(([value, name]) => <button className="pill secondary" type="button" key={value} aria-pressed={params[field.k] === value} onClick={() => change(field.k, value)}>{name}</button>)}
        </div> : field.type === 'hour' ? <select aria-label={field.label} value={params.hour} onChange={(event) => change(field.k, +event.target.value)}>
          {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
        </select> : field.type === 'num' ? <div className="sandbox-row sandbox-stepper">
          <button type="button" aria-label="减少" onClick={() => change(field.k, Number(params[field.k]) - ('step' in field ? field.step : 1))}>−</button>
          <input aria-label={field.label} type="number" min={field.min} max={field.max} step={'step' in field ? field.step : 1} value={String(params[field.k])}
            onChange={(event) => { if (event.target.value) change(field.k, +event.target.value); }} />
          <button type="button" aria-label="增加" onClick={() => change(field.k, Number(params[field.k]) + ('step' in field ? field.step : 1))}>+</button>
        </div> : <input aria-label={field.label} type="date" value={String(params[field.k])}
          onChange={(event) => { if (event.target.value) change(field.k, event.target.value); }} />}
      </div>)}
    </div>)}</div>
  </>;
}

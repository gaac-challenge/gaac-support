import { useEffect, useRef } from 'react';
import { Icon } from './icons';
import { shortLabel, stamp, type Params, type Result } from './simulation';

const categories: Record<string, [string, string, string]> = {
  ms: ['flag', '', '节点'], act: ['dot', '', '进展'], risk: ['alert', 'critical', '风险'],
  resp: ['arrow', 'info', '应对'], warn: ['alert', 'warning', '隐患'], info: ['info', '', '提示'],
};
const filters = [['all', '全部'], ['risk', '风险与应对'], ['ms', '节点']];

export function LogPanel({ result, params, time, filter, setFilter, seek }: {
  result: Result; params: Params; time: number; filter: string; setFilter: (filter: string) => void; seek: (hour: number) => void;
}) {
  const rows = result.log.filter(({ kind }) => filter === 'all' || (filter === 'risk' ? ['risk', 'resp', 'warn'].includes(kind) : ['ms', 'warn'].includes(kind)));
  const index = rows.reduce((current, row, position) => row.h <= time ? position : current, -1);
  const list = useRef<HTMLOListElement>(null);
  const active = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (index < 0 && list.current) { list.current.scrollTop = 0; return; }
    if (!active.current || !list.current) return;
    const top = active.current.offsetTop - list.current.offsetTop;
    if (top < list.current.scrollTop + 8 || top > list.current.scrollTop + list.current.clientHeight - 60) {
      list.current.scrollTop = Math.max(0, top - list.current.clientHeight / 3);
    }
  }, [index]);
  const { F, HM, metrics } = result;
  const warnings = result.warns.map((warning) => ({ title: warning.name, detail: (warning.consequence || '') +
    (warning.state === 'drop' ? '开赛后机器被占用，补不了。' : warning.state === 'short' ? `练习期实际只有 ${F.days(warning.leadGot)}。` : '') }));
  if (HM > Number(params.gap)) warnings.push({ title: `交接要 ${HM} 小时，间隔只有 ${params.gap} 小时`,
    detail: `每次换队把下一队往后推 ${HM - Number(params.gap)} 小时，延误一路传到最后一队。` });
  if (metrics.over > 0) warnings.push({ title: `比公布的赛程晚 ${F.dur(metrics.over)}结束`,
    detail: `${metrics.delayedN} 队晚开表，最多晚 ${F.dur(metrics.maxDelay)}${metrics.movedN ? `；${metrics.movedN} 队挪到补赛窗口` : ''}。` });
  const negative = result.prep.list.filter(({ slack, durH }) => slack != null && slack < 0 && durH > 0);
  const nearly = result.prep.list.filter(({ slack, durH }) => slack != null && slack >= 0 && slack < 24 && durH > 0);
  if (negative.length && params.launch === 'gate') warnings.push({ title: `${negative.length} 项赛前任务赶不上原定开赛`,
    detail: `${negative.slice(0, 5).map(({ name }) => shortLabel(name)).join('、')}${negative.length > 5 ? ' 等' : ''}，所以开赛推迟。` });
  if (nearly.length) warnings.push({ title: `${nearly.length} 项赛前任务余量不到 1 天`, detail: `${nearly.map(({ name }) => shortLabel(name)).join('、')}：再晚一天就会推迟开赛。` });
  if (metrics.prizeExt) warnings.push({ title: '奖金发放撞上春节', detail: `顺延 ${F.days(metrics.prizeExt)}。预案 §3 提醒过：赛后计划和奖金发放要避开春节。` });
  return <>
    <div className="sandbox-row" role="group" aria-label="日志筛选">{filters.map(([value, label]) =>
      <button className="pill secondary" key={value} type="button" aria-pressed={value === filter} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="sandbox-overview-grid sandbox-log-grid">
      <div className="card sandbox-card">
        <div className="sandbox-life-title"><h3>{rows.length} 条</h3><small>浅色的是时间轴之后才发生的</small></div>
        <ol className="sandbox-log" ref={list}>{rows.length ? rows.map(({ h, title, text, kind, n }, i) => {
          const [icon, tone, label] = categories[kind] ?? categories.info;
          return <li key={i} data-future={h > time} data-current={i === index} ref={i === index ? active : undefined}>
            <button type="button" onClick={() => seek(Math.ceil(h))}>
              <span>{stamp(result, h)}</span><span className={'sandbox-icon-chip ' + tone}>{kind === 'risk' && n ? '#' + n : <Icon name={icon} />}</span>
              <div><b>{kind === 'risk' && n ? title.replace(/^#\d+\s*/, '') : title}</b>{text && <small>{text}</small>}</div>
              <span className="sandbox-badge">{label}</span>
            </button>
          </li>;
        }) : <li>没有符合筛选的条目。</li>}</ol>
      </div>
      <div className="sandbox-alerts">
        <div className="card sandbox-card"><div className="sandbox-life-title"><h3>可能引出的争执</h3><small>预案 §5</small></div>
          {result.disputes.length ? result.disputes.slice().sort((a, b) => b.star - a.star).map((issue) => <div className="sandbox-finding" key={issue.id}>
            <span className={'sandbox-icon-chip ' + (issue.star ? 'critical' : 'warning')}><Icon name={issue.star ? 'alert' : 'info'} /></span>
            <div><b>{issue.star ? '★ ' : ''}{issue.name}<span className="sandbox-badge">{issue.area}</span>
              {issue.by.length > 0 && <span className="sandbox-badge">{issue.by.join('、')} 队</span>}</b><p>预防：{issue.prevent}</p></div>
          </div>) : <p>这个情景没有推演出争执。</p>}
        </div>
        <div className="card sandbox-card"><div className="sandbox-life-title"><h3>排期里的隐患</h3><small>不注入风险也可能有</small></div>
          {warnings.length ? warnings.map(({ title, detail }, i) => <div className="sandbox-finding" key={i}>
            <span className="sandbox-icon-chip warning"><Icon name="alert" /></span><div><b>{title}</b>{detail && <p>{detail}</p>}</div>
          </div>) : <p>没有推演出隐患。</p>}
        </div>
      </div>
    </div>
  </>;
}

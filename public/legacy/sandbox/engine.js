/* =====================================================================
 * GAAC 全程沙盘 · 推演引擎
 *
 * 纯计算，不碰页面：输入 场景配置 C（scenario.js）、参数 P、风险列表，
 * 输出赛前排期、赛中上机、赛后步骤、时间线条目、推演日志和结果。
 * 时间单位是小时；0 = 计划开赛日期的 00:00。
 * 规则出处：GAAC_赛务准备与预案_v0.1.md 第 3–7 节。
 * ===================================================================== */
(function (root) {
  'use strict';
  const HR = 3600e3;
  const pad = n => String(n).padStart(2, '0');
  const WD = '日一二三四五六';

  function isoUTC(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    const v = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return new Date(v).getUTCDate() === +m[3] ? v : null;
  }

  function makeFmt(T0) {
    const y0 = new Date(T0).getUTCFullYear();
    const D = h => new Date(T0 + Math.round(h) * HR);
    const yp = (d, s) => d.getUTCFullYear() !== y0 ? d.getUTCFullYear() + s : '';
    return {
      D, y0,
      day: h => { const d = D(h); return `${yp(d, '/')}${d.getUTCMonth() + 1}/${d.getUTCDate()}`; },
      dt: h => { const d = D(h); return `${yp(d, '/')}${d.getUTCMonth() + 1}/${d.getUTCDate()} ${pad(d.getUTCHours())}:00`; },
      dateCN: h => { const d = D(h); return `${yp(d, '年')}${d.getUTCMonth() + 1}月${d.getUTCDate()}日`; },
      long: h => { const d = D(h); return `${yp(d, '年')}${d.getUTCMonth() + 1}月${d.getUTCDate()}日 周${WD[d.getUTCDay()]} ${pad(d.getUTCHours())}:00`; },
      dayLong: h => { const d = D(h); return `${yp(d, '年')}${d.getUTCMonth() + 1}月${d.getUTCDate()}日 周${WD[d.getUTCDay()]}`; },
      dur: h => {
        h = Math.round(h); const neg = h < 0; h = Math.abs(h);
        const d = Math.floor(h / 24), r = h % 24;
        return (neg ? '−' : '') + (d && r ? `${d} 天 ${r} 小时` : d ? `${d} 天` : `${r} 小时`);
      },
      days: h => { const v = Math.round(h / 24 * 10) / 10; return `${v} 天`; }
    };
  }

  /* 依赖排期：最早开始 = max(基准, 不早于, 各前置完成)；可选避开一段假期 */
  function dag(list, base, align) {
    const by = new Map(list.map(t => [t.id, t]));
    const order = [], state = new Map();
    const visit = t => {
      const s = state.get(t.id);
      if (s === 2) return;
      if (s === 1) throw new Error('循环依赖：' + t.id);
      state.set(t.id, 1);
      (t.deps || []).forEach(d => { const x = by.get(d); if (x) visit(x); });
      state.set(t.id, 2);
      order.push(t);
    };
    list.forEach(visit);
    order.forEach(t => {
      let es = base, why = null;
      if (t.notBefore != null && t.notBefore > es) { es = t.notBefore; why = 'notBefore'; }
      (t.deps || []).forEach(d => { const x = by.get(d); if (x && x.ef > es) { es = x.ef; why = x.id; } });
      if (align && t.durH > 0) es = align(es);
      t.ext = 0; t.es0 = es;
      if (t.avoidRange && t.durH > 0) {
        const [a, b] = t.avoidRange;
        if (es >= a && es < b) { es = align ? align(b) : b; t.ext = es - t.es0; }
        t.es = es; t.ef = es + t.durH;
        if (es < a && t.ef > a) { t.ef += b - a; t.ext += b - a; }
      } else { t.es = es; t.ef = es + t.durH; }
      t.why = why;
    });
    return order;
  }

  function simulate(C, P, riskList) {
    const T0 = isoUTC(P.start);
    const F = makeFmt(T0);
    const dH = iso => { const v = isoUTC(iso); return v == null ? null : (v - T0) / HR; };
    const RU = C.rules || {};
    const NAMES = C.teamNames;
    const n = P.teams, W = P.window, P1 = P.phase1, SP = P.sealAt, G = P.gap;
    const types = Object.fromEntries((C.riskTypes || []).map(t => [t.type, t]));
    const lanesById = Object.fromEntries((C.lanes || []).map(l => [l.id, l]));

    const log = [], flags = [], items = [], warns = [];
    const dmap = new Map();
    const dispute = (id, by) => {
      const d = (C.disputes || {})[id]; if (!d) return;
      const x = dmap.get(id) || { id, ...d, by: [] };
      if (by && !x.by.includes(by)) x.by.push(by);
      dmap.set(id, x);
    };
    const say = (h, kind, lane, title, text, x) => log.push({ h, kind, lane, title, text: text || '', ...(x || {}) });

    /* ---------- 风险实例 ---------- */
    const risks = (riskList || []).map((r, i) => ({ ...r, n: i + 1, def: types[r.type], status: 'pending', effect: '' }));
    const teamIdx = L => { const i = NAMES.indexOf(L); return i > -1 && i < n ? i : -1; };
    risks.forEach(r => {
      if (!r.def) { r.status = 'dead'; r.effect = '未知风险类型'; return; }
      if (r.def.fields.some(f => f.type === 'team') && teamIdx(r.team) < 0) { r.status = 'dead'; r.effect = `现在只有 ${n} 队，没有 ${r.team} 队`; }
    });
    const live = type => risks.filter(r => r.type === type && r.status !== 'dead');
    const hit = (r, h, title, effect) => {
      if (r.status !== 'hit') flags.push({ h, n: r.n, sev: r.def.sev, title, type: r.type, team: r.team, stage: r.def.stage });
      r.status = 'hit'; if (r.h == null) r.h = h; if (effect) r.effect = effect;
    };
    const kill = (r, why) => { r.status = 'dead'; r.effect = why; };

    /* =================== 赛前 =================== */
    const prepStart = dH(P.prepStart);
    const planned = P.hour;
    const arrive = Math.max(prepStart, dH(P.edgepodArrive) ?? prepStart);
    const epLate = live('edgepod_late');
    const epDays = epLate.reduce((a, r) => a + r.days, 0);
    const lead = t => t.lead ? (P[t.lead] || 0) * 24 : 0;

    const prep = [];
    (C.prep || []).forEach(t => {
      if (P.scope === 'mvp' && t.mvpSkip) return;
      const base = P.dur && Number.isFinite(P.dur[t.id]) ? P.dur[t.id] : (P.scope === 'mvp' && t.mvp != null ? t.mvp : t.days);
      let extra = 0; const hits = [];
      risks.forEach(r => {
        if (r.status === 'dead' || r.type === 'edgepod_late') return;
        if ((r.type === 'bench_late' && t.bench === r.bench) || (t.risk && r.type === t.risk)) { extra += r.days; hits.push(r); }
      });
      let nb = null;
      if (t.notBefore === 'edgepodArrive') { nb = arrive + epDays * 24; epLate.forEach(r => hits.push(r)); }
      prep.push({ ...t, stage: 'pre', base, days: base + extra, extra, durH: (base + extra) * 24, notBefore: nb, hits });
    });
    const prepOrder = dag(prep, prepStart);
    const pById = new Map(prep.map(t => [t.id, t]));

    // 启动门禁
    const gates = prep.filter(t => t.gate);
    let gateReady = -Infinity, gateBy = null, hardReady = -Infinity;
    gates.forEach(t => {
      t.ready = t.ef + lead(t);
      if (t.ready > gateReady) { gateReady = t.ready; gateBy = t; }
      if (t.gate === 'hard' && t.ready > hardReady) hardReady = t.ready;
    });
    const alignUp = h => h <= planned ? planned : planned + Math.ceil((h - planned) / 24 - 1e-9) * 24;
    const start = P.launch === 'gate' ? alignUp(gateReady) : alignUp(hardReady);

    // 关键路径（决定门禁时间的那条链）
    const crit = [];
    for (let c = gateBy; c; c = c.why && c.why !== 'notBefore' ? pById.get(c.why) : null) { c.crit = true; crit.unshift(c); }
    const critFromArrival = crit.length && crit[0].why === 'notBefore' && crit[0].notBefore > prepStart;

    // 余量：以计划开赛为截止的倒推
    const succ = new Map();
    prep.forEach(t => (t.deps || []).forEach(d => { if (pById.has(d)) { if (!succ.has(d)) succ.set(d, []); succ.get(d).push(t); } }));
    [...prepOrder].reverse().forEach(t => {
      let lf = t.gate ? planned - lead(t) : Infinity;
      (succ.get(t.id) || []).forEach(s => { if (s.ls != null && s.ls < lf) lf = s.ls; });
      if (lf === Infinity) { t.ls = null; t.slack = null; } else { t.ls = lf - t.durH; t.slack = lf - t.ef; }
    });

    // 开赛时各任务的状态
    prep.forEach(t => {
      const ready = t.ef + lead(t);
      if (ready <= start) t.state = 'ok';
      else if (t.lead && t.ef <= start) { t.state = 'short'; t.leadGot = start - t.ef; }
      else if (t.machine) t.state = 'drop';
      else t.state = 'late';
    });

    say(prepStart, 'ms', 'ms', '赛前准备开始', `距计划开赛 ${F.dur(planned - prepStart)}。${P.scope === 'mvp' ? 'Benchmark 按最低可用版准备（预案 §2.4）。' : 'Benchmark 按完整版准备。'}`);
    if (arrive > prepStart || epDays) {
      say(arrive, 'act', 'pod', 'EdgePod 原定到位', epDays ? '' : '到位后先验收，再装镜像。');
    }
    // 赛前风险
    epLate.forEach(r => {
      const t = pById.get('pod_accept');
      hit(r, arrive, `EdgePod 晚到 ${r.days} 天`, `${F.day(t.es)} 才到位`);
      say(arrive, 'risk', 'pod', `#${r.n} EdgePod 晚到 ${r.days} 天`, `${F.day(t.es)} 才到位。${impact(t)}`, { n: r.n });
    });
    prep.forEach(t => t.hits.forEach(r => {
      if (r.type === 'edgepod_late') return;
      const h0 = t.es + t.base * 24;
      hit(r, h0, `${t.name} 延误 ${r.days} 天`, `${t.name} 推到 ${F.day(t.ef)}`);
      say(h0, 'risk', t.lane, `#${r.n} ${r.def.name}`, `${t.name}原定 ${F.day(h0)} 完成，延误 ${r.days} 天，${F.day(t.ef)} 才完成。${impact(t)}`, { n: r.n });
    }));
    function impact(t) {
      if (t.crit) return P.launch === 'gate' ? '这件事在关键路径上，启动门禁跟着推迟。' : '这件事在关键路径上，硬开就会带着没做完的准备开赛。';
      if (t.slack == null) return '不影响开赛。';
      return t.slack >= 0 ? `还有 ${F.days(t.slack)}余量，不影响开赛。` : `超出余量 ${F.days(-t.slack)}，但另一条线更晚，开赛时间由那条线决定。`;
    }
    ['publish', 'practice', 'draw'].forEach(id => {
      const t = pById.get(id); if (!t) return;
      const txt = id === 'practice' ? `所有正式队和候补队同一天拿到练习环境和公开样例。要求开赛前至少 ${P.practiceLead} 天开放。` : id === 'draw' ? '材料发布之后再抽签，避免先知道顺序的队占便宜。' : '规则冻结，赛中不改。';
      say(t.ef, 'ms', t.lane, t.name, txt);
    });

    const HS = live('handover_slow');
    const HM = HS.length ? Math.max(...HS.map(r => r.hours)) : P.handover;
    HS.forEach(r => {
      const d = pById.get('drills');
      const h = d && d.state !== 'drop' ? d.ef : start;
      const over = r.hours > G;
      const known = d && d.state !== 'drop';
      hit(r, h, `交接实测 ${r.hours} 小时`, over ? `超过 ${G} 小时间隔` : '间隔还够');
      say(h, 'risk', 'pod', `#${r.n} ${known ? '演练实测' : '交接没实测，实际'}交接要 ${r.hours} 小时`,
        `原估 ${P.handover} 小时。${over ? `超过换队间隔 ${G} 小时：每次换队都会把下一队往后推 ${r.hours - G} 小时。应对：把间隔加到 ${Math.ceil(r.hours / 6) * 6} 小时以上，或接受推迟。` : `换队间隔 ${G} 小时还够。`}`, { n: r.n });
    });
    if (!HS.length && HM > G) {
      say(start, 'warn', 'pod', `交接要 ${HM} 小时，换队间隔只有 ${G} 小时`, `每次换队都会把下一队往后推 ${HM - G} 小时。官网没写间隔；预案建议留 24 小时（§4）。`);
    }

    const NS = live('holiday_nosupport');
    const plan = P.holidayPlan === 'pause' || NS.length ? 'pause' : 'keep';
    NS.forEach(r => {
      const ro = pById.get('roster');
      const h = ro ? ro.ef : start - 24 * 7;
      hit(r, h, '节假日保障锁不定', P.holidayPlan === 'pause' ? '已是节前停赛方案' : '改用节前停赛');
      say(h, 'risk', 'duty', `#${r.n} 节假日厂商现场支持锁不定`, P.holidayPlan === 'pause' ? '已经采用节前停赛方案，不受影响。' : `→ 改用节前停赛方案：${F.day(dH(C.holidayPause.from))}–${F.day(dH(C.holidayPause.to) - 24)} 不排队伍（预案 §3）。`, { n: r.n });
    });

    // 门禁与开赛
    const critTxt = crit.map(t => t.name.split('：')[0].split(' · ')[0]).join(' → ');
    say(gateReady, 'ms', 'ms', '启动门禁全部满足', `最后满足的是“${gateBy ? gateBy.name : ''}”${gateBy && gateBy.lead ? `（加 ${P.practiceLead} 天练习期）` : ''}。关键路径：${critFromArrival ? 'EdgePod 到位 → ' : ''}${critTxt}。`);
    const unfinished = gates.filter(t => t.state !== 'ok');
    if (start > planned) {
      say(start - 1e-3, 'warn', 'ms', `开赛推迟 ${F.dur(start - planned)}`,
        P.launch === 'gate' ? `按启动门禁开赛：原定 ${F.dt(planned)}，门禁 ${F.dt(gateReady)} 才满足 → ${F.dt(start)} 开赛，提前通知各队。` :
          `想按日期硬开，但“${prep.filter(t => t.gate === 'hard' && t.ready > planned).map(t => t.name).join('、')}”没完成，硬开不成立，最早 ${F.dt(start)}。`);
    }
    unfinished.forEach(t => {
      warns.push({ id: t.id, name: t.name, consequence: t.consequence || '', state: t.state, leadGot: t.leadGot });
      const extra = t.state === 'drop' ? '开赛后机器被比赛占用，补不了。' : t.state === 'short' ? `实际只有 ${F.days(t.leadGot)}。` : `预计 ${F.day(t.ef)} 才完成。`;
      say(start, 'warn', t.lane, `带着没做完的准备开赛：${t.name}`, `${t.consequence || ''}${extra}`);
    });
    if (unfinished.length) dispute('rush');
    if (unfinished.some(t => t.id === 'practice')) dispute('practice');
    say(start, 'ms', 'ms', '开赛', `${F.long(start)}。${n} 队按抽签顺序依次独占 EdgePod，每队 ${W} 小时。`);

    /* =================== 赛中 =================== */
    const pz = C.holidayPause || { from: '2026-12-22', to: '2027-01-04' };
    const pzA = dH(pz.from), pzB = dH(pz.to), pzStart = pzB + P.hour;
    const avoid = (s, len) => (plan === 'pause' && s < pzB && s + len > pzA) ? Math.max(s, pzStart) : s;
    const annNP = [], ann = [];
    { let a = start, b = start; for (let i = 0; i < n; i++) { annNP.push(a); a += W + G; b = avoid(b, W); ann.push(b); b += W + G; } }
    if (plan === 'pause') {
      const moved = ann.map((a, i) => a !== annNP[i] ? NAMES[i] : null).filter(Boolean);
      if (moved.length) say(pzA, NS.length ? 'resp' : 'info', 'ms', '节前停赛', `${F.day(pzA)}–${F.day(pzB - 24)} 不排队伍；${moved.join('、')} 队改到 ${F.dt(pzStart)} 起，最后一队晚 ${F.dur(ann[n - 1] - annNP[n - 1])}下机。`, NS.length ? { n: NS[0].n } : {});
    }

    const ro = pById.get('roster'), ju = pById.get('judges');
    const rosterOk = !ro || ro.state === 'ok';
    const judgesReady = ju ? ju.ef : start;
    const sbNames = NAMES.slice(n, n + P.standby);
    let sbUsed = 0, free = start;
    const slots = [], queue = [], egressFormal = [], modelFix = [];
    const leakIdx = Math.min(...live('leak').map(r => teamIdx(r.team)), Infinity);

    for (let i = 0; i < n; i++) {
      const T = NAMES[i], a0 = ann[i];
      const sl = { i, L: T, who: T, kind: 'team', ann: a0, annEnd: a0 + W, outs: [], makeup: 0, lost: 0, delay: 0, standbyQ: i > leakIdx, hol: [] };
      slots.push(sl);
      const qb = live('team_quit_before').find(r => r.team === T);
      if (qb) {
        const h = a0 - qb.days * 24;
        if (qb.days >= RU.standbyNotice && sbUsed < sbNames.length) {
          sl.who = sbNames[sbUsed++]; sl.kind = 'standby';
          hit(qb, h, `${T} 队赛前退出`, `候补 ${sl.who} 队补位`);
          say(h, 'risk', 'svc', `#${qb.n} ${T} 队赛前退出`, `距窗口还有 ${qb.days} 天，不少于 ${RU.standbyNotice} 天 → 候补 ${sl.who} 队补位，用 ${T} 队的窗口（${F.dt(a0)} 上机）。候补队和正式队同一天拿到练习环境。`, { n: qb.n });
        } else {
          sl.kind = 'empty'; sl.s = a0; sl.e = a0 + W;
          const why = qb.days < RU.standbyNotice ? `距窗口只有 ${qb.days} 天，不到 ${RU.standbyNotice} 天，候补来不及准备` : `${P.standby} 支候补已经用完`;
          hit(qb, h, `${T} 队赛前退出`, '空档转缓冲');
          say(h, 'risk', 'svc', `#${qb.n} ${T} 队赛前退出`, `${why} → ${T} 队的 ${W} 小时空出来作缓冲；后面的队按公布时间上机，不提前。`, { n: qb.n });
          [...live('outage'), ...live('team_quit_during'), ...live('egress'), ...live('person'), ...live('model_bug'), ...live('handover_fail'), ...live('appeal'), ...live('restore_fail')]
            .filter(r => r.team === T).forEach(r => kill(r, `${T} 队已退出，窗口空着`));
          continue;
        }
      }
      const s = avoid(Math.max(a0, free), W);
      sl.s = s; sl.delay = s - a0;
      const who = sl.who;
      const outsAll = live('outage').filter(r => r.team === T);
      outsAll.filter(r => r.at >= W).forEach(r => kill(r, `第 ${r.at} 小时超出 ${W} 小时窗口`));
      const outs = outsAll.filter(r => r.at < W).sort((x, y) => x.at - y.at);
      const qd = live('team_quit_during').find(r => r.team === T);
      if (qd && qd.at >= W) kill(qd, `第 ${qd.at} 小时超出 ${W} 小时窗口`);
      const stopAt = qd && qd.status !== 'dead' ? qd.at : W;
      const big = outs.find(o => o.cause === 'platform' && o.hours > P.moveOver && o.at < stopAt);
      const endClock = big ? big.at : stopAt;
      const plat = outs.filter(o => o.cause === 'platform' && o !== big && o.at < endClock);
      const D = plat.reduce((a, o) => a + o.hours, 0);
      const comp = D > P.noMakeupMax;
      const wall = c => s + c + (comp ? plat.filter(o => o.at < c).reduce((a, o) => a + o.hours, 0) : 0);
      sl.p1 = P1 < endClock ? wall(P1) : null;
      sl.seal = SP < endClock ? wall(SP) : null;
      sl.e = wall(endClock);
      sl.makeup = comp ? D : 0;
      sl.wall = wall;

      // 开表
      if (i > 0 && sl.delay > 0) {
        const pv = slots.slice(0, i).reverse().find(x => x.kind !== 'empty');
        const why = [];
        if (pv && pv.makeup) why.push(`${pv.who} 队补时 ${pv.makeup} 小时`);
        if (pv && pv.ho && pv.ho.extra) why.push(`交接多花 ${pv.ho.extra} 小时`);
        if (pv && pv.moved) why.push(`${pv.who} 队长时间宕机后的修复和归档`);
        if (HM > G) why.push(`交接要 ${HM} 小时，间隔只有 ${G} 小时`);
        if (pv && pv.delay > 0 && !why.length) why.push('前面的推迟传下来');
        say(s, 'warn', 'pod', `${who} 队开表推迟 ${F.dur(sl.delay)}`, `公布的上机时间是 ${F.dt(a0)}，机器 ${F.dt(s)} 才交接完。原因：${why.join('；') || '前面的推迟传下来'}。换队间隔被吃光后，延误会一路传到最后一队。`);
        dispute('delay', who);
      }
      say(s, 'act', 'pod', `${who} 队上机${sl.kind === 'standby' ? `（候补，接 ${T} 队的窗口）` : ''}`, `第一阶段 ${P1} 小时：Infrastructure，开卷。开表时交基线报告给队伍。${sl.standbyQ ? '本队使用备用题。' : ''}`);
      if (sl.p1 != null) say(sl.p1, 'act', 'pod', `${who} 队转入第二阶段开发期`, '三类应用 Deep Research、Making PPT、Financial Analysis 全部必做。');
      if (sl.seal != null) say(sl.seal, 'act', 'pod', `${who} 队封存（记哈希）`, '之后由组委会按脚本运行正式评测：断网考场，正式题和正式数据这时才发，队伍不碰机器。');

      // 宕机
      outs.forEach(o => {
        if (o !== big && o.at >= endClock) { kill(o, big ? '这之前已挪到补赛窗口' : '队伍已退出'); return; }
        const a = wall(o.at);
        const isComp = o.cause === 'platform' && o !== big && comp;
        sl.outs.push({ a, b: a + o.hours, cause: o.cause, comp: isComp, move: o === big, n: o.n, at: o.at, hours: o.hours });
        let txt, eff;
        if (o === big) { txt = `平台故障，单次超过 ${P.moveOver} 小时 → 先归档现场；剩余 ${W - o.at} 小时挪到补赛窗口；${i === n - 1 ? '已是最后一队，机器修好、交接完就接着补赛' : '修好并交接后照常交给下一队'}。`; eff = `剩余 ${W - o.at} 小时挪到补赛窗口`; }
        else if (o.cause === 'platform' && comp) { txt = `平台故障，本队累计 ${D} 小时，超过 ${P.noMakeupMax} 小时 → 停表修复，补等长时间，下机顺延到 ${F.dt(sl.e)}。故障记录在窗口内双方签字。`; eff = `补时 ${D} 小时`; }
        else if (o.cause === 'platform') { txt = `平台故障，本队累计 ${D} 小时，不超过 ${P.noMakeupMax} 小时 → 不补时（阈值赛前公布）。`; eff = '不补时'; sl.lost += o.hours; }
        else if (o.cause === 'team') { txt = `队伍自己弄崩 → 不停表、不补时；回滚到最近一次快照（每 ${RU.snapshotEvery} 小时一份，另存独立存储）。`; eff = '不补时，回滚快照'; sl.lost += o.hours; }
        else { txt = '部分故障，队伍选择降配继续 → 不停表、不补时；本队成绩标“条件不一致”。'; eff = '降配继续，标“条件不一致”'; sl.degraded = true; dispute('degraded', who); }
        hit(o, a, `${who} 队第 ${o.at} 小时宕机 ${o.hours} 小时`, eff);
        say(a, 'risk', 'pod', `#${o.n} ${who} 队第 ${o.at} 小时宕机 ${o.hours} 小时`, txt, { n: o.n });
      });
      if (comp) dispute('makeup', who); else if (D > 0) dispute('lost', who);

      // 中途退出
      if (qd && qd.status !== 'dead') {
        if (big && qd.at > big.at) kill(qd, '宕机后已挪到补赛窗口');
        else {
          sl.quit = { at: qd.at, voidH: W - qd.at };
          hit(qd, sl.e, `${who} 队第 ${qd.at} 小时退出`, `剩余 ${W - qd.at} 小时作废`);
          say(sl.e, 'risk', 'svc', `#${qd.n} ${who} 队第 ${qd.at} 小时退出`, `剩余 ${W - qd.at} 小时作废；后面的队按公布时间上机，不提前，空出的时间作缓冲。成果和署名按报名协议处理。`, { n: qd.n });
          dispute('quit', who);
        }
      }
      if (big) { sl.moved = { from: big.at, remain: W - big.at, n: big.n, repairEnd: sl.e + big.hours }; queue.push(sl); }

      // 人员变动
      live('person').filter(r => r.team === T).forEach(r => {
        const h = r.when === 'early' ? a0 - 72 : r.when === 'late' ? a0 - 24 : sl.wall(Math.min(60, endClock));
        const lock = RU.personLock;
        let txt, eff;
        if (r.kind === 'quit') {
          if (r.when === 'early') { txt = `窗口开始 ${lock} 小时以前 → 可以一换一补人，替补要过审核、签许可。`; eff = '一换一补人'; }
          else if (r.when === 'late') { txt = `离窗口不到 ${lock} 小时，名单已锁定 → 不补人，照常比赛，哪怕少于 3 人。`; eff = '不补人，照常比'; }
          else { txt = '窗口中有人退出 → 照常比，不取消资格（哪怕少于 3 人）；成果和署名按报名时的约定。'; eff = '照常比'; dispute('quit', who); }
        } else {
          if (r.when === 'early') { txt = `窗口开始 ${lock} 小时以前 → 可以加人，要过审核、签许可。`; eff = '可以加人'; }
          else { txt = `${r.when === 'late' ? `名单在窗口前 ${lock} 小时锁定` : '窗口开始后'} → 不能加人。`; eff = '不能加人'; }
        }
        hit(r, h, `${who} 队${r.kind === 'quit' ? '有人退出' : '想加人'}`, eff);
        say(h, 'risk', 'svc', `#${r.n} ${who} 队${r.kind === 'quit' ? '有人退出' : '想加人'}`, txt, { n: r.n });
      });

      // 出网告警
      live('egress').filter(r => r.team === T).forEach(r => {
        if (r.at >= endClock) { kill(r, '队伍已下机'); return; }
        const h = wall(r.at);
        if (r.at < SP) {
          hit(r, h, `${who} 队开发期有出网请求`, '开发期允许，不算告警');
          say(h, 'info', 'rules', `#${r.n} ${who} 队开发期有出网请求`, `第 ${r.at} 小时还在开发期（第 ${SP} 小时封存），开发期可以联网用工具（待决事项 7），不算告警。告警只针对封存后的正式评测。`, { n: r.n });
          return;
        }
        egressFormal.push({ r, who, h });
        hit(r, h, `${who} 队正式评测中出网尝试`, '保全日志，赛后调查');
        say(h, 'risk', 'rules', `#${r.n} ${who} 队正式评测中出网尝试被拦下`, '交换机默认禁止出网，请求没出去。告警只作调查线索，不直接认定作弊：保全日志，赛后调查；结论出来前成绩单不发。', { n: r.n });
        dispute('dq', who);
      });

      // 本地模型 bug
      live('model_bug').filter(r => r.team === T).forEach(r => {
        const h = sl.seal != null ? sl.seal + 12 : sl.p1 != null ? sl.p1 + 12 : s + 12;
        if (r.fix === 'fix') {
          modelFix.push(r);
          hit(r, h, `${who} 队评测中发现本地模型 bug`, '修复，五队全部重评');
          say(h, 'risk', 'pod', `#${r.n} ${who} 队评测中发现本地模型或封存版本 bug`, `选择修复：后面的队用修复后的版本；已比完的队赛后用存档重跑，五队全部重评（约 ${RU.modelFixDays} 天）。`, { n: r.n });
        } else {
          hit(r, h, `${who} 队评测中发现本地模型 bug`, '五队都不修');
          say(h, 'risk', 'pod', `#${r.n} ${who} 队评测中发现本地模型或封存版本 bug`, '选择五队都不修：bug 对每队一样，记录在案，赛后在成绩说明里写明。', { n: r.n });
        }
      });

      // 下机与交接
      const isLastPlay = !slots.slice(i + 1).length;
      if (!sl.quit && !big) say(sl.e, 'act', 'pod', `${who} 队下机`, sl.makeup ? `含补时 ${sl.makeup} 小时。成绩封存到全部完赛。` : '成绩封存到全部完赛。');
      if (i === leakIdx) {
        live('leak').filter(r => teamIdx(r.team) === i).forEach(r => {
          const later = n - 1 - i;
          hit(r, sl.e, `${who} 队之后发现题目疑似外泄`, later ? `后面 ${later} 队改用备用题` : '已是最后一队');
          say(sl.e, 'risk', 'bench', `#${r.n} ${who} 队下机后发现题目疑似外泄`, later ? `后面 ${later} 队改用备用题（赛前已校准）；查泄露路径，组委会访问日志逐条核对。` : '已是最后一队，只查泄露路径。', { n: r.n });
          if (later) dispute('standbyQ');
        });
      }
      const ready = big ? sl.e + big.hours : sl.e;
      const hf = live('handover_fail').filter(r => r.team === T);
      const extra = hf.reduce((a, r) => a + r.hours, 0);
      sl.ho = { a: ready, b: ready + HM + extra, extra, last: isLastPlay && !queue.length };
      free = sl.ho.b;
      hf.forEach(r => {
        hit(r, ready + HM, `${who} 队下机后重装失败`, `交接多花 ${r.hours} 小时`);
        say(ready + Math.min(HM, 6), 'risk', 'pod', `#${r.n} ${who} 队下机后节点重装失败`, `多花 ${r.hours} 小时 → 换上预刷好镜像的备用系统盘，重跑基线校验；下一队从校验通过才开始计时。`, { n: r.n });
      });
    }

    // 补赛窗口
    const lastAnnEnd = ann[n - 1] + W;
    const mkA = lastAnnEnd + G, mkB = mkA + P.makeupDays * 24;
    const mk = [];
    if (queue.length) {
      let mf = free;   // 所有队按公布时间比完、机器交接完就开始补赛
      queue.forEach(sl => {
        const ra = mf, a = ra + HM, b = a + sl.moved.remain;
        mk.push({ sl, ra, a, b, ho: { a: b, b: b + HM } });
        say(a, 'resp', 'pod', `${sl.who} 队补赛`, `从归档恢复现场（约 ${HM} 小时）后，补完剩余 ${sl.moved.remain} 小时，${F.dt(b)} 结束。`, { n: sl.moved.n });
        mf = b + HM;
      });
      free = mf;
      const last = mk[mk.length - 1];
      if (last.b > mkB) say(last.b, 'warn', 'pod', '补赛窗口不够', `${P.makeupDays} 天补赛窗口到 ${F.dt(mkB)}，补赛 ${F.dt(last.b)} 才结束，比赛整体延长 ${F.dur(last.b - mkB)}。`);
    }
    const played = slots.filter(x => x.kind !== 'empty');
    const playEnds = played.map(x => x.e).concat(mk.map(m => m.b));
    const eventEnd = playEnds.length ? Math.max(...playEnds) : start;
    if (!mk.length && eventEnd > lastAnnEnd) {
      say(eventEnd + 1e-3, 'warn', 'pod', '比公布的赛程晚结束', `最后一队比公布时间晚 ${F.dur(eventEnd - lastAnnEnd)}下机，${P.makeupDays ? `占用了 ${P.makeupDays} 天补赛窗口${eventEnd > mkB ? '，而且超出了' : '的一部分'}` : '没有补赛窗口可以吸收'}。`);
    }

    // 节假日（照常比的方案）
    const holH = (C.holidays || []).map(x => ({ ...x, h: dH(x.date) })).filter(x => x.h != null);
    holH.forEach(x => {
      const noon = x.h + 12;
      if (noon < start || noon >= eventEnd) return;
      const on = played.find(sl => noon >= sl.s && noon < sl.e) || mk.find(m => noon >= m.ra && noon < m.b);
      const ho = played.find(sl => sl.ho && noon >= sl.ho.a && noon < sl.ho.b);
      const what = on ? (on.sl ? `${on.sl.who} 队补赛中` : `${on.who} 队比赛中（第 ${Math.floor(noon - on.s)} 小时）`) : ho ? `${ho.who} 队下机后的换队交接日` : (plan === 'pause' && noon >= pzA && noon < pzB) ? '节前停赛中，机器空闲' : '机器空闲';
      if (on && on.who) on.hol.push(x.name);
      say(x.h, rosterOk ? 'info' : 'warn', 'duty', `${x.name}（${F.day(x.h)}）`, `${what}。${rosterOk ? '值班表、厂商现场支持、备件已在赛前锁定；评审暂停一天。' : '节假日保障没在开赛前锁定：出故障时可能找不到人。'}`);
    });

    /* =================== 赛后 =================== */
    const dayOne = Math.floor(eventEnd / 24) * 24;
    const day90 = dayOne + 90 * 24;
    const sp = C.blackouts && C.blackouts.spring;
    const spR = sp ? [dH(sp.from), dH(sp.to)] : null;
    const rf = live('restore_fail');
    const jb = live('judge_bug');
    const ap = live('appeal');
    const post = [];
    (C.post || []).forEach(t => {
      if (t.only === 'investigate' && !egressFormal.length) return;
      if (t.only === 'rescore' && !(jb.length || modelFix.length)) return;
      if (t.only === 'appeal' && !ap.length) return;
      let durH;
      if (t.durH === 'repro') durH = played.length * RU.reproHours + rf.reduce((a, r) => a + r.days * 24, 0);
      else if (t.only === 'rescore') durH = (jb.reduce((a, r) => a + r.days, 0) + (modelFix.length ? RU.modelFixDays : 0)) * 24;
      else if (t.only === 'appeal') durH = Math.max(...ap.map(r => r.days)) * 24;
      else durH = (t.days || 0) * 24;
      post.push({ ...t, stage: 'post', durH, hits: [], notBefore: t.machineAfter ? free : eventEnd, avoidRange: t.avoid === 'spring' ? spR : null });
    });
    // 赛后是白天的工作：有工期的步骤从下一个开工时刻（开赛时刻）开始
    dag(post, eventEnd, h => Math.ceil((h - P.hour) / 24 - 1e-9) * 24 + P.hour);
    const qById = new Map(post.map(t => [t.id, t]));
    const q = id => qById.get(id);

    say(eventEnd, 'ms', 'ms', `${played.length} 队全部完赛`, `赛后 90 天从今天算第 1 天。比赛凭证统一作废；成绩封存到这一刻为止，现在开始算分。`);
    const rp = q('repro');
    if (rp) {
      say(rp.es, 'act', 'pod', '开始独立复现', `最后一队归档、整机恢复基线后，从归档逐队恢复、复跑，每队约 ${RU.reproHours} 小时；队伍可以派人见证。`);
      rf.forEach(r => {
        const idx = played.findIndex(sl => sl.L === r.team);
        if (idx < 0) { kill(r, `${r.team} 队没有上机`); return; }
        const h = rp.es + idx * RU.reproHours + 12;
        rp.hits.push(r);
        hit(r, h, `${played[idx].who} 队归档恢复失败`, `复现多用 ${r.days} 天`);
        say(h, 'risk', 'pod', `#${r.n} ${played[idx].who} 队归档恢复失败`, `先查基线和恢复过程；组委会或归档的问题不记在队伍头上；队伍可以见证，修好后再恢复一次（多用 ${r.days} 天）。`, { n: r.n });
        dispute('repro', played[idx].who);
      });
      say(rp.ef, 'act', 'pod', '复现完成', `${played.length} 队都在干净环境里重建、复跑、比对过。`);
    }
    if (q('investigate')) {
      const t = q('investigate');
      t.hits = egressFormal.map(x => x.r);
      say(t.es, 'resp', 'rules', '出网线索调查', `${egressFormal.map(x => x.who).join('、')} 队：核对拦截日志、封存包审计、复现时顺带核查。只认证据，不靠“文风像不像”判断。`, { n: egressFormal[0].r.n });
      say(t.ef, 'resp', 'rules', '调查结论', '结论附证据，当事队可申诉；结论出来后才发成绩单。', { n: egressFormal[0].r.n });
    }
    if (q('score')) {
      const t = q('score');
      say(t.ef, 'act', 'review', '算分完成', '计分程序从原始记录算分，两人各算一遍、结果一致；每个分数都能追到“队伍 → 归档哈希 → 运行记录”。');
      jb.forEach(r => {
        hit(r, t.ef, '算分时发现判定器 bug', `修复重评 ${r.days} 天`);
        q('rescore') && q('rescore').hits.push(r);
        say(t.ef, 'risk', 'bench', `#${r.n} 算分时发现判定器 bug`, `修好后五队全部重评，一视同仁，设截止日期（${r.days} 天）。`, { n: r.n });
        dispute('judge');
      });
    }
    if (q('report')) say(q('report').ef, 'ms', 'svc', '成绩单发各队', `先发各队，${(q('objection') || {}).days || 7} 天异议期；对外先不公布。`);
    ap.forEach(r => {
      const sl = played.find(x => x.L === r.team);
      if (!sl) { kill(r, `${r.team} 队没有上机`); return; }
      const t = q('appeal');
      const h = q('objection').es + 72;
      t.hits.push(r);
      hit(r, h, `${sl.who} 队申诉质量分`, `裁决 ${r.days} 天`);
      say(h, 'risk', 'review', `#${r.n} ${sl.who} 队对质量分提出申诉`, `申诉组由不参加原评审的人组成，只受理程序错误和事实错误；裁决附理由，用计分程序重算（${r.days} 天）。`, { n: r.n });
      dispute('quality', sl.who);
    });
    const an = q('announce');
    if (an) {
      const late = an.ef > dayOne + 30 * 24;
      say(an.ef, 'ms', 'ms', '公布成绩 · 颁奖', `赛后第 ${Math.floor((an.ef - dayOne) / 24) + 1} 天。${late ? '晚于赛后第 30 天，挤占 31–60 天的 Testbed 计划。' : ''}`);
      if (late) warns.push({ id: 'announce', name: '公布成绩晚于赛后第 30 天', consequence: '挤占 31–60 天的计划。' });
      live('prize_vacancy').forEach(r => {
        hit(r, an.ef, '大奖空缺', '按公布的门槛执行');
        say(an.ef, 'risk', 'ms', `#${r.n} 大奖空缺`, '没有队伍同时通过质量、安全与证据门槛 → 按赛前公布的门槛空缺；考虑颁单项证书。', { n: r.n });
        dispute('vacancy');
      });
    }
    const pr = q('prize');
    if (pr) {
      if (pr.ext) { say(pr.es0, 'warn', 'legal', `奖金发放遇${sp.name}`, `顺延 ${F.dur(pr.ext)}，提前告知获奖队。`); dispute('prize'); }
      say(pr.ef, 'ms', 'legal', live('prize_vacancy').length ? '证书与单项奖励发放完成' : '奖金到账', '书面确认收款人、金额、币种；税额提前告知；转账前两人核对。');
    }
    if (q('oss_pub')) say(q('oss_pub').ef, 'ms', 'after', '开源成果公开', '自动扫描过密钥、企业资料、权重许可；当事队过目后才公开。');
    if (q('retro')) say(q('retro').es, 'act', 'ms', '不追责复盘', '只问流程哪里能改，不追究个人。');
    (C.postEvent || []).forEach(pe => {
      if (pe.from > 1) say(dayOne + (pe.from - 1) * 24, 'ms', 'after', `进入${pe.name}`, pe.note);
    });
    const rpOver = rp && rp.ef > dayOne + 30 * 24;
    if (rpOver) warns.push({ id: 'repro', name: '复现晚于赛后第 30 天', consequence: '' });

    /* =================== 时间线条目 =================== */
    const tipTask = t => {
      const lines = [t.name, `${t.durH ? `${F.day(t.es)} → ${F.day(t.ef)}（${F.days(t.durH)}）` : F.day(t.ef)}`];
      if (t.stage === 'pre' && t.slack != null) lines.push(t.crit ? `关键路径 · 余量 ${F.days(t.slack)}` : `余量 ${F.days(t.slack)}`);
      if (t.deps && t.deps.length) { const names = t.deps.map(d => (pById.get(d) || qById.get(d) || {}).name).filter(Boolean); if (names.length) lines.push('前置：' + names.join('、')); }
      if (t.hits && t.hits.length) lines.push('风险：' + t.hits.map(r => `#${r.n} ${r.def.name}`).join('、'));
      if (t.note) lines.push(t.note);
      if (t.ext) lines.push(`遇${sp.name}顺延 ${F.days(t.ext)}`);
      if (t.state && t.state !== 'ok') lines.push(t.state === 'drop' ? '开赛时没做完，机器被比赛占用，补不了。' : t.state === 'short' ? `练习期只有 ${F.days(t.leadGot)}。` : '开赛时还没做完。');
      if (t.ref) lines.push('预案 ' + t.ref);
      return lines.join('\n');
    };
    [...prep, ...post].forEach(t => {
      const cls = [];
      if (t.crit) cls.push('crit');
      if (t.hits && t.hits.length) cls.push('hit');
      if (t.state === 'drop') cls.push('drop');
      if (t.state === 'late' || t.state === 'short') cls.push('late');
      if (t.ext) cls.push('ext');
      const it = { lane: t.lane, stage: t.stage, id: t.id, label: t.name, tip: tipTask(t), cls };
      if (t.durH === 0) items.push({ ...it, kind: 'ms', a: t.ef });
      else items.push({ ...it, kind: 'bar', a: t.es, b: t.ef });
    });
    items.push({ lane: 'ms', stage: 'pre', kind: 'ms', a: gateReady, label: '启动门禁满足', tip: `启动门禁满足：${F.dt(gateReady)}\n最后满足：${gateBy ? gateBy.name : ''}`, cls: ['gate'] });
    if (start !== planned) items.push({ lane: 'ms', stage: 'pre', kind: 'ms', a: planned, label: '原定开赛', tip: `原定开赛：${F.dt(planned)}`, cls: ['ghost'] });
    items.push({ lane: 'ms', stage: 'in', kind: 'ms', a: start, label: '开赛', tip: `开赛：${F.long(start)}`, cls: ['key'] });
    items.push({ lane: 'ms', stage: 'in', kind: 'ms', a: eventEnd, label: '全部完赛', tip: `全部完赛：${F.long(eventEnd)}`, cls: ['key'] });

    slots.forEach(sl => {
      if (sl.kind === 'empty') {
        items.push({ lane: 'pod', stage: 'in', kind: 'empty', a: sl.s, b: sl.e, label: `${sl.L} 空档`, tip: `${sl.L} 队窗口空档（赛前退出，候补没补上）\n${F.dt(sl.s)} → ${F.dt(sl.e)}\n作缓冲；后面的队不提前。` });
        return;
      }
      const tl = [`${sl.who} 队${sl.kind === 'standby' ? `（候补，接 ${sl.L} 队）` : ''}`, `${F.dt(sl.s)} → ${F.dt(sl.e)}`];
      if (sl.delay) tl.push(`比公布晚 ${F.dur(sl.delay)}开表`);
      if (sl.p1 != null) tl.push(`第一阶段 → ${F.dt(sl.p1)}`);
      if (sl.seal != null) tl.push(`封存 ${F.dt(sl.seal)}，之后组委会运行正式评测`);
      if (sl.makeup) tl.push(`补时 ${sl.makeup} 小时`);
      if (sl.outs.length) tl.push(sl.outs.map(o => `宕机 #${o.n} 第 ${o.at} 小时 ${o.hours} 小时`).join('；'));
      if (sl.quit) tl.push(`第 ${sl.quit.at} 小时退出，剩余作废`);
      if (sl.moved) tl.push(`剩余 ${sl.moved.remain} 小时挪到补赛窗口`);
      if (sl.standbyQ) tl.push('使用备用题');
      if (sl.degraded) tl.push('降配继续，成绩标“条件不一致”');
      items.push({ lane: 'pod', stage: 'in', kind: 'win', a: sl.s, b: sl.e, who: sl.who, slot: sl, tip: tl.join('\n'), cls: [sl.delay ? 'delayed' : '', sl.kind === 'standby' ? 'standby' : ''].filter(Boolean) });
      if (sl.quit) items.push({ lane: 'pod', stage: 'in', kind: 'void', a: sl.e, b: sl.s + W, under: true, label: '作废', tip: `${sl.who} 队退出后剩余 ${sl.quit.voidH} 小时作废，作缓冲` });
      items.push({ lane: 'pod', stage: 'in', kind: 'ho', a: sl.ho.a, b: sl.ho.b, tip: `${sl.ho.last ? '最后一队归档 · 整机恢复基线' : '换队交接'}（${sl.who} 队下机后）\n${F.dt(sl.ho.a)} → ${F.dt(sl.ho.b)}（${F.dur(sl.ho.b - sl.ho.a)}）\n${C.handover}${sl.ho.extra ? `\n重装失败多花 ${sl.ho.extra} 小时` : ''}`, cls: sl.ho.extra ? ['hit'] : [] });
    });
    mk.forEach(m => {
      items.push({ lane: 'pod', stage: 'in', kind: 'mk', a: m.ra, b: m.b, restoreEnd: m.a, who: m.sl.who, tip: `${m.sl.who} 队补赛\n恢复现场 ${F.dt(m.ra)} → ${F.dt(m.a)}\n补赛 ${F.dt(m.a)} → ${F.dt(m.b)}（剩余 ${m.sl.moved.remain} 小时）` });
      items.push({ lane: 'pod', stage: 'in', kind: 'ho', a: m.ho.a, b: m.ho.b, tip: `${m.sl.who} 队补赛后归档\n${F.dt(m.ho.a)} → ${F.dt(m.ho.b)}`, cls: [] });
    });
    if (P.makeupDays > 0) items.push({ lane: 'pod', stage: 'in', kind: 'reserve', a: mkA, b: mkB, under: true, label: '补赛窗口', tip: `补赛窗口（备用）${P.makeupDays} 天\n${F.dt(mkA)} → ${F.dt(mkB)}\n长时间宕机挪过来的时间在这里补；用不上就是缓冲。` });
    if (plan === 'pause') items.push({ lane: 'pod', stage: 'in', kind: 'pause', a: pzA, b: pzB, under: true, label: '节前停赛', tip: `节前停赛：${F.day(pzA)} → ${F.day(pzB - 24)}\n这段时间不排队伍。` });

    // 评审（滚动，节假日暂停）
    const holR = holH.map(x => [x.h, x.h + 24]);
    const reviewBar = (who, a) => {
      let b = a + RU.reviewDays * 24;
      holR.forEach(([ha, hb]) => { if (ha < b && hb > a) b += Math.min(hb, b) - Math.max(ha, a); });
      return b;
    };
    played.forEach(sl => {
      const m = mk.find(x => x.sl === sl);
      const end = m ? m.b : sl.e;
      const a = Math.max(end, judgesReady);
      const b = reviewBar(sl.who, a);
      const waited = a > end;
      items.push({ lane: 'review', stage: 'in', kind: 'bar', id: `review:${sl.L}`, a, b, label: `${sl.who} 队评审`, tip: `${sl.who} 队评审：${F.day(a)} → ${F.day(b)}\n两位评委独立打分并写理由；节假日暂停；成绩封存到全部完赛。${waited ? `\n评委 ${F.day(judgesReady)} 才到位，等了 ${F.dur(a - end)}。` : ''}`, cls: waited ? ['late'] : [] });
    });
    const pr0 = pById.get('practice');
    items.push({ lane: 'svc', stage: 'in', kind: 'bar', id: 'qa', a: pr0 ? Math.min(pr0.ef, start) : start, b: eventEnd, label: '答疑台（答复同步公开给各队）', tip: '答疑台：答复同步公开给所有队。\n命题人和维护隐藏题组的人不参与答疑。\n预案 §1', cls: ['cont'] });
    items.push({ lane: 'duty', stage: 'in', kind: 'bar', id: 'duty', a: start, b: eventEnd, label: '7×24 三班值守', tip: `7×24 三班值守：${F.day(start)} → ${F.day(eventEnd)}\n${rosterOk ? '节假日值班、厂商现场支持已锁定。' : '节假日保障没锁定。'}\n预案 §1.1`, cls: rosterOk ? ['cont'] : ['cont', 'late'] });
    items.push({ lane: 'rules', stage: 'in', kind: 'bar', id: 'guard', a: start, b: eventEnd, label: '出网控制 · 封存审计 · 每日计量小结', tip: '交换机默认禁止出网；封存包审计；每天给队伍发计量小结，当天确认。\n预案 §5 §6', cls: ['cont'] });
    (C.postEvent || []).forEach(pe => {
      if (!pe.bar) return;
      items.push({ lane: pe.lane || 'after', stage: 'post', kind: 'bar', id: 'pe' + pe.from, a: dayOne + (pe.from - 1) * 24, b: dayOne + pe.to * 24, label: pe.bar, tip: `${pe.name}：${pe.note}`, cls: ['cont'] });
    });

    /* =================== 结果 =================== */
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
    const metrics = {
      planned, start, slip: start - planned, gateReady, gateBy: gateBy ? gateBy.name : '',
      crit: crit.map(t => t.id), critTxt: (critFromArrival ? 'EdgePod 到位 → ' : '') + critTxt,
      annEnd: lastAnnEnd, eventEnd, over: eventEnd - lastAnnEnd, dayOne, day90,
      makeupH: sum(played, x => x.makeup), lostH: sum(played, x => x.lost),
      voidH: sum(played, x => x.quit ? x.quit.voidH : 0), emptyN: slots.filter(x => x.kind === 'empty').length,
      emptyH: slots.filter(x => x.kind === 'empty').length * W,
      delayedN: played.filter(x => x.delay > 0).length, maxDelay: Math.max(0, ...played.map(x => x.delay)),
      standbyN: slots.filter(x => x.kind === 'standby').length, movedN: queue.length,
      announce: an ? an.ef : null, prize: pr ? pr.ef : null, prizeExt: pr ? pr.ext : 0,
      repro: rp ? rp.ef : null, unfinished: unfinished.length,
      riskHit: risks.filter(r => r.status === 'hit').length, riskDead: risks.filter(r => r.status === 'dead').length
    };
    log.sort((a, b) => a.h - b.h);
    flags.sort((a, b) => a.h - b.h);

    const stages = [
      { id: 'pre', name: '赛前', a: prepStart, b: start },
      { id: 'in', name: '赛中', a: start, b: eventEnd },
      { id: 'post', name: '赛后', a: eventEnd, b: day90 }
    ];
    const postBands = (C.postEvent || []).map(pe => ({ name: pe.name, a: dayOne + (pe.from - 1) * 24, b: dayOne + pe.to * 24 }));

    return {
      T0, F, P, HM, plan, lanes: C.lanes, lanesById,
      prep: { list: prep, gateReady, start, planned, crit, unfinished },
      event: { ann, slots, mk, mkA, mkB, eventEnd, played, pause: plan === 'pause' ? [pzA, pzB] : null },
      post: { list: post, dayOne, day90, bands: postBands },
      holidays: holH, blackout: spR ? { a: spR[0], b: spR[1], name: sp.name } : null,
      items, log, flags, warns, disputes: [...dmap.values()], risks, metrics, stages
    };
  }

  const api = { simulate, makeFmt, isoUTC, dag };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAACEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

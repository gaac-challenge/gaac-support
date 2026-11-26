/* =====================================================================
 * GAAC 全程沙盘 · 场景配置（赛前 → 赛中 → 赛后）
 *
 * 改这里 = 改默认场景。保存后刷新 index.html 即可，不需要任何构建。
 * 推演规则写在 engine.js，页面写在 index.html，三个文件放在同一个文件夹。
 *
 * - defaults：打开页面时的推演参数。页面上的控件只做临时推演，
 *   刷新或点“恢复默认”就回到这里的值。
 * - prep：赛前任务。days = 完整版工期（天），mvp = 最低可用版工期，
 *   mvpSkip = 最低可用版赛前不做。deps 是前置任务。
 *   gate: 'hard' 没完成就不能开赛；'soft' 没完成也能硬开，但会带着风险开赛。
 * - post：赛后步骤，规则同上；only 表示只有注入了对应风险才出现。
 * - riskTypes：可以注入的风险；presets：一键情景。
 * - 工期都是估计值〔假设〕，出处见 GAAC_赛务准备与预案_v0.1.md。
 * ===================================================================== */
window.SANDBOX = {
  name: 'GAAC 全程沙盘',
  eyebrow: 'Grand Agentic AI Challenge · 智能体大奖赛 · 全程沙盘推演',
  doc: 'GAAC_赛务准备与预案_v0.1.md',
  source: {
    label: 'oaic.ai/gaac 智能体大奖赛页面（2026 年 11 月 2 日更新，页面注明“赛制暂定，仅供参考”）',
    url: 'https://www.oaic.ai/gaac/'
  },
  platform: 'EdgePod · 16 × RTX PRO 6000 Max-Q · 4 × 64TB NVMe · 400GbE',
  machineName: 'EdgePod',

  // 默认值 = 预案里的建议值（09:00 开赛、换队留 24 小时、补赛窗口 3 天、2 支候补）
  defaults: {
    prepStart: '2026-11-03', edgepodArrive: '2026-11-03', scope: 'mvp', launch: 'gate', practiceLead: 7,
    start: '2026-12-01', hour: 9, teams: 5, window: 168, phase1: 30, sealAt: 120,
    gap: 24, handover: 12, makeupDays: 3, standby: 2, holidayPlan: 'keep', noMakeupMax: 2, moveOver: 24
  },
  // “官网字面口径”按钮：官网没写间隔和时刻，按 00:00 开赛、不留间隔
  literal: { hour: 0, gap: 0 },

  rules: {
    standbyNotice: 7,     // 候补队至少提前几天通知
    personLock: 48,       // 窗口开始前多少小时锁定名单
    reproHours: 24,       // 赛后每队复现占用机器的小时数
    reviewDays: 3,        // 每队下机后的评审天数（节假日暂停）
    snapshotEvery: 6,     // 快照间隔（小时）
    modelFixDays: 3       // 修本地模型 bug 后五队重评的天数
  },

  teamNames: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],

  lanes: [
    { id: 'ms',     name: '里程碑',         owner: '赛事总监' },
    { id: 'pod',    name: 'EdgePod',        owner: '平台运维组' },
    { id: 'bench',  name: '命题与测评',     owner: '命题与测评组' },
    { id: 'review', name: '评审与复现',     owner: '评审与复现组' },
    { id: 'rules',  name: '规则与合规',     owner: '合规岗 · 申诉秘书' },
    { id: 'svc',    name: '赛务与选手服务', owner: '赛务组' },
    { id: 'legal',  name: '法务与财务',     owner: '行政、法务、财务' },
    { id: 'duty',   name: '值守与保障',     owner: '运维三班' },
    { id: 'after',  name: '赛后承接',       owner: '传播与伙伴' }
  ],

  /* ---------------- 赛前 ---------------- */
  prep: [
    { id: 'team',   lane: 'ms',    name: '组建支撑团队、定分工', days: 3, ref: '§1.2' },
    { id: 'decide', lane: 'ms',    name: '13 项待决事项拍板', days: 4, risk: 'decide_late', ref: '§8',
      note: '开赛日期、名称、换队间隔、补时阈值、权限边界等，规则要用到。' },
    { id: 'spec',   lane: 'bench', name: '四套规格与计分公式', days: 7, mvp: 6, ref: '§2.4 第 1 周' },
    { id: 'data',   lane: 'bench', name: '数据：DR 资料库 · FA 财报 · PPT 资料包', days: 10, mvp: 8, risk: 'data_late', ref: '§2.2',
      note: '冻结的本地资料库要埋入互相冲突的来源；财报数据要埋入口径变化、重述和异常。' },
    { id: 'harness',lane: 'bench', name: '公共底座：运行器 · 计量 · 证据包 · 复现器 · 计分', days: 14, mvp: 11, ref: '§2.1',
      note: '四套共用。效率 6 分靠计量，复现 4 分靠复现器。' },
    { id: 'j_infra',lane: 'bench', name: 'Infra：压测 · 故障注入 · 隐藏负载', days: 7, mvp: 5, deps: ['spec'], bench: 'infra', ref: '§2.2' },
    { id: 'j_dr',   lane: 'bench', name: 'DR 判定：模型评委 + 人工抽查', days: 8, mvp: 5, deps: ['spec', 'data'], bench: 'dr', ref: '§2.2' },
    { id: 'j_fa',   lane: 'bench', name: 'FA 判定：读 XLSX 复算 · 改数联动', days: 8, mvp: 6, deps: ['spec', 'data'], bench: 'fa', ref: '§2.2' },
    { id: 'j_ppt',  lane: 'bench', name: 'PPT 判定：可编辑性 · 往返测试', days: 8, mvp: 4, deps: ['spec', 'data'], bench: 'ppt', ref: '§2.2',
      note: '版式要人看，最低可用版先做自动检查加人工评审。' },
    { id: 'gate1',  lane: 'bench', name: '关 1：判定器自测', days: 2, mvp: 1, deps: ['j_infra', 'j_dr', 'j_fa', 'j_ppt'], ref: '§2.3',
      note: '用正确样本和埋错样本测判定器。' },
    { id: 'pod_accept', lane: 'pod', name: 'EdgePod 到位验收', days: 2, notBefore: 'edgepodArrive', machine: true, risk: 'edgepod_late', ref: '§1.1' },
    { id: 'pod_image',  lane: 'pod', name: '基础镜像 · 本地 DeepSeek · 断网考场', days: 4, deps: ['pod_accept'], machine: true, gate: 'hard', ref: '§1.1 §6',
      consequence: '机器没准备好，不能开赛。' },
    { id: 'infra_tune', lane: 'pod', name: 'Infra 脚本上真机调试', days: 4, mvp: 3, deps: ['pod_image', 'j_infra'], machine: true, ref: '§2.2',
      note: 'Infrastructure 的题只能在真机上调。' },
    { id: 'gate2',  lane: 'pod',   name: '关 2：参考实现限时跑通', days: 3, mvp: 2, deps: ['infra_tune', 'harness', 'gate1'], machine: true, gate: 'soft', ref: '§2.3',
      consequence: '参考实现没在真机上跑通就开赛：题目难度和时长都没校准。' },
    { id: 'gate34', lane: 'pod',   name: '关 3–4：稳定性与区分度', days: 4, mvpSkip: true, deps: ['gate2'], machine: true, gate: 'soft', ref: '§2.3',
      consequence: '稳定性和区分度没测：重评可能不一致，裸 DeepSeek 和完整智能体可能拉不开。',
      note: '最低可用版赛前不做。' },
    { id: 'rehearsal', lane: 'pod', name: '关 5：168 小时彩排（试跑队）', days: 7, deps: ['gate2'], machine: true, gate: 'soft', ref: '§2.3 §1.2',
      consequence: '没彩排就开赛：交接、计量、复现流程都没实跑过。' },
    { id: 'drills', lane: 'pod',   name: '交接演练 + 恢复演练', days: 2, deps: ['rehearsal'], machine: true, gate: 'soft', ref: '§4',
      consequence: '交接耗时没实测：换队间隔够不够只能赌。',
      note: '实测交接每一步的耗时；用试跑队的归档恢复、复跑，结果要一致。' },
    { id: 'seal',   lane: 'bench', name: '封存题目与判定器（记哈希）· 备用题', days: 2, mvp: 1, deps: ['rehearsal', 'gate34'], gate: 'soft', ref: '§2.4 第 4 周',
      consequence: '题目和判定器开赛后才封存：之后的任何修改都会引发公平争执。' },
    { id: 'rules',  lane: 'rules', name: '规则定稿：补时阈值 · 权限边界 · 允许清单 · 申诉', days: 6, deps: ['decide'], ref: '§3 §6',
      note: '这些都要在报名开放前写进规则。' },
    { id: 'agree',  lane: 'legal', name: '报名协议：许可证 · 著作权 · 奖金 · 保密', days: 6, deps: ['decide'], ref: '§5' },
    { id: 'publish',lane: 'ms',    name: '规则与赛程公开（冻结）', days: 0, deps: ['rules'], ref: '§5 规则' },
    { id: 'reg',    lane: 'svc',   name: '报名开放 → 截止', days: 10, deps: ['rules', 'agree'], risk: 'reg_short', ref: '§1.1' },
    { id: 'select', lane: 'svc',   name: '资格审核 · 遴选正式队和候补', days: 3, deps: ['reg'], gate: 'hard', ref: '§3',
      consequence: '队伍没定，不能开赛。' },
    { id: 'practice', lane: 'svc', name: '练习环境与样例同日开放', days: 0, deps: ['select', 'pod_image'], gate: 'soft', lead: 'practiceLead', ref: '§3 §7',
      consequence: '练习期不够：先上场的队准备时间更短。',
      note: '练习环境和正式考场一样断网。' },
    { id: 'draw',   lane: 'ms',    name: '公开抽签定上机顺序', days: 0, deps: ['practice'], gate: 'hard', ref: '§3',
      consequence: '上机顺序没定，不能开赛。' },
    { id: 'judges', lane: 'review', name: '评委招募 · 利益申报 · 保密协议', days: 10, deps: ['team'], gate: 'soft', ref: '§1.2 §5',
      consequence: '评委没到位：先下机的队要等评审。' },
    { id: 'roster', lane: 'duty',  name: '节假日值班 · 厂商现场支持 · 备件', days: 5, deps: ['team'], gate: 'soft', ref: '§3',
      consequence: '节假日保障没锁定：圣诞、元旦出故障时可能找不到人。' }
  ],

  /* ---------------- 赛后 ---------------- */
  // durH 写 'repro' 表示由引擎按“队数 × 每队复现小时 + 恢复失败的额外天数”计算
  post: [
    { id: 'revoke',  lane: 'rules',  name: '比赛凭证统一作废', days: 0, ref: '§7' },
    { id: 'repro',   lane: 'pod',    name: '从归档恢复 · 独立复现', durH: 'repro', machineAfter: true, ref: '§4',
      note: '前面几队的复现要等全部比完、从归档恢复以后才能做。' },
    { id: 'score',   lane: 'review', name: '程序算分 · 两人各算一遍', days: 2, deps: ['repro'], ref: '§7' },
    { id: 'investigate', lane: 'rules', name: '出网线索调查', days: 5, only: 'investigate', ref: '§6 §7' },
    { id: 'rescore', lane: 'bench',  name: '修复 · 五队全部重评', days: 0, only: 'rescore', deps: ['score'], ref: '§5' },
    { id: 'report',  lane: 'svc',    name: '成绩单发各队', days: 0, deps: ['score', 'investigate', 'rescore'], ref: '§5' },
    { id: 'objection', lane: 'svc',  name: '异议期 7 天', days: 7, deps: ['report'], ref: '§5' },
    { id: 'appeal',  lane: 'review', name: '申诉组裁决 · 计分程序重算', days: 0, only: 'appeal', deps: ['objection'], ref: '§5' },
    { id: 'announce',lane: 'ms',     name: '公布成绩 · 颁奖', days: 0, deps: ['objection', 'appeal'], ref: '§5' },
    { id: 'prize',   lane: 'legal',  name: '奖金发放：书面确认 · 税 · 两人核对', days: 10, deps: ['announce'], avoid: 'spring', ref: '§5 §7' },
    { id: 'oss_scan',lane: 'after',  name: '开源扫描 · 先私有', days: 3, deps: ['repro'], ref: '§7',
      note: '扫密钥、内部代码、企业资料、不能再分发的权重、许可证冲突。' },
    { id: 'oss_pub', lane: 'after',  name: '当事队过目 → 公开', days: 5, deps: ['oss_scan', 'announce'], ref: '§7' },
    { id: 'sponsor', lane: 'legal',  name: '赞助方资源使用报告 · 承诺清单', days: 3, deps: ['announce'], ref: '§7' },
    { id: 'retro',   lane: 'ms',     name: '不追责复盘', days: 1, deps: ['announce'], ref: '§7' }
  ],

  // 赛后计划，从最后一队下机当天算第 1 天
  postEvent: [
    { from: 1, to: 30, name: '赛后 1–30 天', note: '整理开源成果、独立复现、汇总评测问题、明确维护分工。' },
    { from: 31, to: 60, name: '赛后 31–60 天', lane: 'after', bar: 'Testbed 持续测试 · 企业试用', note: '在 Testbed 持续测试，推进联合研究、白皮书，开展企业试用与课程。' },
    { from: 61, to: 90, name: '赛后 61–90 天', lane: 'after', bar: '企业试点验收 · 对接项目', note: '企业试点验收，迭代参考方案，对接企业项目与持续运维合作。' }
  ],

  holidays: [
    { date: '2026-12-25', name: '圣诞' },
    { date: '2027-01-01', name: '元旦' },
    { date: '2027-02-06', name: '春节' }
  ],
  // 春节假期〔假设 2/5–2/11〕：赛后步骤遇到会顺延
  blackouts: { spring: { from: '2027-02-05', to: '2027-02-12', name: '春节假期' } },
  // 节前停赛方案（预案 §3）：这段时间不排队伍
  holidayPause: { from: '2026-12-22', to: '2027-01-04', name: '节前停赛' },

  handover: '归档并核验上一队 · 整机重装与安全擦除 · 基线校验后开表',

  /* ---------------- 赛前 / 赛后视图的分行（只影响显示） ---------------- */
  views: {
    pre: [
      { id: 'pod',   name: 'EdgePod', sub: '平台运维组 · 机器上的准备', tone: 'pod', ids: ['pod_accept', 'pod_image', 'infra_tune', 'gate2', 'gate34', 'rehearsal', 'drills'] },
      { id: 'infra', task: 'infra', ids: ['j_infra'] },
      { id: 'dr',    task: 'dr',    ids: ['j_dr'] },
      { id: 'ppt',   task: 'ppt',   ids: ['j_ppt'] },
      { id: 'fa',    task: 'fa',    ids: ['j_fa'] },
      { id: 'base',  name: '公共底座与关卡', sub: '命题与测评组', ids: ['spec', 'data', 'harness', 'gate1', 'seal'] },
      { id: 'reg',   name: '规则 · 报名 · 协议', sub: '规则、赛务、法务', ids: ['decide', 'rules', 'agree', 'publish', 'reg', 'select', 'practice', 'draw'] },
      { id: 'ppl',   name: '团队 · 评委 · 值班', sub: '总监、评审组、运维', ids: ['team', 'judges', 'roster'] }
    ],
    post: [
      { id: 'pod',   name: 'EdgePod', sub: '平台运维组 · 复现', tone: 'pod', ids: ['repro'] },
      { id: 'score', name: '算分与申诉', sub: '评审与复现组', ids: ['score', 'rescore', 'appeal'] },
      { id: 'svc',   name: '成绩单与异议', sub: '赛务组', ids: ['report', 'objection', 'announce'] },
      { id: 'rules', name: '合规', sub: '凭证 · 调查 · 开源扫描', ids: ['revoke', 'investigate', 'oss_scan'] },
      { id: 'money', name: '奖金与报告', sub: '法务与财务', ids: ['prize', 'sponsor'] },
      { id: 'after', name: '开源与 90 天计划', sub: '传播与伙伴', ids: ['oss_pub', 'retro', 'pe31', 'pe61'] }
    ]
  },

  /* ---------------- 可注入的风险 ---------------- */
  // stage：pre 赛前 / in 赛中 / post 赛后。sev：critical 红 / warning 黄。
  // 字段 type：team（按上机顺序的队）、num、sel。
  riskTypes: [
    { type: 'edgepod_late', stage: 'pre', sev: 'warning', name: 'EdgePod 晚到', ref: '§2.2',
      fields: [{ k: 'days', label: '晚到', unit: '天', type: 'num', min: 1, max: 40, def: 10 }] },
    { type: 'bench_late', stage: 'pre', sev: 'warning', name: '某套 Benchmark 延期', ref: '§2.4',
      fields: [{ k: 'bench', label: '哪套', type: 'sel', options: [['infra', 'Infrastructure'], ['dr', 'Deep Research'], ['fa', 'Financial Analysis'], ['ppt', 'Making PPT']], def: 'fa' },
               { k: 'days', label: '延期', unit: '天', type: 'num', min: 1, max: 30, def: 5 }] },
    { type: 'data_late', stage: 'pre', sev: 'warning', name: '数据集或授权延误', ref: '§2.2',
      fields: [{ k: 'days', label: '延误', unit: '天', type: 'num', min: 1, max: 30, def: 5 }] },
    { type: 'decide_late', stage: 'pre', sev: 'warning', name: '待决事项迟迟不拍板', ref: '§8',
      fields: [{ k: 'days', label: '拖延', unit: '天', type: 'num', min: 1, max: 30, def: 5 }] },
    { type: 'reg_short', stage: 'pre', sev: 'warning', name: '报名不足，延长报名', ref: '§3',
      fields: [{ k: 'days', label: '延长', unit: '天', type: 'num', min: 1, max: 30, def: 5 }] },
    { type: 'handover_slow', stage: 'pre', sev: 'warning', name: '演练实测交接偏长', ref: '§4',
      fields: [{ k: 'hours', label: '实测', unit: '小时', type: 'num', min: 1, max: 96, def: 20 }] },
    { type: 'holiday_nosupport', stage: 'pre', sev: 'warning', name: '节假日保障锁不定', ref: '§3', fields: [] },

    { type: 'team_quit_before', stage: 'in', sev: 'warning', name: '有队赛前退出', ref: '§3',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'B' },
               { k: 'days', label: '距窗口', unit: '天', type: 'num', min: 0, max: 60, def: 10 }] },
    { type: 'team_quit_during', stage: 'in', sev: 'critical', name: '有队中途退出', ref: '§3',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'D' },
               { k: 'at', label: '第', unit: '小时', type: 'num', min: 1, max: 719, def: 90 }] },
    { type: 'person', stage: 'in', sev: 'warning', name: '人员变动', ref: '§3',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'C' },
               { k: 'kind', label: '', type: 'sel', options: [['quit', '有人退出'], ['join', '想加人']], def: 'quit' },
               { k: 'when', label: '', type: 'sel', options: [['early', '窗口前 3 天'], ['late', '窗口前 1 天'], ['during', '窗口中']], def: 'during' }] },
    { type: 'outage', stage: 'in', sev: 'critical', name: '机器宕机', ref: '§3',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'C' },
               { k: 'at', label: '第', unit: '小时', type: 'num', min: 0, max: 719, def: 70 },
               { k: 'hours', label: '停', unit: '小时', type: 'num', min: 1, max: 240, def: 8 },
               { k: 'cause', label: '', type: 'sel', options: [['platform', '平台故障'], ['team', '队伍自己弄崩'], ['degraded', '部分故障，降配继续']], def: 'platform' }] },
    { type: 'handover_fail', stage: 'in', sev: 'warning', name: '交接时重装失败', ref: '§4',
      fields: [{ k: 'team', label: '下机队', type: 'team', def: 'B' },
               { k: 'hours', label: '多花', unit: '小时', type: 'num', min: 1, max: 96, def: 16 }] },
    { type: 'leak', stage: 'in', sev: 'critical', name: '题目疑似外泄', ref: '§3 §6',
      fields: [{ k: 'team', label: '在哪队之后', type: 'team', def: 'B' }] },
    { type: 'egress', stage: 'in', sev: 'critical', name: '出网尝试告警', ref: '§6 §7',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'D' },
               { k: 'at', label: '第', unit: '小时', type: 'num', min: 0, max: 719, def: 140 }] },
    { type: 'model_bug', stage: 'in', sev: 'warning', name: '本地模型或封存版本有 bug', ref: '§3',
      fields: [{ k: 'team', label: '发现于', type: 'team', def: 'C' },
               { k: 'fix', label: '', type: 'sel', options: [['none', '五队都不修'], ['fix', '修，五队全部重评']], def: 'fix' }] },

    { type: 'restore_fail', stage: 'post', sev: 'critical', name: '归档恢复失败', ref: '§4 §7',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'A' },
               { k: 'days', label: '多用', unit: '天', type: 'num', min: 1, max: 20, def: 2 }] },
    { type: 'judge_bug', stage: 'post', sev: 'critical', name: '算分时发现判定器 bug', ref: '§5 §7',
      fields: [{ k: 'days', label: '修复重评', unit: '天', type: 'num', min: 1, max: 30, def: 4 }] },
    { type: 'appeal', stage: 'post', sev: 'warning', name: '有队申诉质量分', ref: '§5',
      fields: [{ k: 'team', label: '队', type: 'team', def: 'C' },
               { k: 'days', label: '裁决', unit: '天', type: 'num', min: 1, max: 30, def: 5 }] },
    { type: 'prize_vacancy', stage: 'post', sev: 'warning', name: '大奖空缺', ref: '§5', fields: [] }
  ],

  presets: [
    { id: 'clean', name: '顺利', desc: '不注入任何风险，看预案本身的节奏。', risks: [] },
    { id: 'prep', name: '赛前延误', desc: 'EdgePod 晚到、财报判定延期、待决事项拖延。',
      risks: [{ type: 'edgepod_late', days: 10 }, { type: 'bench_late', bench: 'fa', days: 5 }, { type: 'decide_late', days: 4 }] },
    { id: 'holiday', name: '节假日出事', desc: '圣诞当天 C 队宕机 14 小时，D 队下机后重装失败，延误一路传到 E 队。',
      risks: [{ type: 'outage', team: 'C', at: 150, hours: 14, cause: 'platform' }, { type: 'handover_fail', team: 'D', hours: 16 }] },
    { id: 'long', name: '长时间宕机', desc: '单次宕机超过 24 小时，剩余时间挪到补赛窗口。',
      risks: [{ type: 'outage', team: 'B', at: 100, hours: 36, cause: 'platform' }] },
    { id: 'people', name: '人和队的变动', desc: '一队赛前退出由候补补位，一队中途退出，另有人员进出。',
      risks: [{ type: 'team_quit_before', team: 'B', days: 10 }, { type: 'team_quit_during', team: 'D', at: 90 },
              { type: 'person', team: 'C', kind: 'join', when: 'late' }, { type: 'person', team: 'E', kind: 'quit', when: 'during' }] },
    { id: 'fair', name: '公平与作弊', desc: '题目疑似外泄、出网告警、本地模型有 bug。',
      risks: [{ type: 'leak', team: 'B' }, { type: 'egress', team: 'D', at: 140 }, { type: 'model_bug', team: 'C', fix: 'fix' }] },
    { id: 'after', name: '赛后争议', desc: '恢复失败、判定器 bug、有队申诉、大奖空缺。',
      risks: [{ type: 'restore_fail', team: 'A', days: 2 }, { type: 'judge_bug', days: 4 }, { type: 'appeal', team: 'C', days: 5 }, { type: 'prize_vacancy' }] },
    { id: 'worst', name: '最坏情况', desc: '赛前、赛中、赛后各出几件事，叠在一起。',
      risks: [{ type: 'edgepod_late', days: 8 }, { type: 'handover_slow', hours: 20 }, { type: 'outage', team: 'B', at: 60, hours: 10, cause: 'platform' },
              { type: 'team_quit_during', team: 'C', at: 120 }, { type: 'egress', team: 'D', at: 150 }, { type: 'outage', team: 'E', at: 40, hours: 30, cause: 'platform' },
              { type: 'restore_fail', team: 'B', days: 3 }, { type: 'appeal', team: 'A', days: 5 }] }
  ],

  /* ---------------- 争执（预案 §5） ---------------- */
  disputes: {
    makeup:   { area: '公平', star: false, name: '宕机补时不够、机器变慢', prevent: '监控对当事队开放；故障记录在窗口内双方签字；开表时交基线报告。' },
    lost:     { area: '公平', star: false, name: '短时宕机没补时', prevent: '补时阈值赛前公布；故障记录双方签字。' },
    delay:    { area: '公平', star: false, name: '开表被推迟、上场顺序吃亏', prevent: '公开抽签；推迟原因和时长留记录，当场确认。' },
    degraded: { area: '公平', star: false, name: '降配继续，比赛条件不一致', prevent: '默认停表修复；降配要当事队书面同意，成绩标注。' },
    standbyQ: { area: '公平', star: false, name: '后面几队换了备用题', prevent: '备用题提前校准；查清泄露路径后公开说明。' },
    practice: { area: '公平', star: false, name: '各队练习期不一样长', prevent: '材料同日发布、练习环境同日开放、发布后再抽签。' },
    rush:     { area: '规则', star: false, name: '带着没做完的准备开赛', prevent: '按启动门禁开赛，不按日期硬开。' },
    dq:       { area: '评分', star: false, name: '被认定违规或不合格', prevent: '告警只作调查线索；判定附证据，可申诉。' },
    repro:    { area: '评分', star: true,  name: '复现失败的归责', prevent: '复现流程公布、允许队伍见证；平台或归档的问题不扣队伍的分。' },
    judge:    { area: '评分', star: false, name: '赛后发现判定器 bug', prevent: '重评对五队一视同仁，设截止日期。' },
    quality:  { area: '评分', star: true,  name: '不服质量分', prevent: '细则提前公布；两位评委独立打分并写理由；申诉只受理程序错误和事实错误。' },
    vacancy:  { area: '奖金', star: true,  name: '大奖空缺', prevent: '门槛提前公布；考虑加设单项证书。' },
    prize:    { area: '奖金', star: false, name: '奖金发放延迟', prevent: '报名时签奖金协议，提前告知发放时间和税额。' },
    quit:     { area: '承诺', star: false, name: '退出队伍的成果与署名', prevent: '报名时每人签开源许可；每队交奖金分配与署名约定。' }
  },

  /* ---------------- 风险登记册（预案 §3–§7 全部风险） ---------------- */
  // inject：对应可注入的风险类型；没有 inject 的只登记，不参与推演
  register: [
    { stage: 'pre', risk: 'EdgePod 晚到', resp: '最低可用版；按启动门禁开赛', prep: '尽早验收；Infra 题必须在真机上调', ref: '§2.2', inject: 'edgepod_late' },
    { stage: 'pre', risk: '四套 Benchmark 做不完', resp: '最低可用版：财报和 Infra 自动判，DR 和 PPT 自动检查加人工评审；开赛前至少过关 2 和关 5', prep: '每套 1 名负责人加 1 名领域专家', ref: '§2.4', inject: 'bench_late' },
    { stage: 'pre', risk: '数据集或授权延误', resp: '先用已到的数据出题，缺的用备用题顶', prep: '财务专家出题和核对答案；资料库授权先谈', ref: '§2.2', inject: 'data_late' },
    { stage: 'pre', risk: '待决事项不拍板', resp: '规则写不出来，报名开不了；赛事总监限期拍板', prep: '13 项逐项给建议值', ref: '§8', inject: 'decide_late' },
    { stage: 'pre', risk: '报名不足', resp: '延长报名；候补队补位', prep: '选 2 支候补队，同步拿到练习环境', ref: '§3', inject: 'reg_short' },
    { stage: 'pre', risk: '交接耗时超出估计', resp: '加大换队间隔；计时从基线校验通过开始', prep: '彩排里实测每一步耗时', ref: '§4', inject: 'handover_slow' },
    { stage: 'pre', risk: '节假日保障锁不定', resp: '改节前停赛：节前比完一部分，其余 1/4 起', prep: '值班表、厂商现场支持、评委排班提前锁定', ref: '§3', inject: 'holiday_nosupport' },
    { stage: 'pre', risk: '题目泄露（赛前）', resp: '换备用题', prep: '保密承诺；命题组和答疑台分开；访问留日志', ref: '§3 §6' },
    { stage: 'pre', risk: '关键人员缺席', resp: '替补顶上', prep: '每岗一个替补', ref: '§3' },
    { stage: 'pre', risk: '整体延期', resp: '按启动门禁开赛，不按日期硬开', prep: '门禁清单赛前公布', ref: '§3' },
    { stage: 'in', risk: '有队赛前退出', resp: '候补队补位（至少提前 7 天通知）；来不及就空档转缓冲', prep: '大奖“可空缺”写进规则', ref: '§3', inject: 'team_quit_before' },
    { stage: 'in', risk: '有队中途退出', resp: '剩余时间作废；后面的队不提前，空档作缓冲', prep: '退出流程写进规则', ref: '§3', inject: 'team_quit_during' },
    { stage: 'in', risk: '有人退出或中途加入', resp: '窗口开始 48 小时前可一换一；窗口中照常比、不加人', prep: '名单锁定时间点；替补也要过审核、签许可', ref: '§3', inject: 'person' },
    { stage: 'in', risk: '机器宕机', resp: '平台故障停表补时：累计 ≤2 小时不补，>2 小时补等长，单次 >24 小时挪到补赛窗口；队伍自己弄崩只回滚快照；降配继续标“条件不一致”', prep: '定时快照另存；关键备件；节假日厂商现场支持；阈值赛前公布', ref: '§3', inject: 'outage' },
    { stage: 'in', risk: '交接时重装失败', resp: '换上预刷好镜像的备用系统盘', prep: '彩排时真的恢复一次', ref: '§4', inject: 'handover_fail' },
    { stage: 'in', risk: '队伍改了固件或 BIOS', resp: '重刷并按违规处理', prep: '锁定权限，导出比对', ref: '§4' },
    { stage: 'in', risk: 'NVMe 磨损让后面的队变慢', resp: '安全擦除', prep: '记录 SMART；基线含存储性能', ref: '§4' },
    { stage: 'in', risk: '状态池无法全量归档', resp: '只留“保留清单”里的', prep: '设保留清单和容量上限；能重新生成的 KV 缓存不留', ref: '§4' },
    { stage: 'in', risk: '题目外泄', resp: '后续队改用备用题', prep: '备用题提前校准；组委会关键操作两人在场', ref: '§3 §6', inject: 'leak' },
    { stage: 'in', risk: '运行时调用外部大模型', resp: '告警只作调查线索，赛后调查', prep: '交换机默认禁止出网；封存系统非 root 运行；DNS 只解析内网', ref: '§6 §7', inject: 'egress' },
    { stage: 'in', risk: '本地模型或封存版本有 bug', resp: '五队都不修，或修后五队全部重评', prep: '赛前封存版本并记哈希', ref: '§3', inject: 'model_bug' },
    { stage: 'in', risk: '篡改计量或评测器', resp: '按违规处理', prep: '计量和评测器放在队伍权限之外', ref: '§6' },
    { stage: 'in', risk: '跑的不是封存版本', resp: '按违规处理', prep: '从封存源码重新构建并核对哈希', ref: '§6' },
    { stage: 'in', risk: '安全事件', resp: '隔离、一键停机', prep: '监控；凭证全部轮换', ref: '§3' },
    { stage: 'in', risk: '选手疲劳', resp: '提醒休息', prep: '不鼓励熬通宵', ref: '§3' },
    { stage: 'post', risk: '归档恢复失败', resp: '先查基线和恢复过程，平台的问题不扣队伍分；队伍可见证，再给一次机会', prep: '归档存在 EdgePod 以外，队伍自己也留一份', ref: '§4 §7', inject: 'restore_fail' },
    { stage: 'post', risk: '判定器 bug', resp: '五队一视同仁重评，设截止日期', prep: '程序从原始记录算分', ref: '§5 §7', inject: 'judge_bug' },
    { stage: 'post', risk: '不服质量分', resp: '申诉组（不含原评委）只受理程序和事实错误，裁决附理由', prep: '两位评委独立打分并写理由', ref: '§5', inject: 'appeal' },
    { stage: 'post', risk: '大奖空缺', resp: '按公布的门槛执行', prep: '门槛提前公布；考虑单项证书', ref: '§5', inject: 'prize_vacancy' },
    { stage: 'post', risk: '算分录错、归档对错队', resp: '按原始记录重算', prep: '不手抄；两人各算一遍；分数能追到运行记录', ref: '§7' },
    { stage: 'post', risk: '开源带出密钥或企业资料', resp: '撤回、轮换凭证', prep: '自动扫描；先私有后公开；比赛凭证赛后统一作废', ref: '§7' },
    { stage: 'post', risk: '成果被主办方使用起争执', resp: '按报名协议执行', prep: '著作权归队伍，主办方拿非独占使用权，商业化另签', ref: '§5' },
    { stage: 'post', risk: '奖金发放出错或遇春节', resp: '顺延并提前告知', prep: '书面确认，税额提前告知，转账前两人核对', ref: '§5 §7' },
    { stage: 'post', risk: '申诉期内误删归档', resp: '从异地副本恢复', prep: '保存期限和申诉、复现截止日挂钩，删完通知', ref: '§7' },
    { stage: 'post', risk: '赛后承诺遗漏', resp: '补做并说明', prep: '承诺清单，每项有负责人、有日期', ref: '§7' }
  ],

  /* ---------------- 赛制参考（沿用旧版） ---------------- */
  phases: [
    { name: '第一阶段', tag: '开卷', tools: '可用 Codex、Claude Code 等开发工具和成熟开源组件' },
    { name: '第二阶段', tag: '开发期 → 封存 → 正式评测', tools: '封存版本 + 本地 DeepSeek 等获准工具 · 正式评测由组委会运行 · 三类应用全部必做，顺序自定' }
  ],
  tasks: [
    { id: 'infra', icon: 'infra', en: 'Infrastructure', zh: '基础与工程能力', phase: 1, points: 25,
      deliver: '从干净环境重建可运行、可交接的系统：部署、推理与并发、KV 与状态管理、调度优化、故障恢复。',
      check: '稳定提供模型服务，处理配额、并发与取消；工具失败或服务中断时能正确恢复；任务、模型、工具、工件、时间与成本可对应核验。' },
    { id: 'dr', icon: 'dr', en: 'Deep Research', zh: '研究报告', phase: 2, points: 25,
      deliver: '研究报告或决策备忘录、来源索引、关键主张与证据对应关系、局限说明。',
      check: '数字和引文准确，证据支持主张，处理来源冲突，分清事实、推断与建议。本届使用冻结的本地资料库。' },
    { id: 'ppt', icon: 'ppt', en: 'Making PPT', zh: '可编辑 PPT', phase: 2, points: 25,
      deliver: '原生 PPTX、预览，以及资料对应与编辑验证记录。',
      check: '事实与数字准确；文字、图形、图表可编辑；非原作者能打开、修改、保存并重新打开，呈现保持一致。' },
    { id: 'fa', icon: 'fa', en: 'Financial Analysis', zh: '财报分析与可视化', phase: 2, points: 25,
      deliver: '原生 XLSX 分析工作簿、可编辑图表、结论摘要和数据来源。',
      check: '公司、期间、币种与单位正确；公式可复核；修改数据后，工作簿与图表能正确更新。' }
  ],

  // 每类应用（第二阶段任务）的分值构成
  appScore: [['质量', 15], ['质量约束下的效率', 6], ['独立复现与证据', 4]],
  appScoreNote: '先过质量再看效率，结果错误的提速不算分。',

  bonus: {
    en: 'Platform Optimization', zh: '平台优化', max: 20,
    note: '在隔离副本中离线优化平台本身，单独提交验收，不覆盖正式成绩',
    scoreNote: '平台优化是可选加分，全赛合计最高 20 分，不做不扣分。'
  },

  prize: {
    amount: 'US$10,000', count: '1 名',
    note: '通过质量、安全与证据要求的队伍，按正式分加平台优化分的综合成绩评选。'
  },


  notes: [
    { kind: '官网写明', text: '首届计划遴选 5 队，按队依次使用同一套 EdgePod；每队 168 小时；第一阶段 0–30 小时，第二阶段 30–168 小时；三类应用全部必做；赛后 90 天计划从最后一队完赛开始。' },
    { kind: '预案建议', text: '09:00 开赛、换队留 24 小时、E 队之后留 3 天补赛窗口、2 支候补队、补时阈值 2 / 24 小时、按启动门禁开赛。都还没拍板（预案 §8）。' },
    { kind: '假设', text: '开赛日期 12/1、准备从今天开始、EdgePod 已在现场、交接耗时 12 小时、封存点第 120 小时（V1.3 的参考做法）、赛前各任务工期、春节假期 2/5–2/11。工期可以在“赛前任务表”里直接改。' },
    { kind: '推演规则', text: '规则都来自预案第 3–7 节，写在 engine.js 里；一个队的风险按上机顺序的位置算（候补补位后由候补队承接）。' }
  ]
};

type Placeholder = { pageTitle: string; heading: string; message: string; learnMore?: { href: string; label: string } };

export const placeholders: Record<string, Placeholder> = {
  '/data': {
    pageTitle: '数据集：GAAC 技术支持',
    heading: '数据集',
    message: '这一页还在写。公开开发集、数据卡、下载地址和哈希定下来以后放在这里。',
  },
  '/tools': {
    pageTitle: '工具应用：GAAC 技术支持',
    heading: '工具应用',
    message: '这一页还在写。自检程序、常用工具和安装说明整理好以后放在这里；Deep Research 报告的自查程序先在测评服务页。',
    learnMore: { href: 'eval.html#dr', label: '看 Deep Research 测评' },
  },
  '/notices': {
    pageTitle: '公告与答疑：GAAC 技术支持',
    heading: '公告与答疑',
    message: '这一页还在写。开赛前的公告、规则答疑和更正，以后按日期发在这里。',
  },
  '/status': {
    pageTitle: '运行状态：GAAC 技术支持',
    heading: '运行状态',
    message: '开赛日期和上机顺序还没有公布。抽签以后，这里按顺序列出五队所处的阶段，只写队名和阶段，不显示分数。',
    learnMore: { href: 'tasks.html#week', label: '看每队一周怎么排' },
  },
  '/desk': {
    pageTitle: '本队任务台：GAAC 技术支持',
    heading: '本队任务台',
    message: '这一页还在写。领题、交卷和重跑登记的流程定下来以后，各队从这里进入。',
  },
};

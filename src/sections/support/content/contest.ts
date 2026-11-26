export const teamWeek = [
  {
    "label": "开卷开发",
    "hours": "0–30"
  },
  {
    "label": "阶段一测量",
    "hours": "30–42"
  },
  {
    "label": "正式运行，54 次",
    "hours": "42–90"
  },
  {
    "label": "用户测试",
    "hours": "90–102"
  },
  {
    "label": "审计重建",
    "hours": "102–114"
  },
  {
    "label": "缓冲，只给批准的重测",
    "hours": "114–144",
    "variant": "is-buffer"
  },
  {
    "label": "清场重装",
    "hours": "144–168",
    "variant": "is-clean"
  }
];

export const foundationTasks = [
  {
    "title": "I1 重建与部署",
    "points": "4",
    "goal": "从干净环境安装部署，跑通编译、测试的闭环"
  },
  {
    "title": "I2 推理服务与准入",
    "points": "4",
    "goal": "流式调用、配额、取消、过载拒绝、公平准入"
  },
  {
    "title": "I3 KV 状态管理",
    "points": "6",
    "goal": "前缀复用、失效、租户隔离；分层保存与恢复"
  },
  {
    "title": "I4 PD 分离与选择",
    "points": "4",
    "goal": "同样资源下，混部和预填充、解码分池部署对照，检查 KV 交接"
  },
  {
    "title": "I5 可靠性与恢复",
    "points": "4",
    "goal": "故障注入、幂等、资源释放与恢复"
  },
  {
    "title": "I6 全链路证据",
    "points": "3",
    "goal": "从任务到产出文件的 trace，完整成本对账"
  }
];

export const enterpriseTasks = [
  {
    "title": "可编辑 PPT",
    "points": "25 分",
    "input": "资料、版式要求、统一图片",
    "deliverable": "原生可编辑的 PPTX，附预览和编辑验证记录",
    "quality": "内容事实 5，原生可编辑与保存重开 6，布局视觉 4",
    "budget": "45 分钟，256K token（初始建议）"
  },
  {
    "title": "财报分析与可视化",
    "points": "25 分",
    "input": "冻结的上市公司财报、数据和问题",
    "deliverable": "可追溯的分析工作簿、图表和结论",
    "quality": "数据计算口径 7，可视化可编辑 5，结论与局限 3",
    "budget": "45 分钟，256K token（初始建议）"
  },
  {
    "title": "Deep Research",
    "points": "25 分",
    "input": "研究问题，冻结的本地资料库",
    "deliverable": "研究报告、来源索引、证据链和局限",
    "quality": "来源引文证据 7，综合与冲突处理 5，结构范围局限 3",
    "budget": "60 分钟，512K token（初始建议）"
  }
];

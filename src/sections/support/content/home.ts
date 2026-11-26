export const services = [
  {
    "key": "tasks",
    "title": "比赛任务",
    "description": "两个阶段的考题、计分规则、一周的时段安排、规则边界",
    "access": "公开样题，参赛手册"
  },
  {
    "key": "model",
    "title": "统一模型",
    "description": "DeepSeek V4.1 Flash 1017：权重、tokenizer、chat 模板的哈希与精度",
    "access": "权重与引擎镜像，已知问题清单"
  },
  {
    "key": "search",
    "title": "搜索服务",
    "description": "GAAC Agentic Search 的接入方式、数据覆盖、排错",
    "access": "REST、MCP、SearXNG 兼容接口，Agent Reach 数据源"
  },
  {
    "key": "data",
    "title": "数据集",
    "description": "公开开发集、财报、研究资料库、统一图片，每份带版本、哈希和许可",
    "access": "下载，哈希校验"
  },
  {
    "key": "tools",
    "title": "工具应用",
    "description": "核准的工具与 Harness，每个标明哪个阶段能用",
    "access": "运行环境仓库，供本地自测"
  },
  {
    "key": "eval",
    "title": "测评服务",
    "description": "Deep Research 测评已基本可用；推理效率测量在试跑；PPT 和财报评法在设计",
    "access": "Deep Research 新手包和自查程序；自测分和正式分分开"
  }
];

export const rotation = [
  {
    "team": "A 队",
    "week": "第 1 周"
  },
  {
    "team": "B 队",
    "week": "第 2 周"
  },
  {
    "team": "C 队",
    "week": "第 3 周"
  },
  {
    "team": "D 队",
    "week": "第 4 周"
  },
  {
    "team": "E 队",
    "week": "第 5 周"
  }
];

export const deskSteps = [
  {
    "title": "领题",
    "description": "比赛中心把题送到任务台，开始计时"
  },
  {
    "title": "做题",
    "description": "重跑要选原因，系统自动记日志"
  },
  {
    "title": "交卷",
    "description": "列出要封的文件和每个文件的哈希"
  },
  {
    "title": "铅封",
    "description": "队长输入本队字母确认，拿到带时间戳的回执"
  }
];

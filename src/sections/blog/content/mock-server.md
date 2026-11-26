---
title: "拆开假服务端"
series: "一篇一个小问题 · 第 02 篇"
kicker: "AgentX · 假服务端 · 接口"
description: "第 1 篇用一个假服务端把 AgentX 跑通了，可结果里混着它编出来的数。这一篇把它拆开看：它为了骗过 AgentX 必须做的，就是真服务端必须提供的接口；它偷懒编造的，就是真服务端必须真做、AgentX 真正要量的地方。"
meta: ["2026-11-22","agentx-harness 1.0.14 · aiperf-mock-server 0.13.0","抓包运行：60 秒，并发 2，25 个请求"]
---

````question
{
  "label": "这一篇的小问题",
  "text": "要让 AgentX 量出真数，推理服务端必须提供哪些接口，这些接口又必须有什么特性？"
}
````

````stats
[
  {
    "value": "1个",
    "label": "必须实现的接口：流式的 `POST /v1/chat/completions`"
  },
  {
    "value": "6个",
    "label": "请求体里的字段，其中 `ignore_eos` 不是 OpenAI 标准字段"
  },
  {
    "value": "3次/秒",
    "label": "抓取监控接口 `/metrics` 的频率，用来读缓存命中（可选）"
  },
  {
    "value": "4句",
    "label": "英文报错措辞，AgentX 只靠它们认出\"上下文超长\""
  },
  {
    "value": "15–19%",
    "label": "假服务端少报的输入 token，第 1 篇的输入长度因此是假的"
  }
]
````

## 01为什么要研究假服务端 {#why}

为了让我们的实验站在更接近事实的基础上。

第 1 篇的结果里，有些数是真的，有些是假服务端编的：输入长度报成 67,489（录制值 82,688），缓存读取 40.81%，首字时延 894 毫秒。不弄清哪些是编的，就不知道哪些结论能信。

反过来想，假服务端是用来顶替真服务端的。它要让 AgentX 照常工作，就必须把 AgentX 依赖的每个接口都做出来，哪怕是做个样子。所以把它拆开，就能反推出一张清单：

- 它必须做的，是真服务端必须提供的接口：收什么请求、回什么格式、报哪些数。
- 它偷懒编造的，是真服务端必须真做的特性：输出长度、token 计数、缓存命中、时延。这些恰好是 AgentX 要量的东西。

## 02怎么做：三路证据 {#how}

````reasons
[
  {
    "number": "1",
    "title": "读源码",
    "markdown": "假服务端在压测客户端仓库的 `tests/aiperf_mock_server/`；客户端怎样解析回答、怎样判\"上下文超长\"、读哪些监控指标，在 `src/aiperf/` 下。"
  },
  {
    "number": "2",
    "title": "抓一次完整往来",
    "markdown": "再跑一次 60 秒的 AgentX，打开 `--export-level raw`（逐个请求存下完整的请求体和回答），假服务端打开访问日志（记下每个被调用的接口）。共 25 个请求：22 个预热，3 个计入结果。"
  },
  {
    "number": "3",
    "title": "用真分词器复算",
    "markdown": "把抓到的请求文字交给 DeepSeek-V4.1-Flash 自己的分词器重新数 token，和录制值、假服务端报的数三方对照。"
  }
]
````

## 03接口：AgentX 到底调了什么 {#interfaces}

先看访问日志。一次运行下来，客户端只碰了两个接口，第三个一次都没碰：

| 接口 | 调用次数 | 是否必需 | 用来做什么 |
| --- | --- | --- | --- |
| `POST /v1/chat/completions` | 25 | 必需 | 发请求、收流式回答；所有时延和吞吐都从这里量 |
| `GET /metrics` | 274 | 可选 | 约每 334 毫秒抓一次服务端的监控数据，读缓存命中、显存里的缓存占用、排队请求数 |
| `GET /v1/models` | 0 | 默认不用 | 只有设了 `--wait-for-model-timeout`，开跑前才会先探一下服务端是否就绪 |

访问日志里另有 2 次 `/v1/models`，是我们开跑前手动探活发的，不算客户端的。

再看一次请求从发出到收完的全过程。下面是这次抓到的第 17 回合，会话 006c98de，耗时 46 秒：

````sequence
{
  "id": "fig-seq",
  "title": "一次请求的往来",
  "label": "图 1 · 抓包实录 · 第 17 回合",
  "description": "左边是 AgentX 客户端，右边是推理服务端。靛紫箭头是这次请求，灰色箭头是同时在跑的监控抓取。字段名和数值都照抓到的原样写。",
  "heading": [
    "AgentX 客户端",
    "推理服务端"
  ],
  "caption": "流式回答用的是服务器推送事件（server-sent events），每行以 `data:` 开头。这次第 17 回合一共收到 4,047 个事件：4,045 个内容块，加 1 个用量块和 1 个结束标记。",
  "messages": [
    {
      "from": "发出请求",
      "to": "收到",
      "payload": "`POST /v1/chat/completions`请求头：`X-Request-ID`（每个请求不同）· `X-Correlation-ID`（同一条会话不变）· `Accept: text/event-stream`请求体：`model` · `messages`（31 条，约 35 万字符）· `stream: true` · `max_completion_tokens: 4045` · `ignore_eos: true` · `stream_options.include_usage: true`"
    },
    {
      "from": "首字时延从这里截止",
      "to": "开始生成",
      "payload": "`data: {\"delta\": {\"role\": \"assistant\", \"content\": \"So t\"}}`第 1 个块"
    },
    {
      "from": "token 间隔从这里量",
      "to": "逐个推送",
      "payload": "`data: {\"delta\": {\"content\": \"hou \"}}` …每块一个 token，共 4,045 块"
    },
    {
      "from": "同时进行",
      "to": "回监控数据",
      "payload": "`GET /metrics` ⇄ 每 334 毫秒一次读缓存命中、缓存占用、排队数"
    },
    {
      "from": "",
      "to": "生成完毕",
      "payload": "`data: {\"delta\": {\"content\": \"or a\"}, \"finish_reason\": \"length\"}`到了 4,045 个，因长度上限而停"
    },
    {
      "from": "AgentX 采信这几个数",
      "to": "报用量",
      "payload": "`data: {\"usage\": {\"prompt_tokens\": 78926, \"completion_tokens\": 4045, \"prompt_tokens_details\": {\"cached_tokens\": 23677}}}`用量块：输入、输出、命中缓存的 token 数"
    },
    {
      "from": "请求结束",
      "to": "关流",
      "payload": "`data: [DONE]`"
    }
  ]
}
````

### 请求里的六个字段，各要服务端做什么

| 字段 | 这次的值 | 真服务端必须 |
| --- | --- | --- |
| `model` | deepseek-ai/DeepSeek-V4.1-Flash | 用这个名字提供服务。录制里原本是 Claude 的模型名，客户端统一改写成 `--model` 的值；名字对不上会报 404，预热的第一个请求失败，整次运行就中止 |
| `messages` | 31 条，用户与助手交替 | 能处理很长的纯文字多轮对话。没有 system 消息，也没有 `tools` 字段：录下来的工具调用是以文字形式嵌在内容里的（例如 `<parameter name="file_path">`），所以服务端不需要支持工具调用。第一条消息开头插了 `[rid:974531dea783]`，让每次重放的前缀都不同，防止跨会话白捡缓存 |
| `stream` | true | 支持流式输出 |
| `max_completion_tokens` | 4045（录制的输出长度） | 认这个字段。注意它不是老字段 `max_tokens` |
| `ignore_eos` | true | 认这个字段，模型想停也不许停，正好生成上面那么多 token。它不在 OpenAI 的标准里，是 vLLM、SGLang 等开源引擎的扩展 |
| `stream_options.include_usage` | true | 在流的最后附一个用量块 |

### 一个容易漏掉的接口：报错的措辞

AgentX 规定，因上下文超长被拒的请求超过 1%，整次运行判为无效。可它怎么知道一个错误是"超长"？源码（`common/scenario/context_overflow.py`）的做法是：在报错文字里找下面四句英文之一，不分大小写：

````code-sample
"context length"   "maximum context"   "context_length_exceeded"   "prompt is too long"
````

找到了，记作超长；找不到，就当普通错误。所以真服务端超长时的报错措辞，也是接口的一部分。假服务端从不报超长，这一条它测不出来。

## 04特性：假服务端在哪里偷懒 {#traits}

接口对上了，只说明能跑。数准不准，取决于下面这些特性。左列是假服务端的做法，右列是真服务端必须做到的。

| 特性 | 假服务端怎么应付 | 真服务端必须 | AgentX 为什么在乎 |
| --- | --- | --- | --- |
| 输出长度 | 把提示里的文字片段循环拼起来，拼够 `max_completion_tokens` 个 | 真生成，而且不提前停、正好 N 个 | 解码的工作量要和录制时一致 |
| token 计数 | 不真分词，大约每 4 个多字符切一段算 1 个 | 用模型自己的分词器如实报 | 默认用服务端报的数算输入长度和吞吐（见图 2） |
| 缓存命中 | 按提示文字的哈希值，在 30% 到 60% 之间编一个（这次是 30% 到 41%） | 前缀缓存真实命中，`cached_tokens` 和 `/metrics` 如实报 | 这是 AgentX 最想量的东西，这批数据的理论命中率约 96% |
| 时延 | 按公式：首字 = 100 毫秒 + 每个输入 token 0.01 毫秒；之后每 token 10 毫秒。默认不排队，并发再高也不变 | 首字时延取决于没命中缓存的那段要算多久、排队多久；token 间隔取决于同时解码多少个 | 时延和吞吐本身就是结果 |
| 流式粒度 | 每个事件一个"token" | 逐个 token 或很小的块推送。InferenceX 的规则要求每块不超过 20 个 token | 指标在客户端量。块太大，首字时延会把一段解码时间也算进去 |
| 上下文长度 | 来多长收多长 | 按模型默认的最大长度开；完整数据集要约 100 万 token。超长时报错要含那四句之一 | 超长被拒超过 1%，整次无效 |
| 长连接与并发 | 轻松应付 | 一个请求可能流 46 秒（这次的第 17 回合）；并发 N 就是 N 条会话同时活着，子智能体还会突发 | 服务端撑不住时，时延和错误率就会变 |

其中 token 计数这一条，我们用真分词器复算过：

````drawing
{
  "drawing": "fig-tokens",
  "title": "同一批请求，三种 token 数",
  "label": "图 2 · 会话 006c98de · 第 4–17 回合",
  "description": "靛紫是用 DeepSeek-V4.1-Flash 自己的分词器，把抓到的请求文字重新数出来的数；灰色是假服务端在用量块里报的数。录制值和靛紫线几乎重合，所以不单画（悬停或看数据表）。",
  "caption": "真分词器数出来的和录制值只差 15 到 31 个 token（不到万分之四），说明 AgentX 发出去的提示长度是对的。假服务端少报了 15% 到 19%：它每段约 4.2 到 4.4 个字符，而 DeepSeek 的分词器平均每 token 约 3.6 个字符。第 1 篇里\"输入长度\"一栏的假，就出在这里。"
}
````

## 05对我们：一张接口体检单（候选） {#for-us}

把上面的接口和特性倒过来，就是一张给推理服务端的体检单。参赛队的推理后端上 AgentX 之前，先过一遍；每条都能写成几十行脚本，而且可以先拿假服务端把脚本调通。

````checklist
[
  {
    "title": "能流式回答，名字对得上",
    "markdown": "用参赛队报的模型名发一个流式请求，收到内容块、用量块和结束标记。"
  },
  {
    "title": "输出长度说多少就是多少",
    "markdown": "带 `max_completion_tokens: 500` 和 `ignore_eos: true`，回答正好 500 个 token。"
  },
  {
    "title": "用量报得准",
    "markdown": "用量块里的输入 token 数，和本地用同一分词器复算的数相差很小（图 2 里录制值与复算只差万分之四）。"
  },
  {
    "title": "缓存真的会命中",
    "markdown": "同一段长前缀连发两次，第二次的 `cached_tokens` 接近前缀长度，首字时延明显变短。"
  },
  {
    "title": "逐 token 推送",
    "markdown": "每个内容块不超过 20 个 token。"
  },
  {
    "title": "监控接口有缓存指标",
    "markdown": "`/metrics` 里能读到前缀缓存的命中计数，例如 vLLM 的 `vllm:prefix_cache_hits` 与 `vllm:prefix_cache_queries`，SGLang 的 `sglang:cache_hit_rate`。"
  },
  {
    "title": "超长时报错能被认出",
    "markdown": "故意发一个超过窗口的请求，报错文字里含那四句之一。"
  },
  {
    "title": "上下文窗口够用",
    "markdown": "窗口不小于所用数据集的需要：完整数据集约 100 万，256K 版本约 26 万。"
  }
]
````

这张单子是我们的候选做法，还没在真服务端上跑过。思路上有先例：Kimi 的供应商核验工具（Kimi Vendor Verifier）在跑任何评测之前，也先对服务端做参数预检。

## 06还差什么 {#gaps}

````gap
{
  "number": "01",
  "markdown": "### 假服务端模仿不了缓存，AgentX 最核心的东西它测不了\n\n \n\n它的\"命中率\"是按哈希编的，时延也不随命中与否变化。前缀缓存留不留得住、子智能体突发时会不会把主会话的缓存挤掉，只能在真服务端上看。"
}
````

````gap
{
  "number": "02",
  "markdown": "### 超长判定只认四句英文\n\n \n\n换一个引擎、换一种报错措辞，超长就会被记成普通错误，\"超过 1% 判无效\"这条规则就失灵。名单可以用环境变量 `AIPERF_AGENTX_CONTEXT_OVERFLOW_SUBSTRINGS` 扩充，但要先在真服务端上看它到底怎么报。"
}
````

````gap
{
  "number": "03",
  "markdown": "### `ignore_eos` 不是标准字段\n\n \n\n开源引擎一般认它；不认的服务端，模型想停就会停，输出变短，解码负载就和录制对不上。哪个后端认、哪个不认，要逐个试（体检单第 2 条）。"
}
````

## 07下一步 {#next}

接口和特性都清楚了，下一步就是换上真服务端。

````next
[
  {
    "number": "已成文 · 第 03 篇",
    "title": "[393 条流量从哪来](/blog/393-traces)",
    "markdown": "AgentX 的流量怎么录、怎么挑、适合测什么；照着录我们自己的，有没有条件。"
  },
  {
    "number": "候选 · 第 05 篇",
    "title": "在真显卡上跑一个合规的点",
    "markdown": "vLLM 加 DeepSeek-V4.1-Flash，先过这张体检单，再测满时长，看缓存命中、时延和 `submission_valid` 的真数。"
  },
  {
    "number": "候选 · 第 06 篇",
    "title": "质量那一半怎么配上",
    "markdown": "效率用 AgentX 量，质量用我们自己的评测基准判\"不劣于\"，两边怎么接起来。"
  }
]
````

#### 出处（2026-11-22 读的版本：agentx-v1.0.14）

1. [假服务端源码与说明](https://github.com/SemiAnalysisAI/agentx-harness/tree/agentx-v1.0.14/tests/aiperf_mock_server)：`tests/aiperf_mock_server/`，其中 `tokens.py`（分词估算、用量与缓存命中的编法）、`config.py`（时延公式、调度器模式）。
2. 客户端源码：`src/aiperf/common/scenario/context_overflow.py` 与 `src/aiperf/common/environment.py`（超长判定的四句措辞、1% 上限）；`src/aiperf/records/inference_result_parser.py`（读用量块）；`src/aiperf/config/endpoint.py`（就绪探测默认关闭）。
3. [AgentX 教程](https://github.com/SemiAnalysisAI/agentx-harness/blob/agentx-v1.0.14/docs/tutorials/agentx-mvp.md)：模型名不符时预热失败即中止；超长率超过 1% 判无效。
4. "流式间隔不超过 20 个 token"出自 InferenceX 的上榜规则，见我们先前的调研 `sandbox/prep/agentx.html` 第五节。
5. 第 1 篇：[安装 AgentX](/blog/install-agentx)。

#### 本地文件

1. 抓包运行：`~/projects/GOSIM/elite-game/agentx-lab/runs/raw-c2/`（`profile_export_raw.jsonl` 是完整请求与回答）；访问日志 `runs/mock-server-raw.log`。
2. 图 2 的复算：用 `transformers` 加载 DeepSeek-V4.1-Flash 的分词器，逐条消息数 token 后相加。

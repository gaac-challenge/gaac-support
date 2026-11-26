---
title: "安装 AgentX"
series: "一篇一个小问题 · 第 01 篇"
kicker: "AgentX · 推理基准 · 动手"
description: "别人都拿它来量\"推理服务给智能体用好不好\"。我们不绕路，直接装上，跑一个最简单的实验，看它和我们要做的事之间还差什么。"
meta: ["2026-11-22","agentx-harness 1.0.14","MacBook Pro（M3 Max，128 GB 内存，没有英伟达显卡）"]
---

````question
{
  "label": "这一篇的小问题",
  "text": "AgentX 能不能在我们手里跑起来？跑起来以后，它和我们的工作之间还差什么？"
}
````

````stats
[
  {
    "value": "5秒",
    "label": "装好 agentx-harness，连同 130 个依赖"
  },
  {
    "value": "1.85GB",
    "label": "要下载的会话记录：393 条会话、98,827 次请求"
  },
  {
    "value": "166秒",
    "label": "第一次运行准备数据的时间，比测量本身还长"
  },
  {
    "value": "23GB",
    "label": "第一次运行时压测客户端的内存峰值"
  },
  {
    "value": "7个",
    "label": "两分钟测量窗口里实际测到的请求，全部来自同一条会话"
  }
]
````

AgentX 怎么测把真实的智能体会话"去内容、留形状"，再原样重放给推理服务

01 · 录

真实会话

SemiAnalysis 员工 2026 年 4 到 6 月用 Claude Code 写代码，代理记下每一次请求。公开 393 条会话。

02 · 脱敏

只留形状

删掉所有文字。每次请求只剩时间、输入输出长度，以及"每 64 个 token 一块"的块编号。

03 · 重建

填回文字

用被测模型的分词器，把每个块编号变成一段固定的填充文字。同一编号永远是同一段字，所以前缀照样能命中缓存。

04 · 重放

闭环发送

上一回合回来、再等够录下的间隔，才发下一回合。客户端量首字时延、token 间隔和吞吐。

为什么要保留块编号：智能体每一回合都把整段历史重新发一遍，绝大部分和上一回合一模一样。下面是这次实验里真正被重放的那条会话（编号 006c98de）的四个回合：

````drawing
{"drawing":"blocks"}
````

与上一回合相同的块（可命中缓存）新增的块

## 01为什么要装它 {#why}

AgentX 是 SemiAnalysis 公司开源推理基准 InferenceX 里的"智能体编程"场景，2026-08-24 发布 1.0 版。我们装它有三个理由。

1

### 做推理引擎和模型的人都在用它

- vLLM 团队 2026 年 9、10 月的三篇博客（9 月 8 日的 vLLM × AgentX，10 月 7 日、10 月 23 日两篇 DeepSeek-V4.1-Flash），标题里的数字全部出自 AgentX。
- InferenceX 的"行业影响"页列出了因 AgentX 做的上游优化，涉及 vLLM、SGLang、TensorRT-LLM、NVIDIA Dynamo、LMCache、Mooncake 等项目；SGLang 一节写明是和 SGLang 维护者一起做的。
- DeepSeek 和 Kimi 的模型是它的主要被测对象：首发五个模型里有 DeepSeek V4 Pro 和 Kimi K3，DeepSeek-V4.1-Flash 在 2026-09-10 加入。Kimi 背后的月之暗面（Moonshot AI）在 InferenceX 开源计划的支持者名单里；上面优化清单里的 Mooncake，就是月之暗面开源的缓存传输系统。

2

### 它从智能体的角度测推理性能，这正是我们工作最本质的事

老式基准每个请求是"一段固定长度的提示、一次读入、一段固定长度的续写，然后丢弃"。智能体的流量有四个它抓不住的性质：

- 多回合：一个会话几十到几百次交互，后一步依赖前一步。
- 长输入、短输出：每次都带着越攒越长的完整历史，输出却很短。
- 前缀反复复用：上面那四行块就是例子，缓存能不能留住决定成本。
- 子智能体突发：主智能体一次派出多个子任务，缓存分配出现尖峰。

 AgentX 重放的就是这样的流量。我们要优化的，正是推理服务在这种流量下的效率。

3

### 它是开源的，适合我们拿来用

三样东西都公开，许可都是 Apache 2.0（2026-11-22 核实）：

| 组成 | 在哪 | 说明 |
| --- | --- | --- |
| 数据集 | Hugging Face `semianalysisai/cc-traces-weka-062126` | 一个 1.85 GB 的文件，不用登录就能下 |
| 压测客户端 | PyPI `agentx-harness` | NVIDIA 压测工具 AIPerf 的分叉，命令叫 `agentx` |
| 编排与打分 | GitHub `SemiAnalysisAI/InferenceX` | 起服务、跑重放、汇总指标、上看板 |

## 02怎么做：直接装，跑最简单的实验 {#how}

见龙卸甲，遇佛杀佛。不先读完所有文档，照官方的"单独运行"说明一路往下走，碰到坑就记下来。

### 第一步：装

本机默认是 Python 3.14，而 agentx-harness 只支持 3.11 到 3.13。在 3.14 上直接 `pip install`，报的是"找不到这个包"，很容易误以为包名错了。用 uv 建一个 3.13 的独立环境：

安装

````code-sample
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python 'agentx-harness==1.0.14'   # 5 秒，130 个依赖
.venv/bin/agentx --version                                          # 1.0.14
````

要独立环境还有一个原因：这个包自带一份改过的 `aiperf`，不能和 NVIDIA 原版 aiperf 装在一起。

### 第二步：找一个能接请求的推理服务

这台 Mac 没有英伟达显卡，跑不了真的 DeepSeek-V4.1-Flash。最简单的办法是用仓库自带的假服务端：它接口和 OpenAI 一样，按设定的速度吐出假 token。它不在 pip 包里，要把仓库克隆下来再装：

假服务端

````code-sample
git clone --depth 1 --branch agentx-v1.0.14 \
  https://github.com/SemiAnalysisAI/agentx-harness.git src-agentx-harness
uv pip install --python .venv/bin/python -e src-agentx-harness/tests/aiperf_mock_server
# 首字时延 = 100 毫秒 + 每个输入 token 0.01 毫秒；之后每个 token 10 毫秒
.venv/bin/aiperf-mock-server --port 8000 --ttft 100 --ttft-per-isl-token-ms 0.01 --itl 10 \
  --default-model deepseek-ai/DeepSeek-V4.1-Flash
````

### 第三步：跑

命令照官方说明抄，只改了两处：并发设成 2；用 `--unsafe-override` 把测量时间从规定的至少 15 分钟（默认 1 小时）缩到 2 分钟。缩了时间，结果会被如实打上"不合规"的戳。

运行

````code-sample
# 第一次要下载数据并重建提示词，可能超过默认 300 秒的准备时限
export AIPERF_DATASET_CONFIGURATION_TIMEOUT=1800 \
       AIPERF_SERVICE_PROFILE_CONFIGURE_TIMEOUT=1800
.venv/bin/agentx profile \
  --url http://127.0.0.1:8000 --endpoint /v1/chat/completions \
  --model deepseek-ai/DeepSeek-V4.1-Flash --tokenizer deepseek-ai/DeepSeek-V4.1-Flash \
  --concurrency 2 --public-dataset semianalysis_cc_traces_weka_062126 \
  --output-artifact-dir runs/smoke-c2/aiperf_artifacts \
  --unsafe-override --benchmark-duration 120 --ui simple
````

三步合在一个脚本里：`~/projects/GOSIM/elite-game/agentx-lab/run-smoke.sh`（`install`、`server`、`run` 三个子命令）。

### 第四步：看到了什么

跑通了。下载、重建、预热、测量、导出，五个阶段都走完，退出码 0。但时间花在哪里，和直觉不太一样：

````drawing
{
  "drawing": "fig-timeline",
  "title": "一次运行的时间花在哪",
  "label": "图 1 · 秒",
  "description": "同一条命令跑两次。第一次要下载 1.85 GB 数据，再把 393 条会话重建成提示词；第二次直接读磁盘缓存。",
  "caption": "第一次运行共 318.5 秒，其中准备数据 166 秒，比 120 秒的测量还长；客户端内存峰值约 23 GB，留下 6 GB 磁盘缓存。第二次准备只要 2.4 秒，内存峰值约 6.9 GB。时刻取自运行日志。"
}
````

再看测量窗口里的请求。并发设的是 2，也就是同时重放两条会话。可两条会话里只有一条在发请求：

````drawing
{
  "drawing": "fig-lanes",
  "title": "两条会话在测量窗口里干了什么",
  "label": "图 2 · 第一次运行",
  "description": "每个色块是一次请求，从发出到收完。灰色是预热（每条会话先发 11 个只要 1 个 token 的请求，把缓存铺好），靛紫是测量窗口里计入结果的请求。",
  "caption": "会话 00200129 预热完以后，两分钟里一个请求也没发；看板上的\"有效并发\"只有 0.84，而不是 2。原因（推断）：这条会话在录制里有很长的停顿，几千秒到十几个小时都有；重放时单条会话最长只等 300 秒，但这仍比 2 分钟的窗口长。这正是官方要求至少测 15 分钟、默认测 1 小时的理由。"
}
````

真正被测到的 7 个请求，是会话 006c98de 的第 15 到 21 回合。把整条会话画出来，能看到智能体流量的样子：输入一路攒长，输出很短，中间夹着很长的停顿。

````drawing
{
  "drawing": "fig-session",
  "title": "一条会话的输入长度怎样越攒越长",
  "label": "图 3 · 会话 006c98de · 录制值",
  "description": "横轴是这条会话的第几次请求（共 33 次），纵轴是这次请求的输入 token 数（录制值，按 Claude 的分词器计）。靛紫点是这次实验测量窗口里重放到的回合。",
  "caption": "第 1 次请求的输入就有约 6.5 万 token；之后平均每回合只新增约 1,800 token，每次请求里与上一回合相同的块占 88% 到 100%。第 4 与第 5 次请求之间，录制里隔了 62 分钟。"
}
````

同一条命令再跑一次，看结果能不能复现：

复现得很好

- 两次都从同一个随机种子（42）出发，重放的是同一条会话的同样几个回合，每个请求的输入、输出长度逐个相同，时延相差不到 0.2%。
- 第二次多测到 1 个请求（8 个对 7 个），因为它的测量窗口实际是 131 秒，把第 22 回合也算了进去。窗口越短，这种边界效应越显眼。
- 结果文件里如实写着 `submission_valid: false`，原因 `unsafe_override`。改了规则，它不替你瞒着。

下面是第一次运行的主要指标。这些数没有性能意义：时延是我们给假服务端设的，连输入长度也是假的（原因见差距 6）。列在这里，是为了知道 AgentX 会交出哪些数。

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| 测量窗口内的请求数 | 7 | 两分钟，并发 2 |
| 首字时延（time to first token）中位数 | 894 毫秒 | = 假服务端设的 100 毫秒 + 每个输入 token 0.01 毫秒 |
| token 间延迟（inter-token latency） | 11.15 毫秒 | 设的是 10 毫秒，多出来的是客户端和网络开销 |
| 每用户输出速度 | 89.7 token/秒 | 即 token 间延迟的倒数 |
| 有效并发 | 0.84 | 设的是 2，见图 2 |
| 理论前缀缓存命中率 | 96.17% | 由数据本身决定的上限，不是服务端实测 |
| 请求错误率 | 0% |  |
| 合规戳 `submission_valid` | false | 原因：`unsafe_override` |

## 03发现的差距 {#gaps}

这次实验的目标就是找差距。一共十条，分三类：要跑起来我们还缺什么；它测的和我们要的差在哪；文档和工具上的小坑。

门槛要正式跑起来，我们还缺什么

01

### 要一台能装下约 100 万 token 上下文的推理服务

我们把 393 条会话逐条过了一遍，看每条会话里最长的一次请求（输入加输出）有多长，换成"上下文窗口开到多大，才能把整条会话跑完"：

````drawing
{
  "drawing": "fig-ctx",
  "title": "上下文窗口开到多大，能完整跑完几成会话",
  "label": "图 4 · 393 条会话",
  "description": "一条会话里只要有一次请求超过窗口，整条会话就跑不完。我们自己从公开数据算的，不是官方数字。",
  "caption": "会话最长请求的中位数约 22.6 万 token，最长的一条接近 100 万（996,579）。窗口只有 32K 的小模型，一条会话也跑不完；规则又规定，超长被拒的请求超过 1%，整次运行判为无效。按 InferenceX 的规则，DeepSeek-V4.1-Flash 用的是不截断的完整数据集。"
}
````

笔记本上的小模型完全不能用来跑 AgentX。比赛用的 16 张 RTX PRO 6000 Max-Q 上，DeepSeek-V4.1-Flash 能不能开到 100 万上下文、开到之后速度如何，要真机实测。

02

### 压测客户端本身也要一台像样的机器

第一次运行要下载 1.85 GB，单核把 393 条会话重建成提示词，用了 166 秒，内存峰值约 23 GB，留下 6 GB 磁盘缓存。之后同一随机种子的运行都读缓存。

发压的机器要单独算资源，不能随便找台小机器；换随机种子就要重新付一次准备时间。

03

### 正式跑一次很费时间

合规的一次至少测 15 分钟，`agentx` 预设是 1 小时；一次部署只测一个并发；换并发要重启服务端、重新预热。一条曲线通常 6 到 8 个并发点。图 2 也说明了短窗口为什么不行：并发 2 时，2 分钟里只有一条会话在发请求。

一条完整曲线按十几个机时起步来排期。比赛每队上机时间有限，评测要用多少机时，要先算清楚。

方法它测的东西，和我们要的差在哪

04

### 它只测效率，不测质量

每次请求的输出长度被钉死在录制值上，并强制模型不许提前停（`ignore_eos`）；回答的内容是填充文字，也不回灌到下一回合。模型答得对不对，不在它的测量范围里。

我们是"先质量后效率"。效率这一半可以借 AgentX，质量那一半要另外测，正是我们在做的排版和金融评测基准要补的。

05

### 它重放的是 Claude Code 写代码的流量，不是我们的

393 条会话全是 Claude Code 编程会话，回合节奏、输出长度、何时派子智能体，都是 Claude 模型加 Claude Code 的行为。我们比赛的三类任务是排版与幻灯片生成、深度调查、金融分析与财务预测，流量形状未必一样。

这是最大的一条差距，也是机会：压测客户端支持重放自己录的 Weka 格式会话。把我们自己的智能体跑一遍、录下来，就能用同一套工具量我们自己的流量。

06

### 假服务端只能验证流程，连输入长度都是假的

会话 006c98de 第 15 回合，录制的输入是 82,688 token，结果里却是 67,489。查下去：AgentX 默认采信服务端报的 token 数（`use_server_token_count = True`），而假服务端并不真分词，按"约 4 个字符算 1 个 token"估算。官方说明里讲，服务端用的分词器和客户端一致时，误差只有每条消息几个 token。

假服务端的数字一个都不能引用。它的用处是让我们在没有显卡的机器上，把下载、重建、预热、测量、导出这条链路先走通。它还编了哪些数、真服务端要补上什么，见第 2 篇[《拆开假服务端》](/blog/mock-server)。

小坑文档和工具上，下次能少走的弯路

07

### 文档里的版本号落后

压测客户端仓库的说明和 AgentX 教程都写 `agentx-harness==1.0.7`，InferenceX 仓库里的单独运行说明写的才是最新的 1.0.14（2026-11-13 发布）。

08

### Python 版本不对时，报错信息会误导人

要求 Python 3.11 到 3.13。在 3.14 上 `pip` 只说"找不到这个包"，不说是版本不符。

09

### 假服务端不在 pip 包里

它在仓库的 `tests/aiperf_mock_server` 下，要克隆仓库再装。

10

### 不能和 NVIDIA 原版 aiperf 装在同一个环境

agentx-harness 自带一份分叉的 `aiperf`，同名包会互相覆盖。

## 04下一步 {#next}

每条差距都可以是下一篇的小问题。第 2 篇已经写了差距 06：[《拆开假服务端》](/blog/mock-server)；第 3 篇写了差距 05 的前半段：[《393 条流量从哪来》](/blog/393-traces)。接下来的候选：

候选 · 第 04 篇

把"录 → 转 → 回放"接通

第 3 篇查清了怎么录；下一步写好代理和转换程序，先用脚本假装智能体，把录下的流量交给 AgentX 回放（差距 05）。

候选 · 第 05 篇

在真显卡上跑一个合规的点

vLLM 加 DeepSeek-V4.1-Flash，选一个并发，测满时长，看 `submission_valid` 能不能是 true；顺带回答 16 张 RTX PRO 6000 Max-Q 能不能开到 100 万上下文（差距 01、03）。

候选 · 第 06 篇

质量那一半怎么配上

同一次换后端，效率用 AgentX 量，质量用我们自己的评测基准判"不劣于"，两边怎么接起来（差距 04）。

#### 出处（2026-11-22 打开核实）

1. [SemiAnalysisAI/agentx-harness](https://github.com/SemiAnalysisAI/agentx-harness)：压测客户端，Apache-2.0，最新发布 agentx-v1.0.14（2026-11-13）；说明、AgentX 教程（`docs/tutorials/agentx-mvp.md`）、常见问题（`docs/benchmark-modes/semianalysis-agentx-faq.md`）、假服务端（`tests/aiperf_mock_server`）。
2. [InferenceX：Run AgentX-Harness Standalone](https://github.com/SemiAnalysisAI/InferenceX/blob/main/inferencex-e2e/docs/agentx-standalone.md)：安装版本、运行命令、DeepSeek-V4.1-Flash 用完整数据集的规则。
3. [Hugging Face：semianalysisai/cc-traces-weka-062126](https://huggingface.co/datasets/semianalysisai/cc-traces-weka-062126)：数据集，apache-2.0，不需登录。
4. [InferenceX：AgentX Industry Impact](https://inferencex.semianalysis.com/agentx/optimizations)：因 AgentX 做的上游优化清单。
5. [vLLM 博客：vLLM x AgentX](https://vllm.ai/blog/2026-09-08-vllm-agentx)（2026-09-08）；同系列 2026-10-07、2026-10-23 两篇 DeepSeek-V4.1-Flash。
6. [SemiAnalysis：AgentX 1.0 与 InferenceX v3 发布文章](https://newsletter.semianalysis.com/p/agentx-inferencexv3-does-cuda-moat)：首发模型、支持者名单。

#### 本地文件

1. 实验目录 `~/projects/GOSIM/elite-game/agentx-lab/`：脚本 `run-smoke.sh`，两次运行的日志和结果在 `runs/` 下。
2. 图 3、图 4 的数据由公开数据集自行统计；图 1、图 2 取自运行日志和逐请求记录 `profile_export.jsonl`。
3. 先前的 AgentX 深度调研：`sandbox/prep/agentx.html`。

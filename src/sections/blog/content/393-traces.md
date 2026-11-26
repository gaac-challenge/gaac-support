---
title: "393 条流量从哪来"
series: "一篇一个小问题 · 第 03 篇"
kicker: "AgentX · 数据集 · 我们自己的流量"
description: "我们想录自己三类智能体的流量，拿 AgentX 回放。动手之前，先把 AgentX 那 393 条会话看清楚：为什么录的是 Claude Code 写代码，为什么偏偏是 393 条，适合测多大的模型、多长的上下文。看清了，再回答我们有没有条件照着录。"
meta: ["2026-11-22","数据集 cc-traces-weka-062126（2026-06-21 建）","资料：发布文章、方法页、数据集说明、挑选脚本源码"]
---

````question
{
  "label": "这一篇的小问题",
  "text": "AgentX 的 393 条流量是怎么录、怎么挑出来的，适合测什么？照着录我们自己的，有没有条件？"
}
````

````stats
[
  {
    "value": "13,316条",
    "label": "原始库里的会话：SemiAnalysis 自己的人用 Claude Code，自愿接入代理录下"
  },
  {
    "value": "393条",
    "label": "筛完剩下的全部。没有人挑这个数，挑选命令里根本没设上限"
  },
  {
    "value": "95%",
    "label": "全库 token 里\"从缓存读\"的比例；输出只占 0.41%"
  },
  {
    "value": "142K",
    "label": "每个请求输入长度的中位数（token），输出的中位数只有 444"
  },
  {
    "value": "1M",
    "label": "完整版要的上下文窗口；窗口小的模型用 256K 截短版"
  }
]
````

## 01为什么录的是 Claude Code 写代码 {#why-cc}

两层原因。一层是大势：智能体的流量已经是推理的主体，老的测法对不上。一层是手边：Claude Code 是 SemiAnalysis 自己天天在用、又能录清楚的那一个。

> 自 2025 年 11 月 Claude Code 的拐点以来，长上下文、多轮的智能体负载增长很快，现在是线上推理流量的主体。2026 年 4 月，OpenAI 企业客户在智能体上的花费超过了 ChatGPT。SemiAnalysis，AgentX 发布文章，2026-08-24（我们的译文）

````reasons
[
  {
    "number": "1",
    "title": "智能体流量和老测法对不上",
    "markdown": "以前的推理测试发固定长度的请求，比如输入 8K、输出 1K，一问一答。SemiAnalysis 把智能体流量归纳成四个特点： \n\n- 多轮：一次任务几十上百个来回。\n- 长上下文：系统提示、工具定义、历次来回，越堆越长。\n- 前缀高度复用：每一轮都把前面整段带上，大部分输入可以直接从缓存里取，不用重算。\n- 子智能体突发：主线随时派出几个短命的子智能体，各带一份新上下文，缓存的进出一下子变猛。\n\n 写代码的智能体把这四点占全了。图 1 是他们原始库的 token 构成：95% 是从缓存读的。"
  },
  {
    "number": "2",
    "title": "是他们自己的流量，录得到，也敢公开",
    "markdown": "393 条全是 SemiAnalysis 内部的人用 Claude Code 的会话。录法是自愿接入一个网络代理，夹在 Claude Code 和 Anthropic 接口之间，记下每个请求的发出和完成时间、输入输出 token 数、会话编号、子智能体编号。公开之前删掉提示词、代码、工具参数和工具返回，输入只留\"每 64 个 token 切一块、块与块串起来算的哈希\"：前面内容相同，编号就相同，看得出复用了多长的前缀，看不出写了什么。"
  },
  {
    "number": "3",
    "title": "Claude Code 能录清楚，而且是他们请 Anthropic 改出来的",
    "markdown": "回放要知道哪个请求是主线、哪个属于哪个子智能体，靠的是请求头里的编号。SemiAnalysis 说，他们和 Anthropic 一起给 Claude Code 加了两处： \n\n- 议题 #49207（2026-04-16 提，5 月 11 日关闭）：在请求头里加上\"智能体实例编号\"。挑选脚本据此要求 Claude Code 不低于 2.1.139，注明这一版开始带 `x-claude-code-agent-id`。\n- 议题 #66761（2026-06-10 提，当天关闭）：用\"工作流\"工具派出的子智能体漏带这个编号，2.1.174 修好。\n\n 他们的代理其实也录了 OpenAI Codex 等其他模型的流量，但挑选脚本故意排除，理由是下游转换程序按 Claude 的轨迹形状写。AIPerf 的文档在讲另一个数据集时，点出了两者的一个技术差别：Claude Code 派子智能体是一次\"等它做完才返回\"的工具调用，调用的起止就是子智能体的寿命；Codex 是派出、等待、关闭分三步，句柄藏在被删掉的工具参数里，派出和等待配不上对。"
  }
]
````

````drawing
{
  "drawing": "fig-comp",
  "title": "原始库的 token 都花在哪",
  "label": "图 1 · 语料快照 · 6,133 亿 token",
  "description": "一条横条是全部 token。靛紫是从缓存读的，灰色是写进缓存的、新算的输入和输出。数字取自 SemiAnalysis 方法页上挑选数据时的语料快照。",
  "caption": "缓存命中率（缓存读取 ÷ (缓存读取 + 新输入)）是 99.0%。这就是 AgentX 要测的东西：服务端能不能把这么长的前缀留住、取回来，而不是每轮重算。输出只占 0.41%，所以光比\"每秒生成多少 token\"，抓不住智能体负载的要害。"
}
````

````callout
{
  "label": "一处出处不一致",
  "tone": "plain",
  "markdown": "AgentX 自己的教程（`agentx-mvp.md`）说，会话来自 WEKA 的 Callan Fox 用 kv-cache-tester 录的语料。那是早先的说法。1.0 用的数据集，说明页写的是\"由 SemiAnalysis 的 Claude Code 代理轨迹转换而来\"，发布文章也说是\"393 条 SemiAnalysis 内部的匿名轨迹\"。WEKA 留下的是数据格式和最早的一套工具，发布文章的致谢里有 Callan Fox。"
}
````

## 02为什么是 393 条 {#why-393}

没有人挑 393 这个数。它是 13,316 条会话一层层筛完、剩下的全部。

证据在挑选命令里。数据集说明页附了建库用的命令：

````code-sample
python utils/agentic/sample_proxy_traces.py --sampling top \
  --min-trace-version 7 --max-trace-version 7 \
  --min-requests 20 --require-cli-min 2.1.139 \
  --max-parallel-subagents 10 --exclude-dynamic-workflow-bug
````

注意没有 `--limit`。脚本里 `--sampling top` 只是按请求数从多到少排个序，要配上 `--limit` 才会截前几条。没设上限，就是满足条件的全要。

````drawing
{
  "drawing": "fig-funnel",
  "title": "从 13,316 条到 393 条",
  "label": "图 2 · 会话数",
  "description": "前两行来自方法页的语料快照，最后一行是发布的数据集。中间七道筛子各砍掉多少，没有公布。",
  "caption": "393 条只占全库的 2.95%，占 20 个请求以上那批的 4.75%。快照里还有：2,303 个客户端密钥，341 万个请求，6,133 亿 token；按各模型的接口标价估算约 102 万美元。"
}
````

### 八道筛子，各筛掉什么

| # | 筛子 | 去掉什么 | 为什么 |
| --- | --- | --- | --- |
| 01 | 只要 Claude 模型、成功返回、匿名模式的请求 | Codex 等其他模型的请求；报错的；没脱敏的 | 转换程序按 Claude 写；公开的数据只能出自脱敏记录 |
| 02 | 只要 2026-04-16 以后的记录 | 更早的 | 代理从这天起才记子智能体标签，脚本原话：更早的"对回放没用" |
| 03 | 每条会话至少 20 个请求 | 短会话 | 没说明。推测短会话缓存复用少，不是要测的样子 |
| 04 | 只要第 7 版记录格式 | 混有旧格式请求的会话 | 没说明。推测字段的口径要一致 |
| 05 | 每个请求都来自 Claude Code 2.1.139 以上 | 旧版本录的 | 从这一版起请求头带智能体编号，子智能体才能可靠分组 |
| 06 | 不含图片 | 带图片的会话 | 图片在服务端展开成多少 token，客户端看不到（方法页） |
| 07 | 同时在跑的子智能体组不超过 10 | 一次派出太多子智能体的会话 | 没说明 |
| 08 | 排除"动态工作流"故障会话 | 2.1.174 以前，工作流派出的子智能体不带编号，看上去像几条主线交错 | 回放会把会话结构搭错 |

会话留下以后，还在请求一级去掉三类：完全重复的记录；标题生成、安全监控这类短小的分类调用（最大输出不超过 64 且不带工具）；输入超过 990,016 的请求。最后一类的原因是：输入长度按"块数 × 64"记，缓存写得多时会多算，最多多出约 26 万，真实的提示没有一个超过 100 万。

读下来，八道里有四道（02、04、05、08）是为了结构能回放对，只有两道（03、07）关乎负载的样子，另外两道管隐私、模型和图片。

推测大头多半砍在版本门槛上：带编号的功能 5 月 11 日才完成，6 月 21 日建库，要求"每个请求都在 2.1.139 以上、都是第 7 版格式"的会话，只可能出自这五六周。各道筛子砍了多少，没有公布。

````callout
{
  "label": "所以这 393 条是\"录得准的\"，不是\"有代表性的\"",
  "tone": "warn",
  "markdown": "- 只有长会话：每个请求输入的中位数 142,016 token，输出 444。\n- 一家公司的用法：SemiAnalysis 的人怎么用 Claude Code，这批流量就是什么样子。\n- 一类模型的行为：主线一般是 Claude Opus，子智能体一般是 Claude Haiku（AIPerf 文档的说法）。\n- 没有图片。\n\n SemiAnalysis 自己也把它叫作\"最初的语料\"，并说智能体负载的样子\"变得很快\"。"
}
````

## 03适合测多大的模型、多长的上下文 {#scale}

上下文要 100 万 token，窗口小一点的用 256K 截短版。模型是几千亿参数以上的大模型，用 2 张到一整柜数据中心显卡来跑。

### 上下文窗口

完整版保留到约 100 万 token，单个请求最长 990,016。InferenceX 给 DeepSeek V4.1 Flash 写的 AgentX 配方，窗口就开到 1,048,576。

窗口只有 25 万左右的模型，用 256K 版：去掉超过上限的请求，但保留剩下请求的相对时间和子智能体的重叠。剩下 68,266 个请求（原来 98,827 个的 69%），输入中位数降到 88,768。SemiAnalysis 测 Qwen3.5（原生窗口 26.2 万）用的就是它，并说这模拟的是"较小的模型经常顶到窗口上限、反复压缩上下文"的用法。

再短就没有官方版本了。[第 1 篇](/blog/install-agentx#gaps)算过整条会话能装进窗口的比例：

| 上下文窗口 | 能用的版本 | 整条会话装得下 |
| --- | --- | --- |
| 100 万（1M） | 完整版 | 100% |
| 25.6 万（256K） | 256K 版 | 56% |
| 12.8 万（128K） | 没有 | 21% |
| 6.4 万（64K） | 没有 | 1.8% |
| 3.2 万（32K） | 没有 | 0% |

### 模型规模

AgentX 本身不限参数量，但它量的是"缓存挤不挤"，要有足够大的模型、足够多的会话，缓存才会挤。SemiAnalysis 实测过的模型都很大：

````drawing
{
  "drawing": "fig-models",
  "title": "SemiAnalysis 用 AgentX 测过的模型",
  "label": "图 3 · 总参数量",
  "description": "只列发布文章或我们的资料里给了参数量的六个。靛紫是我们比赛要用的 DeepSeek V4.1 Flash。右侧注明用哪个数据版本。",
  "caption": "InferenceX 仓库的配方里还有 GLM 5.3、GLM 5.3 Flash、MiniMax M3.1 Flash、Kimi K3.1、Qwen3.8 Next 等，参数量没有查。数据版本：Qwen3.5 用 256K 版是发布文章说的；其余按 InferenceX 的默认规则（只有 dsr1、qwen3.5、qwen3.8next 三个模型族用截短版）推定为完整版。DeepSeek V4.1 Flash 的参数量出自 vLLM 团队 2026-10-23 的博客（我们的精读报告）。"
}
````

机器方面，发布文章列的有 AMD 的 MI355X、MI325X、MI300X，英伟达的 GB300 NVL72、GB200 NVL72、B300、B200、H200，还有 RTX Pro 服务器。配置从 2 张卡到一整柜都有：MiniMax M3 在 B300 上用 2 张卡切分最好；DeepSeek V4.1 Flash 在 B200 上，低并发（4 到 24 路）用 4 张，高并发（224 到 576 路）用 8 张；Kimi K3 一台 B200 服务器装不下。H200 能在低并发下跑 DeepSeek V4，并发一高就输在显存不够。

为什么要这个量级，看缓存。以 DeepSeek V4 Pro 为例：B300 跑 384 路并发，显存里的缓存工作集约 4,300 万 token，91% 的输入在显存里命中；B200 跑 196 路，工作集只有一半（2,200 万），显存命中降到 73%，近 20% 要从内存里取。缓存挤的时候，不同机器、不同软件的差别才拉得开。

````callout
{
  "label": "对我们：模型对得上，机器不一定压得动",
  "tone": "acc",
  "markdown": "- 模型在范围里。DeepSeek V4.1 Flash 有 5,520 亿参数，配方开 100 万窗口，用完整版。\n- 机器没有现成配方。RTX Pro 服务器在发布文章的机器名单里，但 InferenceX 仓库里我没找到 RTX Pro 的 AgentX 配方，要自己写。\n- 缓存可能不挤。粗算按我们精读报告里的推算，这个模型每个 token 的缓存约 890 字节，一条 100 万 token 的会话约 0.9GB。16 张卡共 1,536GB 显存，扣掉权重还能放下几百条满长的会话。这和 11-13 启动会上的判断一致：100 路、每路 100 万 token，全放得进显存。所以在我们的机器上，AgentX 最能拉开差距的\"缓存挤不挤\"，低并发时拉不开；要看出差别，得把并发加上去。"
}
````

## 04对我们：照着录，有没有条件 {#for-us}

工具链要自己写，但有一处条件比 SemiAnalysis 好。真正缺的是被录的东西：三个智能体还没在跑。

````pipeline
{
  "id": "fig-pipe",
  "title": "他们怎么录，我们缺什么",
  "label": "图 4 · 示意",
  "description": "上一行是 SemiAnalysis 做出 393 条的流程，下一行是我们照着做要有的环节。",
  "rows": [
    {
      "group": "SemiAnalysis",
      "steps": [
        {
          "title": "Claude Code",
          "detail": "内部的人日常写代码",
          "availability": "ready"
        },
        {
          "title": "自愿接入的代理",
          "detail": "记时间、长度、会话号、子智能体号；当场切块算哈希",
          "availability": "ready"
        },
        {
          "title": "挑选脚本",
          "detail": "八道筛子，13,316 → 393",
          "availability": "ready"
        },
        {
          "title": "转换程序",
          "detail": "哈希换成会话内的小编号，写成 WEKA 格式",
          "availability": "ready"
        },
        {
          "title": "AIPerf 回放",
          "detail": "按编号填进合成文字，重建会话",
          "availability": "ready"
        }
      ]
    },
    {
      "group": "我们",
      "steps": [
        {
          "title": "三个智能体",
          "detail": "PPT、深度研究、财务分析，还没在跑",
          "availability": "missing"
        },
        {
          "title": "网关或代理",
          "detail": "走 OpenAI 兼容接口，记同样的字段",
          "availability": "missing"
        },
        {
          "title": "筛选规则",
          "detail": "编号从第一天带齐，就能少筛",
          "availability": "missing"
        },
        {
          "title": "转换程序",
          "detail": "用 DeepSeek 自己的分词器切块",
          "availability": "missing"
        },
        {
          "title": "AgentX 回放",
          "detail": "读本地目录；文档写了，没亲手跑过",
          "availability": "verify"
        }
      ]
    }
  ],
  "key": [
    "他们现成的",
    "我们现成、待验证",
    "我们要写或还没有"
  ]
}
````

### 有的

- 格式是公开的。每条会话一个 JSON 文件，字段在 AIPerf 源码的 `weka_trace_models.py` 里写得清清楚楚。
- AgentX 能读我们录的。教程写明本地目录可以这样回放：`--custom-dataset-type weka_trace --input-file <目录> --unsafe-override`。结果会标成"不能提交"，内部用不影响。这一条我还没亲手跑过。
- 分词器，比他们强一处。他们看不到 Claude 的分词器，只能近似，重建出的长度和服务商计数之比，中位数是 1.004。我们的模型和分词器都是 DeepSeek 的，可以一个 token 不差（第 2 篇复算过，和录制值只差 15 到 31 个）。
- 机器。按 11-13 启动会的纪要，比赛服务器预计 11-23 到货。

### 缺的

- 智能体。三个都还没在跑。本机找过一遍：深度研究评测基准里的运行程序只是把参赛智能体当黑箱调用，自己不带智能体。
- 代理和转换程序。SemiAnalysis 的整套只认 Claude Code 和 Anthropic 接口。我们走 OpenAI 兼容接口，两样都得自己写。
- 编号。他们得请 Anthropic 改 Claude Code 才带上编号。我们的智能体是自己或选手写的，可以直接在规则里要求每个请求带会话号和子智能体号，省掉他们那几道"结构"筛子。

### 从 13,316 → 393 学到的

1. 编号第一天就带齐：会话号、子智能体号、智能体版本号。缺一样，录了也可能大半作废。
2. 图片先想清楚。AgentX 1.0 根本不含图片。财务分析要读图表，先确认 DeepSeek V4.1 Flash 收不收图片：不收，图表只能以文字进模型，这条不成问题；收，现有的格式和回放都没覆盖。
3. 只录形状，不录内容。只留长度、时间和哈希。这样录选手的流量也能公开，不泄露谁写了什么。

### 流量的三个来源

````reasons
[
  {
    "number": "1",
    "title": "现在：开源智能体",
    "markdown": "拿开源的深度研究、PPT、财务智能体接 DeepSeek 的接口，前面挂代理。录到的是这类任务的样子，不是我们的智能体。"
  },
  {
    "number": "2",
    "title": "内部队跑通的那一周",
    "markdown": "内部队本来就要先在比赛服务器上把三个智能体跑通，这是第一批真正属于我们的流量。"
  },
  {
    "number": "3",
    "title": "比赛期间：每队前面挂同一个网关",
    "markdown": "一个网关同时办三件事：录流量；启动会纪要第九条说的运行数据采集（评审报告要写缓存用得怎样）；只放行指定的 DeepSeek 模型（防作弊）。前提是规则写明：智能体必须通过网络接口调模型，不能在进程里直接调推理引擎；并告诉选手会录，只录长度、时间和哈希，不录原文。"
  }
]
````

````callout
{
  "label": "一处要小心",
  "tone": "warn",
  "markdown": "比赛是一队一周轮流。如果用前面队伍的流量测后面队伍的效率，后面的队等于提前看到了考题的形状。所以测效率用的流量最好赛前定死（来源 1 和 2）；比赛中录的（来源 3）留给评审报告和下一届。用哪批流量、比赛中挂不挂网关，要和效率基准的负责人对齐。"
}
````

## 05还差什么 {#gaps}

````gap
{
  "number": "01",
  "markdown": "### AgentX 的流量只代表一种工作\n\n \n\n一家研究公司的人，用一个写代码的工具，长会话，没有图片。深度研究前段要搜索、上下文不断加新内容，PPT 要排版，财务要读表，和它是不是同一种形状，录了才知道。\n\n \n\n这正是要录自己流量的理由，也是第 1 篇差距 05 的答案方向。"
}
````

````gap
{
  "number": "02",
  "markdown": "### 没有我们机器的配方\n\n \n\nRTX Pro 服务器在发布文章的名单里，仓库里却没有对应的 AgentX 配方。16 张 RTX PRO 6000 Max-Q 上怎么切分模型、开多大窗口、并发开到多少，都要自己摸。\n\n \n\n到货后先过第 2 篇的接口体检单，再跑满一小时的合规点。"
}
````

````gap
{
  "number": "03",
  "markdown": "### 缓存在我们的机器上可能不挤\n\n \n\nDeepSeek V4.1 Flash 的缓存很小，显存富余。AgentX 最能拉开差距的那一项，在低并发时拉不开。\n\n \n\n要看出各队的差别，得把并发加上去，和启动会上\"每个基准 100 路甚至 1000 路并发\"的建议是一回事。"
}
````

````gap
{
  "number": "04",
  "markdown": "### \"录 → 转 → 回放\"整条路没人跑通过\n\n \n\n代理和转换程序都没有，AgentX 读本地目录这一步也只看过文档。\n\n \n\n这一步不用等显卡和智能体，在 Mac 上就能接通。"
}
````

## 06下一步 {#next}

先把路接通，再等机器和智能体。

````next
[
  {
    "number": "候选 · 第 04 篇",
    "title": "把\"录 → 转 → 回放\"接通",
    "markdown": "写好代理和转换程序；用一个脚本假装多轮、带子智能体的智能体，经代理打到假服务端；转成文件，让 AgentX 回放。"
  },
  {
    "number": "候选 · 第 05 篇",
    "title": "在真显卡上跑一个合规的点",
    "markdown": "比赛服务器到货后，vLLM 加 DeepSeek V4.1 Flash，先过接口体检单，再跑满一小时，看缓存命中和时延的真数。"
  },
  {
    "number": "候选 · 第 06 篇",
    "title": "质量那一半怎么配上",
    "markdown": "效率用 AgentX 量，质量用我们自己的评测基准判\"不劣于\"，两边怎么接起来。"
  }
]
````

#### 出处（2026-11-22 读的版本）

1. SemiAnalysis，[AgentX - InferenceXv3: Does CUDA Moat Hold up in Agentic Inferencing?](https://newsletter.semianalysis.com/p/agentx-inferencexv3-does-cuda-moat)，2026-08-24：智能体流量成主体的那段话、四个特点、"393 条 SemiAnalysis 内部的匿名轨迹"、和 Anthropic 一起加的两个功能、测过的机器与模型、Qwen3.5 用 256K 版的理由、B300 与 B200 的缓存工作集。
2. InferenceX 的 [AgentX 方法页](https://inferencex.semianalysis.com/infx/agentx/methodology)与[概览页](https://inferencex.semianalysis.com/agentx)：录制方式、语料快照（13,316 条会话、8,271 条 20 个请求以上、token 构成）、筛选条件、256K 版的统计、重建长度与服务商计数之比 1.004。
3. [数据集说明 semianalysisai/cc-traces-weka-062126](https://huggingface.co/datasets/semianalysisai/cc-traces-weka-062126)：筛子全文、建库命令、990,016 上限的原因、总数统计。
4. InferenceX 源码：`inferencex-e2e/infx/datasets/sample_proxy_traces.py`（`--sampling` 与 `--limit` 的逻辑、只收 Claude、2026-04-16 的起点、2.1.139 的含义）、`proxy_to_weka.py`（哈希换成会话内编号）、`benchmarks/single_node/srt-slurm-recipes/dsv41flash/vllm/b200-fp4-mtp/agentic.yaml`（窗口 1,048,576，4 卡与 8 卡）。
5. Claude Code 议题 [#49207](https://github.com/anthropics/claude-code/issues/49207)、[#66761](https://github.com/anthropics/claude-code/issues/66761)。
6. InferenceX 文档 `inferencex-e2e/docs/agentx-standalone.md`（哪些模型族用截短版）；agentx-harness 1.0.14 文档 `docs/tutorials/agentx-mvp.md`（本地目录回放的写法；"Callan Fox 录的语料"那句旧说法）、`weka-trace.md`（主线一般是 Opus、子智能体一般是 Haiku）、`tracelab-trace.md`（Claude Code 和 Codex 的子智能体能否配对）。
7. 我们自己的资料：[第 1 篇](/blog/install-agentx)（窗口与会话装得下的比例）、[第 2 篇](/blog/mock-server)（分词器复算、接口体检单）、`纵向优化推理方案/精读报告_vLLM博客_DeepSeek-V4.1-Flash大规模推理.md`（参数量与每 token 缓存的推算）、`比赛服务器/会议纪要_技术支持组启动会_2026-11-13.md`。

#### 本地文件

1. 挑选脚本与转换程序的副本：`~/projects/GOSIM/elite-game/agentx-lab/refs/inferencex/`。

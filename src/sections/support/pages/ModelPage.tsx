import { PageHeader } from '../../../components/PageHeader';
import { IndexTable, SupportFrame, SupportLink, SupportList } from '../components';

function FreezeRegistration() {
  return <section className={"section--s"} id={"register"} aria-labelledby={"reg-title"}>
    <div className={"container split split--rev"}>
      <div>
        <h2 id={"reg-title"}>{"冻结登记"}</h2>
        <p className={"lead"}>{"开赛前，评测方登记权重、tokenizer、chat 模板的哈希和精度，五队按同一份登记核对。"}</p>
        <SupportList className={"steps"} items={[
            <><div><b>{"下载权重和引擎镜像"}</b><span>{"地址随冻结登记一起公布"}</span></div></>,
            <><div><b>{"逐项比对哈希"}</b><span>{"和右边登记表上的值一致才算拿对了版本"}</span></div></>,
            <><div><b>{"读已知问题清单"}</b><span>{"评测方关掉的功能、禁用项都写在里面"}</span></div></>,
          ]} />
      </div>
      <div className={"entry"} aria-label={"冻结登记表"}>
        <div className={"entry__head"}><b>{"冻结登记"}</b><span className={"num"}>{"待登记"}</span></div>
        <div className={"entry__big"}>{"V4.1 Flash 1017"}</div>
        <div className={"notebook cells"}>
          <div><small>{"发布方"}</small><span>{"DeepSeek"}</span></div>
          <div><small>{"精度"}</small><span className={"fill"} data-fill={"precision"}>{"待登记"}</span></div>
          <div><small>{"权重哈希"}</small><span className={"fill"} data-fill={"weights-sha"}>{"待登记"}</span></div>
          <div><small>{"tokenizer 哈希"}</small><span className={"fill"} data-fill={"tokenizer-sha"}>{"待登记"}</span></div>
          <div><small>{"chat 模板哈希"}</small><span className={"fill"} data-fill={"template-sha"}>{"待登记"}</span></div>
          <div><small>{"引擎镜像哈希"}</small><span className={"fill"} data-fill={"image-sha"}>{"待登记"}</span></div>
        </div>
        <div className={"entry__foot"}><span className={"chip"}>{"登记以后赛中不换版本"}</span></div>
      </div>
    </div>
  </section>;
}

function ModelFeatures() {
  return <section className={"section"} aria-labelledby={"traits-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"traits-title"}>{"和比赛有关的几处特性"}</h2>
        <p className={"lead"}>{"第一阶段考 KV 状态管理、PD 分离和长任务，下面这几处直接影响怎么搭推理栈。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "特性" , scope: "col" }, { content: "技术报告和 vLLM 博客里怎么写" , scope: "col" }, { content: "跟哪道考题有关" , scope: "col" }]} rows={[
            { cells: [{ content: "上下文" , className: "name" }, { content: "序列长度在预训练中扩到 1M token；从 4K 到 1M，单 token 解码计算量只增加约四分之一" }, { content: "长任务，任务完成时间" }] },
            { cells: [{ content: "全局 KV 缓存" , className: "name" }, { content: "跨层共享，用 FP4 存，每 token 约 890 字节" }, { content: "I3 KV 状态管理" }] },
            { cells: [{ content: "滑动窗口 KV" , className: "name" }, { content: "不压缩，用 FP8 存，覆盖 40 层每层最近 128 个位置；前缀缓存要在每个可能命中的边界存一份" }, { content: "I3 前缀复用，I4 PD 分离时的 KV 交接" }] },
            { cells: [{ content: "投机解码" , className: "name" }, { content: "自带 DSpark 草稿结构：半自回归生成草稿，按置信度安排验证" }, { content: <>{"单流生成速度；正式评测能否开启"}<span className={"fill"} data-fill={"spec-decode"}>{"待定"}</span></> }] },
          ]} />
      </div>
      <p className={"note"}>{"KV 缓存：模型为已读内容保存的中间结果，复用它可以少算一遍。PD 分离：把读入提示（预填充）和逐字生成（解码）放在不同的卡上。来源：DeepSeek-V4.1-Flash 技术报告；vLLM 博客 2026-10-07、2026-10-23。"}</p>
    </div>
  </section>;
}

function ModelUsage() {
  return <section className={"section"} aria-labelledby={"use-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"use-title"}>{"开卷和正式评测，用法不一样"}</h2>
        <p className={"lead"}>{"第 30 小时封存正式系统，模型、Harness（智能体运行框架）、工具和依赖一起冻结。"}</p>
      </div>
      <div className={"cols2"}><article><h3>{"开卷，0 到 30 小时"}</h3><SupportList className={"ticks"} items={[
          "任何模型、智能体、开发与诊断工具都能用，包括 Codex、Claude Code",
          "外部工具的用量和本地资源分开记录",
          "不能用外部资源替代本地底座的验收",
        ]} /></article><article><h3>{"封存以后的正式评测"}</h3><SupportList className={"ticks"} items={[
          "只调用本地部署的 DeepSeek V4.1 Flash 1017",
          "不接在线智能体，不接外部模型接口",
          "每次运行前复位缓存：复位后发一个探针请求，缓存命中 token 为 0 才算复位成功",
          "引擎要开启缓存复位接口，只对评测方的 Runner（自动投题、收卷的程序）网络开放",
          <>{"网络怎么管："}<span className={"fill"} data-fill={"network-rule"}>{"待定"}</span></>,
        ]} /></article></div>
    </div>
  </section>;
}

function ModelReferences() {
  return <section className={"section"} aria-labelledby={"read-title"}>
    <div className={"container"}>
      <div className={"head"}>
        <h2 id={"read-title"}>{"先读这几份"}</h2>
        <p className={"lead"}>{"已知问题清单随引擎镜像发布；RTX PRO 6000 上的模型栈以验机实测为准。"}</p>
      </div>
      <div className={"sheet"}>
        <IndexTable headings={[{ content: "材料" , scope: "col" }, { content: "讲什么" , scope: "col" }]} rows={[
            { cells: [{ content: <><SupportLink href={"https://arxiv.org/abs/2609.19969"}>{"技术报告"}</SupportLink></> , className: "name" }, { content: "DeepSeek-V4.1-Flash 的结构、训练和评测，英文原文" }] },
            { cells: [{ content: <><SupportLink href={"https://vllm.ai/blog/2026-10-07-deepseek-v41-flash"}>{"vLLM 博客"}</SupportLink></> , className: "name" }, { content: "用 vLLM 部署这个模型的优化过程，含滑动窗口 KV 和前缀缓存的处理" }] },
            { cells: [{ content: <><span>{"中文阅读材料"}</span></> , className: "name" }, { content: "技术报告和两篇 vLLM 博客的中文译文，九个推理概念的解释" }] },
            { cells: [{ content: "已知问题清单" , className: "name" }, { content: <><span className={"fill"} data-fill={"known-issues"}>{"随引擎镜像发布"}</span></> }] },
          ]} />
      </div>
    </div>
  </section>;
}

export function ModelPage() {
  return <SupportFrame title={"统一模型：GAAC 技术支持"} banner={<>{"权重、tokenizer 和 chat 模板的哈希在冻结登记后公布。"}<SupportLink href={"notices.html"}>{"看公告"}</SupportLink></>}>
    <PageHeader title={"DeepSeek V4.1 Flash 1017"} id={"page-title"} description={<><p className={"lead"}>{"比赛的统一模型，五队用同一个版本。封存以后，正式评测只调用本地部署的这一版。"}</p></>} actions={<><SupportLink className={"pill primary"} href={"#register"}>{"看冻结登记"}</SupportLink><SupportLink className={"pill secondary"} href={"https://arxiv.org/abs/2609.19969"}>{"读技术报告"}</SupportLink></>}>{<></>}</PageHeader>
    <FreezeRegistration />
    <ModelFeatures />
    <ModelUsage />
    <ModelReferences />
  </SupportFrame>;
}

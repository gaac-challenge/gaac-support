import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';

const posts = [
  { number: '01', slug: 'install-agentx', title: '安装 AgentX', question: 'AgentX 能不能在我们手里跑起来？跑起来以后，它和我们的工作之间还差什么？', meta: '2026-11-22 · 推理基准 · 找到 10 条差距' },
  { number: '02', slug: 'mock-server', title: '拆开假服务端', question: '要让 AgentX 量出真数，推理服务端必须提供哪些接口，这些接口又必须有什么特性？', meta: '2026-11-22 · 接口与特性 · 一张接口体检单（候选）' },
  { number: '03', slug: '393-traces', title: '393 条流量从哪来', question: 'AgentX 的 393 条流量是怎么录、怎么挑出来的，适合测什么？照着录我们自己的，有没有条件？', meta: '2026-11-22 · 数据集与录制 · 13,316 条筛到 393 条' },
];

const upcoming = [
  { number: '04', title: '把"录 → 转 → 回放"接通', description: '写好代理和转换程序，用脚本假装一个智能体，录下来让 AgentX 对着假服务端回放；不用等显卡' },
  { number: '05', title: '在真显卡上跑一个合规的 AgentX 点', description: '先过接口体检单，再看 16 张 RTX PRO 6000 Max-Q 上的 DeepSeek-V4.1-Flash 缓存命中和时延的真数' },
  { number: '06', title: '质量那一半怎么配上', description: '效率用 AgentX 量，质量用我们自己的评测基准判"不劣于"' },
];

export function BlogIndex() {
  return <section className="blog-index" data-blog-fidelity>
    <p className="blog-meta">GAAC 精英赛 · 动手笔记</p>
    <PageHeader title="一篇一个小问题" description="每篇只解决一个小问题：先说为什么要做，再直接动手，最后把发现的差距列清楚。差距就是下一篇的题目。" />
    {posts.map(({ number, slug, title, question, meta }) => <Link className="card blog-post-link" key={slug} to={'/blog/' + slug}>
      <span className="blog-number">{number}</span><div><h2>{title}</h2><p>{question}</p><p className="blog-meta">{meta}</p></div>
    </Link>)}
    <h2>候选的下一篇</h2>
    <div className="card blog-upcoming">
      {upcoming.map(({ number, title, description }) => <div key={number}><span>{number}</span><div><b>{title}</b><p>{description}</p></div></div>)}
    </div>
  </section>;
}

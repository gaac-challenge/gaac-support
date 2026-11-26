import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Article } from '../../components/Article';
import { PageHeader } from '../../components/PageHeader';
import { publicUrl, SiteLink } from '../../components/links';
import { PipelineDiagram, SequenceDiagram } from './Diagrams';
import { Category, Checklist, Gap, NextPosts, NoteBox, Playback, Reasons } from './ArticleBlocks';

type Metadata = { title: string; series: string; kicker: string; description: string; meta: string[] };
type Stat = { value: string; label: string };
type Question = { label: string; text: string };
type Drawing = { drawing: string; title?: string; label?: string; description?: string; caption?: string };

export function parsePost(source: string) {
  const [, frontmatter, markdown] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source)!;
  const meta = Object.fromEntries(frontmatter.trim().split('\n').map((line) => {
    const split = line.indexOf(':');
    return [line.slice(0, split), JSON.parse(line.slice(split + 1))];
  })) as Metadata;
  return { meta, markdown };
}

function QuestionBox({ label, text }: Question) {
  return <aside className="blog-question"><strong>{label}</strong><Markdown>{text}</Markdown></aside>;
}

function StatRow({ stats }: { stats: Stat[] }) {
  return <ul className="blog-stat-row">{stats.map(({ value, label }) => <li key={label}>
    <strong>{value}</strong><Markdown>{label}</Markdown>
  </li>)}</ul>;
}

function DrawingFrame({ slug, drawing, title }: { slug: string; drawing: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(190);
  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== ref.current?.contentWindow) return;
      if (event.data?.type === 'gaac-blog-drawing' && Number.isFinite(event.data.height)) setHeight(Math.max(1, event.data.height));
    }
    window.addEventListener('message', resize);
    return () => window.removeEventListener('message', resize);
  }, []);
  const src = publicUrl('blog-art/index.html?' + new URLSearchParams({ post: slug, figure: drawing }));
  return <iframe ref={ref} className="blog-drawing" src={src} height={height} title={title} />;
}

function Figure({ slug, data }: { slug: string; data: Drawing }) {
  return <figure className="blog-figure card" id={data.drawing}>
    {data.title && <header><strong>{data.title}</strong><span>{data.label}</span></header>}
    {data.description && <p>{data.description}</p>}
    <DrawingFrame slug={slug} drawing={data.drawing} title={data.title ?? '四个回合的块编号'} />
    {data.caption && <figcaption><Markdown>{data.caption}</Markdown></figcaption>}
  </figure>;
}

function fenced(children: ReactNode) {
  const code = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(code)) return;
  const kind = code.props.className?.replace(/^language-/, '');
  if (kind && ['question', 'stats', 'drawing', 'sequence', 'pipeline', 'playback', 'reasons', 'gap', 'category', 'next', 'callout', 'checklist'].includes(kind)) return { kind, value: JSON.parse(String(code.props.children)) };
}

function heading(children: ReactNode) {
  const pieces = Children.toArray(children);
  const tail = pieces.at(-1);
  const marker = typeof tail === 'string' ? /\s+\{#([\w-]+)\}$/.exec(tail) : null;
  const values = marker && typeof tail === 'string' ? [...pieces.slice(0, -1), tail.slice(0, marker.index)] : pieces;
  const first = values[0];
  const ordinal = typeof first === 'string' && /^[0-9]{2}/.exec(first);
  if (ordinal && typeof first === 'string') values[0] = first.slice(2);
  return { id: marker?.[1], children: <>{ordinal && <span className="blog-section-number">{ordinal[0]}</span>}{values}</> };
}

export function BlogPost({ slug, post }: { slug: string; post: ReturnType<typeof parsePost> }) {
  const { meta, markdown } = post;
  const [series, number] = meta.series.split(' · ');
  return <Article content={<div className="blog-post" data-blog-fidelity>
    <div className="blog-meta"><Link to="/blog">{series}</Link> · {number}</div>
    <p className="blog-meta blog-kicker">{meta.kicker}</p>
    <PageHeader title={meta.title} description={meta.description}>
      <div className="blog-meta blog-post-meta">{meta.meta.map((item) => <span key={item}>{item}</span>)}</div>
    </PageHeader>
    <div className="blog-prose">
      <Markdown skipHtml remarkPlugins={[remarkGfm]} components={{
        pre: ({ children }) => {
          const block = fenced(children);
          if (block?.kind === 'question') return <QuestionBox {...block.value} />;
          if (block?.kind === 'stats') return <StatRow stats={block.value} />;
          if (block?.kind === 'drawing') return <Figure slug={slug} data={block.value} />;
          if (block?.kind === 'sequence') return <SequenceDiagram data={block.value} />;
          if (block?.kind === 'pipeline') return <PipelineDiagram data={block.value} />;
          if (block?.kind === 'playback') return <Playback data={block.value} drawing={<DrawingFrame slug={slug} drawing="blocks" title="四个回合的块编号" />} />;
          if (block?.kind === 'reasons') return <Reasons items={block.value} />;
          if (block?.kind === 'gap') return <Gap data={block.value} />;
          if (block?.kind === 'category') return <Category {...block.value} />;
          if (block?.kind === 'next') return <NextPosts items={block.value} />;
          if (block?.kind === 'callout') return <NoteBox {...block.value} />;
          if (block?.kind === 'checklist') return <Checklist items={block.value} />;
          return <pre>{children}</pre>;
        },
        h2: ({ children }) => <h2 {...heading(children)} />,
        table: ({ children }) => <div className="blog-table" tabIndex={0}><table>{children}</table></div>,
        a: ({ href, children }) => href?.startsWith('/blog') ? <SiteLink to={href}>{children}</SiteLink> : <a href={href}>{children}</a>,
      }}>{markdown}</Markdown>
    </div>
  </div>} />;
}

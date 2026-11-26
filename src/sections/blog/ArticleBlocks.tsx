import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SiteLink } from '../../components/links';

export function EditorialMarkdown({ children, inline }: { children: string; inline?: boolean }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{
    p: ({ children }) => inline ? <>{children}</> : <p>{children}</p>,
    a: ({ href, children }) => href?.startsWith('/blog') ? <SiteLink to={href}>{children}</SiteLink> : <a href={href}>{children}</a>,
    table: ({ children }) => <div className="blog-table" tabIndex={0}><table>{children}</table></div>,
  }}>{children}</Markdown>;
}

type EditorialEntry = { number: string; title: string; markdown: string };
export function Reasons({ items }: { items: EditorialEntry[] }) {
  return <div className="blog-reasons">{items.map(({ number, title, markdown }) => <section className="blog-reason" key={number}>
    <span>{number}</span><div><h3><EditorialMarkdown inline>{title}</EditorialMarkdown></h3><EditorialMarkdown>{markdown}</EditorialMarkdown></div>
  </section>)}</div>;
}

export function NextPosts({ items }: { items: EditorialEntry[] }) {
  return <div className="blog-next">{items.map(({ number, title, markdown }) => <div className="card blog-next-post" key={number}>
    <span>{number}</span><strong><EditorialMarkdown inline>{title}</EditorialMarkdown></strong><EditorialMarkdown>{markdown}</EditorialMarkdown>
  </div>)}</div>;
}

export function Gap({ data }: { data: Pick<EditorialEntry, 'number' | 'markdown'> }) {
  return <div className="blog-gap"><span>{data.number}</span><div><EditorialMarkdown>{data.markdown}</EditorialMarkdown></div></div>;
}

export function Category({ label, description }: { label: string; description: string }) {
  return <div className="blog-gap-category"><span>{label}</span><em>{description}</em></div>;
}

export function NoteBox({ label, tone, markdown }: { label: string; tone: string; markdown: string }) {
  return <aside className={'blog-note-box ' + tone}><strong>{label}</strong><EditorialMarkdown>{markdown}</EditorialMarkdown></aside>;
}

export type PlaybackData = {
  title: string; intro: string; steps: { number: string; title: string; text: string }[]; chartNote: string; legend: string[];
};

export function Playback({ data, drawing }: { data: PlaybackData; drawing: ReactNode }) {
  return <section className="card blog-playback" aria-labelledby="blog-playback-title">
    <header><h3 id="blog-playback-title">{data.title}</h3><span>{data.intro}</span></header>
    <ol className="blog-playback-steps">{data.steps.map(({ number, title, text }) => <li key={number}>
      <span>{number}</span><strong>{title}</strong><p>{text}</p>
    </li>)}</ol>
    <div className="blog-playback-chart">
      <p>{data.chartNote}</p>
      {drawing}
      <ul className="blog-playback-legend">{data.legend.map((item) => <li key={item}><i />{item}</li>)}</ul>
    </div>
  </section>;
}

export function Checklist({ items }: { items: { title: string; markdown: string }[] }) {
  return <ol className="blog-checklist">{items.map(({ title, markdown }) =>
    <li key={title}><div><strong>{title}</strong><EditorialMarkdown>{markdown}</EditorialMarkdown></div></li>)}</ol>;
}

import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { Figure } from './Figure';
import { publicUrl, SiteLink } from './links';
import { PageHeader } from './PageHeader';

const parser = unified().use(remarkParse).use(remarkGfm);
type Tree = ReturnType<typeof parser.parse>;
type TextNode = { value?: string; alt?: string | null; children?: TextNode[]; type: string };

function headingText(node: TextNode): string {
  return node.value ?? node.alt ?? node.children?.map(headingText).join('') ?? '';
}

function outline(tree: Tree) {
  const used = new Set<string>();
  return tree.children.flatMap((node) => {
    if (node.type !== 'heading') return [];
    const label = headingText(node);
    const base = 'section-' + (label.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'heading');
    let id = base;
    for (let suffix = 2; used.has(id); suffix++) id = base + '-' + suffix;
    used.add(id);
    return [{ node, id, label, depth: node.depth }];
  });
}

function headingIds() {
  return (tree: Tree) => {
    for (const { node, id } of outline(tree)) node.data = { ...node.data, hProperties: { id } };
  };
}

export function Callout({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return <aside className="article-callout">{title && <strong>{title}</strong>}{children}</aside>;
}

export function Article({ title, description, markdown, children }: {
  title: string; description?: ReactNode; markdown: string; children?: ReactNode;
}) {
  const headings = outline(parser.parse(markdown)).filter(({ depth }) => depth === 2 || depth === 3);
  return <article className="article">
    <PageHeader title={title} description={description} />
    <div className={headings.length ? 'article-layout' : 'article-layout article-layout-single'}>
      {!!headings.length && <nav className="card article-toc" aria-label="目录">
        <strong>目录</strong>
        <ul>{headings.map(({ id, label, depth }) => <li key={id} className={depth === 3 ? 'article-toc-sub' : undefined}><a href={'#' + id}>{label}</a></li>)}</ul>
      </nav>}
      <div className="card article-prose">
        <Markdown skipHtml remarkPlugins={[remarkGfm, headingIds]} components={{
          table: ({ children }) => <div className="article-table-scroll" tabIndex={0}><table>{children}</table></div>,
          a: ({ href, children }) => href && /^\/(?!\/)/.test(href) ? <SiteLink to={href}>{children}</SiteLink> : <a href={href}>{children}</a>,
          img: ({ src, alt }) => typeof src === 'string' && <img src={src.startsWith('/') && !src.startsWith('//') ? publicUrl(src) : src} alt={alt ?? ''} loading="lazy" />,
        }}>{markdown}</Markdown>
        {children}
      </div>
    </div>
  </article>;
}

export { Figure };

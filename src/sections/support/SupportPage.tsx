import { createElement, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageTitle } from '../../components/Layout';
import { PageHeader } from '../../components/PageHeader';
import { publicUrl, SiteLink } from '../../components/links';
import home from './content/index.json';
import tasks from './content/tasks.json';
import model from './content/model.json';
import search from './content/search.json';
import data from './content/data.json';
import tools from './content/tools.json';
import evaluation from './content/eval.json';
import notices from './content/notices.json';
import status from './content/status.json';
import desk from './content/desk.json';
import './support.css';

type Node = string | { tag: string; props: Readonly<Record<string, unknown>>; children: readonly Node[] };
type Page = {
  title: string; banner: Node[]; body: Node[];
  header: { id: string; title: Node[]; description: Node[]; actions: Node[]; extras: Node[] } | null;
};
type StreetWindow = Window & { gaacStreet?: { highlight: (building: string | null) => void } };

const pages: Record<string, Page> = {
  '/': home, '/tasks': tasks, '/model': model, '/search': search, '/data': data, '/tools': tools,
  '/eval': evaluation, '/notices': notices, '/status': status, '/desk': desk,
};

function contentLink(href: string) {
  const match = /^([a-z]+)\.html(#[^ ]*)?$/.exec(href);
  if (!match) return undefined;
  const result = match[1] === 'index' ? '/' : '/' + match[1];
  return pages[result] ? result + (match[2] ?? '') : undefined;
}

export default function SupportPage() {
  const path = useLocation().pathname.replace(/\/$/, '') || '/';
  const page = pages[path];
  const street = useRef<HTMLIFrameElement>(null);
  usePageTitle(page.title);
  function highlight(building: string | null) {
    (street.current?.contentWindow as StreetWindow | null)?.gaacStreet?.highlight(building);
  }
  function render(nodes: readonly Node[]): ReactNode {
    return nodes.map((node, index) => {
      if (typeof node === 'string') return node;
      if (node.tag === 'street') {
        return <figure key={index} className="street-frame">
          <iframe ref={street} title={String(node.props['aria-label'])} src={publicUrl('street/index.html')} />
        </figure>;
      }
      const children = render(node.children);
      if (node.tag === 'a' && typeof node.props.href === 'string') {
        const { href, className, ...props } = node.props;
        const to = contentLink(href);
        const classes = typeof className === 'string' ? className.replace(/\bbtn--primary\b/g, 'primary').replace(/\bbtn\b/g, 'pill') : undefined;
        const kind = classes?.includes('pill') && !classes.includes('primary') ? classes + ' secondary' : classes;
        return to === undefined
          ? <SiteLink key={index} href={href} className={kind} {...props}>{children}</SiteLink>
          : <SiteLink key={index} to={to} className={kind} {...props}>{children}</SiteLink>;
      }
      const building = node.props['data-building'];
      const events = typeof building === 'string' ? {
        onPointerEnter: () => highlight(building), onPointerLeave: () => highlight(null),
        onFocus: () => highlight(building), onBlur: () => highlight(null),
      } : {};
      return createElement(node.tag, { ...node.props, key: index, ...events }, children);
    });
  }
  const { banner, header, body } = page;
  return <div className={'support-page' + (path === '/' ? ' support-home' : '')}>
    {!!banner.length && <div className="support-banner"><p>{render(banner)}</p></div>}
    {header && <PageHeader title={render(header.title)} id={header.id}
      description={render(header.description)} actions={render(header.actions)}>
      {render(header.extras)}
    </PageHeader>}
    {render(body)}
  </div>;
}

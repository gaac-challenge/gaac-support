import { createElement, useEffect, useRef, type ReactNode } from 'react';
import { publicUrl, SiteLink } from './links';

export type ContentNode = string | { tag: string; attrs: Record<string, unknown>; children: ContentNode[] };
export type ConvertedPage = { title: string; nodes: ContentNode[] };

const attributeNames: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', colspan: 'colSpan', rowspan: 'rowSpan',
  readonly: 'readOnly', inputmode: 'inputMode', autofocus: 'autoFocus', 'xlink:href': 'xlinkHref',
};
const voidElements = new Set(['br', 'hr', 'img', 'input', 'source', 'wbr', 'col']);

function render(nodes: ContentNode[]): ReactNode {
  return nodes.map((node, key) => {
    if (typeof node === 'string') return node;
    const props = Object.fromEntries(Object.entries(node.attrs).map(([name, value]) => [
      attributeNames[name] ?? (name.startsWith('stroke-') || name.startsWith('fill-') || name.startsWith('text-') || name === 'font-size'
        ? name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) : name),
      typeof value === 'string' && (name === 'src' || name === 'href') && value.startsWith('@') ? publicUrl(value.slice(1)) : value,
    ]));
    if (node.tag === 'input' && 'value' in props) {
      props.defaultValue = props.value;
      delete props.value;
    }
    if (node.tag === 'a' && typeof props.href === 'string' && typeof node.attrs.href === 'string' && /^\/(?!\/)/.test(node.attrs.href)) {
      const { href, ...rest } = props;
      return <SiteLink key={key} to={String(href)} {...rest}>{render(node.children)}</SiteLink>;
    }
    return createElement(node.tag, { ...props, key }, voidElements.has(node.tag) ? undefined : render(node.children));
  });
}

export function ConvertedContent({ className, page, mount }: {
  className: string; page: ConvertedPage; mount?: (root: HTMLDivElement) => void | (() => void);
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current) return mount?.(root.current);
  }, [mount]);
  return <div ref={root} className={className} data-converted-content>{render(page.nodes)}</div>;
}

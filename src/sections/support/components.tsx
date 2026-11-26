import { createContext, useContext, useRef, type AnchorHTMLAttributes, type ReactNode, type ThHTMLAttributes } from 'react';
import { usePageTitle } from '../../components/Layout';
import { publicUrl, SiteLink } from '../../components/links';
import './support.css';

type StreetWindow = Window & { gaacStreet?: { highlight: (building: string | null) => void } };
const StreetContext = createContext<{
  frame: React.RefObject<HTMLIFrameElement | null>;
  highlight: (building: string | null) => void;
} | null>(null);

export function SupportFrame({ title, home, banner, children }: { title: string; home?: boolean; banner?: ReactNode; children: ReactNode }) {
  usePageTitle(title);
  const frame = useRef<HTMLIFrameElement>(null);
  function highlight(building: string | null) {
    (frame.current?.contentWindow as StreetWindow | null)?.gaacStreet?.highlight(building);
  }
  return <StreetContext.Provider value={{ frame, highlight }}>
    <div className={home ? 'support-page support-home' : 'support-page'}>
      {banner && <div className="support-banner"><p>{banner}</p></div>}
      {children}
    </div>
  </StreetContext.Provider>;
}

export function Street({ title }: { title: string }) {
  const street = useContext(StreetContext);
  return <figure className="street-frame"><iframe ref={street?.frame} title={title} src={publicUrl('street/index.html')} /></figure>;
}

export function SupportLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const match = /^([a-z]+)\.html(#[^ ]*)?$/.exec(href);
  if (!match) return <SiteLink href={href} {...props} />;
  const to = (match[1] === 'index' ? '/' : '/' + match[1]) + (match[2] ?? '');
  return <SiteLink to={to} {...props} />;
}

type TableCell = { content: ReactNode; className?: string; scope?: ThHTMLAttributes<HTMLTableCellElement>['scope'] };
type TableRow = { cells: TableCell[]; building?: string };

export function IndexTable({ headings, rows }: { headings: TableCell[]; rows: TableRow[] }) {
  const street = useContext(StreetContext);
  return <table className="index">
    <thead><tr>{headings.map(({ content, ...props }, index) => <th key={index} {...props}>{content}</th>)}</tr></thead>
    <tbody>{rows.map(({ cells, building }, index) => {
      const events = building && street ? {
        onPointerEnter: () => street.highlight(building), onPointerLeave: () => street.highlight(null),
        onFocus: () => street.highlight(building), onBlur: () => street.highlight(null),
      } : {};
      return <tr key={index} data-building={building} {...events}>
        {cells.map(({ content, className }, column) => <td className={className} key={column}>{content}</td>)}
      </tr>;
    })}</tbody>
  </table>;
}

export function Facts({ className, facts }: { className: string; facts: { label: ReactNode; value: ReactNode }[] }) {
  return <dl className={className}>{facts.map(({ label, value }, index) => <div key={index}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function WeekBar({ label, slots }: { label: string; slots: { label: ReactNode; hours: ReactNode; variant?: string }[] }) {
  return <ol className="week" aria-label={label}>{slots.map(({ label, hours, variant }, index) =>
    <li className={variant} key={index}><b>{label}</b><small>{hours}</small></li>)}</ol>;
}

export function SupportList({ className, items }: { className: string; items: ReactNode[] }) {
  const list = items.map((item, index) => <li key={index}>{item}</li>);
  return className === 'steps' ? <ol className={className}>{list}</ol> : <ul className={className}>{list}</ul>;
}

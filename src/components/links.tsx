import type { AnchorHTMLAttributes } from 'react';
import { NavLink } from 'react-router-dom';

export function publicUrl(path: string) {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  ({ to: string; href?: never } | { href: string; to?: never });

export function SiteLink({ to, href, ...props }: SiteLinkProps) {
  if (to !== undefined) return <NavLink {...props} to={to} end />;
  return <a {...props} href={href} />;
}

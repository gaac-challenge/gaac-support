import type { ReactNode } from 'react';

type FigureProps = { caption?: ReactNode; className?: string } &
  ({ src: string; alt: string; width?: number; height?: number; children?: never } |
    { children: ReactNode; src?: never; alt?: never; width?: never; height?: never });

export function Figure({ src, alt, width, height, children, caption, className }: FigureProps) {
  return <figure className={className ? 'article-figure ' + className : 'article-figure'}>
    {src ? <img src={src} alt={alt} width={width} height={height} loading="lazy" /> : children}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

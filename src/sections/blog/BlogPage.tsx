import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Article } from '../../components/Article';
import { ConvertedContent, type ConvertedPage } from '../../components/ConvertedContent';
import { MissingPage, usePageTitle } from '../../components/Layout';
// @ts-expect-error Original chart code is an isolated JavaScript module.
import { drawings } from './drawings.js';
import pages from './content/pages.json';
import './content/source.css';
import './blog.css';

const entries: Record<string, ConvertedPage> = pages;
const mountDrawings: Record<string, (root: HTMLDivElement, signal: AbortSignal) => void> = drawings;

export default function BlogPage() {
  const { slug = '' } = useParams();
  const page = Object.hasOwn(entries, slug) ? entries[slug] : undefined;
  usePageTitle(page?.title ?? '页面未找到');
  const mount = useCallback((root: HTMLDivElement) => {
    const lifecycle = new AbortController();
    mountDrawings[slug]?.(root, lifecycle.signal);
    return () => lifecycle.abort();
  }, [slug]);
  if (!page) return <MissingPage />;
  return <Article content={<ConvertedContent key={slug} className={'blog-page blog-page-' + (slug || 'index')} page={page} mount={mount} />} />;
}

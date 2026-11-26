import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ConvertedContent, type ConvertedPage } from '../../components/ConvertedContent';
import { MissingPage, usePageTitle } from '../../components/Layout';
// @ts-expect-error Original chart code is an isolated JavaScript module.
import { drawings } from './drawings.js';
import pages from './content/pages.json';
import './content/source.css';
import './comic.css';

const entries: Record<string, ConvertedPage> = pages;
const mountDrawings: Record<string, (root: HTMLDivElement, signal: AbortSignal) => void> = drawings;

export default function ComicPage() {
  const { volume = '' } = useParams();
  const page = Object.hasOwn(entries, volume) ? entries[volume] : undefined;
  usePageTitle(page?.title ?? '页面未找到');
  const mount = useCallback((root: HTMLDivElement) => {
    const lifecycle = new AbortController();
    mountDrawings[volume]?.(root, lifecycle.signal);
    return () => lifecycle.abort();
  }, [volume]);
  if (!page) return <MissingPage />;
  return <ConvertedContent key={volume} className={'comic-page comic-page-' + (volume || 'index')} page={page} mount={mount} />;
}

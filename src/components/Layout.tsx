import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { sections, routes } from '../sections';
import { publicUrl, SiteLink } from './links';

const official = 'https://gaac.gosim.org/';
const guide = 'https://search-api.54-82-224-126.sslip.io/guide/';
const siteName = 'GAAC 技术支持';
const navigation = (group: (typeof sections)[number]['group']) => sections
  .filter((section) => section.group === group)
  .flatMap((section) => section.navigation.map((path) => section.routes.find((route) => route.path === path)!));

function NavigationLinks({ group }: { group: (typeof sections)[number]['group'] }) {
  return navigation(group).map((entry) => entry.load
    ? <SiteLink key={entry.path} to={entry.path}>{entry.label}</SiteLink>
    : <SiteLink key={entry.path} href={publicUrl(entry.legacy!)}>{entry.label}</SiteLink>);
}

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const reading = useRef<HTMLDetailsElement>(null);
  const mobile = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (reading.current) reading.current.open = false;
    if (mobile.current) mobile.current.open = false;
  }, [pathname]);
  return <div className="site-shell">
    <a className="skip-link" href="#main">跳到正文</a>
    <header className="site-header">
      <Link className="site-brand" to="/" aria-label="GAAC 技术支持首页" title="GAAC Support">
        <img src={publicUrl('gaac-logo-192.png')} alt="" width="83" height="28" /><span>{siteName}</span>
      </Link>
      <nav className="site-nav" aria-label="板块">
        <NavigationLinks group="support" />
        <details className="site-menu" ref={reading}>
          <summary>资料</summary>
          <div className="site-menu-panel"><NavigationLinks group="reading" /></div>
        </details>
      </nav>
      <div className="site-actions">
        <Link className="pill primary" to="/desk">本队任务台</Link>
        <details className="site-menu site-menu-mobile" ref={mobile}>
          <summary className="pill secondary">菜单</summary>
          <div className="site-menu-panel">
            <nav aria-label="板块"><NavigationLinks group="support" /></nav>
            <nav aria-label="资料"><NavigationLinks group="reading" /></nav>
          </div>
        </details>
      </div>
    </header>
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      <div>
        <strong>{siteName}</strong>
        <p>智能体大奖赛（Grand Agentic AI Challenge）的参赛技术支持。规则以参赛手册为准。</p>
      </div>
      <nav aria-label="板块"><h2>板块</h2><Link to="/tasks">比赛任务</Link><Link to="/model">统一模型</Link><Link to="/search">搜索服务</Link><Link to="/data">数据集</Link><Link to="/tools">工具应用</Link><Link to="/eval">测评服务</Link></nav>
      <nav aria-label="服务台"><h2>服务台</h2><Link to="/desk">本队任务台</Link><Link to="/status">运行状态</Link><Link to="/notices">公告与答疑</Link></nav>
      <nav aria-label="赛事"><h2>赛事</h2><a href={official}>GAAC 官网 <span aria-hidden="true">↗</span></a><a href={guide}>搜索接入指南 <span aria-hidden="true">↗</span></a><NavigationLinks group="secondary" /></nav>
      <p className="site-colophon">草案，2026 年 11 月。开赛日期、下载地址和哈希定下来以后再填。</p>
    </footer>
  </div>;
}

export function RoutePosition() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const anchor = Array.from(document.querySelectorAll('[id]')).find((element) => '#' + encodeURI(element.id) === hash || '#' + element.id === hash);
      anchor?.scrollIntoView?.();
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname, hash]);
  return null;
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title.includes(siteName) ? title : title + ' · ' + siteName;
  }, [title]);
}

export function LegacyPage({ label, path }: { label: string; path: string }) {
  usePageTitle(label);
  return <section className="card page-heading">
    <h1>{label}</h1>
    <a className="pill primary" href={publicUrl(path)}>打开原版页面</a>
  </section>;
}

export function MissingPage() {
  usePageTitle('页面未找到');
  return <section className="card page-heading">
    <h1>页面未找到</h1>
    <Link className="pill primary" to="/">回到首页</Link>
  </section>;
}

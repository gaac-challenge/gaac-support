import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '../../components/Layout';
import { PageHeader } from '../../components/PageHeader';
import { api, errorCode, errorMessage, passwordRequired, post, type Config, type Session } from './api';
import { AccountPage, AuthPage, JoinPage } from './Auth';
import TeamPage from './TeamPage';
import AdminPage from './AdminPage';
import type { Run } from './ui';
import { team } from './routes';
import './team.css';

export default function TeamArea() {
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '');
  const isJoin = path === '/join' || path.startsWith('/join/');
  const token = useParams()['*'] ?? '';
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>();
  const [config, setConfig] = useState<Config | null>(null);
  const [forced, setForced] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState<{ path: string; text: string }>();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const title = isJoin ? '加入队伍' : team.routes.find((route) => route.path === path)?.label ?? '我的队伍';
  usePageTitle(title);

  async function refresh(signal?: AbortSignal) {
    try {
      const current = await api<Session>('/me', { signal });
      if (!signal?.aborted) {
        setSession(current);
        setForced(current.user.must_change_password);
        setLoadError('');
      }
      return current;
    } catch (error) {
      if (signal?.aborted) return null;
      const code = errorCode(error);
      if (code === 'unauthorized' || code === 'password_change_required') {
        setSession(null);
        setForced(code === 'password_change_required');
        setLoadError('');
        return null;
      }
      throw error;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const requirePassword = () => setForced(true);
    window.addEventListener(passwordRequired, requirePassword);
    void api<Config>('/public/config', { signal: controller.signal }).then(setConfig).catch(() => {});
    void refresh(controller.signal).catch((error) => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); });
    return () => { controller.abort(); window.removeEventListener(passwordRequired, requirePassword); };
  }, []);

  const run: Run = async (work) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await work();
    } catch (error) {
      if (errorCode(error) === 'password_change_required') {
        setForced(true);
        navigate('/account/', { replace: true, state: token ? { join: token } : undefined });
      } else {
        if (errorCode(error) === 'unauthorized' && session) setSession(null);
        setError({ path, text: errorMessage(error) });
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  if (path === '/desk') return <Navigate to="/team/" replace />;
  if (loadError) return <PageHeader title="队伍服务" description={<p role="alert">{loadError}</p>} actions={<button className="pill secondary" onClick={() => void refresh().catch((error) => setLoadError(errorMessage(error)))}>重试</button>} />;
  if (session === undefined) return <p role="status">正在加载账号状态…</p>;
  if (forced && path !== '/account') return <Navigate to="/account/" replace state={token ? { join: token } : undefined} />;
  const actions = { run, busy, refresh };

  function page() {
    if (isJoin) return <JoinPage key={token} token={token} session={session ?? null} {...actions} />;
    if (session && (path === '/login' || path === '/signup')) return <Navigate to="/team/" replace />;
    if (path === '/account' && (session || forced)) return <AccountPage session={session ?? null} forced={forced} join={location.state?.join} {...actions} />;
    if (!session) {
      const lead = path === '/signup' ? '使用组委会发放的邀请码注册队长账号。'
        : path === '/admin' ? '使用组委会账号登录管理后台。'
          : path === '/account' ? '登录后可以管理账号资料和密码。'
            : '登录后可以创建队伍、邀请队友、管理成员。';
      return <AuthPage key={path} title={title} lead={lead} signup={path === '/signup'} config={config} {...actions} />;
    }
    if (path === '/admin') return session.user.role === 'organizer' ? <AdminPage self={session.user.id} run={run} busy={busy} />
      : <PageHeader title="组委会管理" description="此页面仅对组委会账号开放。" />;
    return <TeamPage session={session} {...actions} />;
  }

  return <div className="team-area">
    {session && <nav className="team-account-bar" aria-label="队伍服务">
      <Link to="/team/">我的队伍</Link><Link to="/account/">我的账号</Link>
      {session.user.role === 'organizer' && <Link to="/admin/">组委会管理</Link>}
      <button type="button" className="pill team-quiet" disabled={busy} onClick={() => void run(async () => {
        await post('/auth/logout');
        await refresh();
        navigate('/team/', { replace: true });
      })}>退出登录</button>
    </nav>}
    {error?.path === path && <p className="team-message team-error" role="alert">{error.text}</p>}
    {page()}
  </div>;
}

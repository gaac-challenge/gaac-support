import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, patch, post, type Config, type Preview, type Session, type User } from './api';
import { DateText, Form, value, type Run } from './ui';

type Actions = { run: Run; busy: boolean; refresh: () => Promise<Session | null> };

export function Credentials({ signup, token, run, busy, success }: Pick<Actions, 'run' | 'busy'> & {
  signup: boolean; token?: string; success: (user: User) => Promise<void>;
}) {
  return <Form submit={signup ? '注册' : '登录'} busy={busy} onSubmit={(data) => void run(async () => {
    const credentials = { email: value(data, 'email').trim(), password: value(data, 'password') };
    const body = signup ? {
      ...credentials, display_name: value(data, 'display_name').trim(),
      ...(token ? { team_token: token } : { invite_code: value(data, 'invite_code').trim() }),
    } : credentials;
    const { user } = await post<{ user: User }>(signup ? '/auth/signup' : '/auth/login', body);
    await success(user);
  })}>
    <label>邮箱<input name="email" type="email" autoComplete="email" required /></label>
    {signup && <label>显示名称<input name="display_name" autoComplete="nickname" maxLength={100} required /></label>}
    {signup && !token && <label>注册邀请码<input name="invite_code" autoComplete="off" required /></label>}
    <label>密码<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 12 : undefined} required /></label>
    {signup && <small>密码至少 12 个字符。</small>}
  </Form>;
}

export function AuthPage({ signup, config, run, busy, refresh }: Actions & { signup: boolean; config: Config | null }) {
  const navigate = useNavigate();
  return <>
    <PageHeader title={signup ? '注册' : '登录'} description={signup ? '使用组委会发放的邀请码注册队长账号。' : '登录后创建队伍或管理现有队伍。'} />
    <section className="card team-stack team-narrow">
      <Credentials signup={signup} run={run} busy={busy} success={async (user) => {
        await refresh();
        navigate(user.must_change_password ? '/account/' : '/team/', { replace: true });
      }} />
      {signup && config?.accounts?.email_verification === 'required' && <p>当前要求验证邮箱。注册后请联系组委会完成验证。</p>}
      {!signup && <p>忘记密码请联系组委会重置。</p>}
      <Link to={signup ? '/login/' : '/signup/'}>{signup ? '已有账号？登录' : '没有账号？注册'}</Link>
    </section>
  </>;
}

export function JoinPage({ token, session, run, busy, refresh }: Actions & { token: string; session: Session | null }) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState('');
  const [signup, setSignup] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (token) void api<Preview>('/team-invites/' + encodeURIComponent(token) + '/preview', { signal: controller.signal })
      .then(setPreview).catch((error) => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [token]);

  const redeem = () => post('/team-invites/redeem', { team_token: token });
  async function finish() {
    await refresh();
    navigate('/team/', { replace: true });
  }

  return <>
    <PageHeader title="加入队伍" description={preview && `${preview.inviter_name} 邀请你加入 ${preview.team_name}`} />
    <section className="card team-stack team-narrow">
      {!token ? <p>请使用队友发给你的完整邀请链接。</p> : error ? <p role="alert">{error}</p> : !preview ? <p role="status">正在检查邀请…</p> : <>
        <p>邀请有效期至 <DateText value={preview.expires_at} />（北京时间）</p>
        {session?.team ? <><p>你的账号已加入一支队伍。</p><Link to="/team/">查看我的队伍</Link></>
          : session || signedIn ? <button className="pill primary" disabled={busy} onClick={() => void run(async () => { await redeem(); await finish(); })}>接受邀请</button>
          : <>
            <div className="actions"><button className="pill secondary" type="button" aria-pressed={!signup} disabled={busy} onClick={() => setSignup(false)}>使用已有账号</button>
              <button className="pill secondary" type="button" aria-pressed={signup} disabled={busy} onClick={() => setSignup(true)}>注册新账号</button></div>
            <Credentials key={String(signup)} signup={signup} token={token} run={run} busy={busy} success={async (user) => {
              if (user.must_change_password) {
                await refresh();
                navigate('/account/', { replace: true, state: { join: token } });
                return;
              }
              if (!signup) {
                setSignedIn(true);
                const current = await refresh();
                if (current?.team) return;
                await redeem();
              }
              await finish();
            }} />
          </>}
      </>}
    </section>
  </>;
}

export function AccountPage({ session, forced, join, run, busy, refresh }: Actions & { session: Session | null; forced: boolean; join?: string }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  return <>
    <PageHeader title={forced ? '修改临时密码' : '我的账号'} description={forced ? '请先修改临时密码，再继续使用队伍服务。' : session?.user.email} />
    <div className="team-columns">
      {!forced && session && <section className="card team-stack">
        <h2>显示名称</h2>
        <Form busy={busy} submit="保存名称" onSubmit={(data) => void run(async () => {
          setNotice('');
          await patch('/me', { display_name: value(data, 'display_name').trim() });
          await refresh();
          setNotice('显示名称已更新。');
        })}>
          <label>显示名称<input required name="display_name" defaultValue={session.user.display_name} maxLength={100} /></label>
        </Form>
      </section>}
      <section className="card team-stack">
        {!forced && <h2>修改密码</h2>}
        <Form busy={busy} submit="更新密码" onSubmit={(data) => void run(async () => {
          setNotice('');
          await post('/auth/password', { current_password: value(data, 'current_password'), new_password: value(data, 'new_password') });
          await refresh();
          if (forced) navigate(join ? '/join/' + encodeURIComponent(join) : '/team/', { replace: true });
          else setNotice('密码已更新。');
        })}>
          <label>{forced ? '临时密码' : '当前密码'}<input required name="current_password" type="password" autoComplete="current-password" /></label>
          <label>新密码<input required minLength={12} name="new_password" type="password" autoComplete="new-password" /></label>
          <small>新密码至少 12 个字符。</small>
        </Form>
      </section>
    </div>
    {notice && <p className="team-message" role="status">{notice}</p>}
  </>;
}

import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, listPath, patch, post, type AdminUser, type List, type Member, type RegistrationInvite, type Team } from './api';
import { Confirm, Form, InviteList, Secret, value, type Run } from './ui';
import { Members } from './TeamPage';

type Actions = { run: Run; busy: boolean };
type AdminTeam = Team & { members: Member[] };

function useList<T>(path: string) {
  const [page, setPage] = useState<List<T>>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void api<List<T>>(path, { signal: controller.signal }).then(setPage).catch((error) => {
      if (!controller.signal.aborted) setError(errorMessage(error));
    });
    return () => controller.abort();
  }, [path]);

  async function load(cursor: string | null = null) {
    const result = await api<List<T>>(listPath(path, cursor));
    setError('');
    setPage((previous) => cursor && previous ? { ...result, items: [...previous.items, ...result.items] } : result);
  }
  return { page, error, load };
}

function ListStatus<T>({ page, error, load, run, busy }: ReturnType<typeof useList<T>> & Actions) {
  if (error) return <p role="alert">{error}</p>;
  if (!page) return <p role="status">正在加载…</p>;
  if (page.next_cursor) return <button className="pill secondary" disabled={busy} onClick={() => void run(() => load(page.next_cursor))}>加载更多</button>;
  return null;
}

function Codes({ run, busy }: Actions) {
  const list = useList<RegistrationInvite>('/admin/invites');
  const [codes, setCodes] = useState<string[]>();
  return <>
    <section className="card team-stack">
      <h2>创建注册邀请码</h2>
      <Form busy={busy} submit="创建邀请码" onSubmit={(data) => void run(async () => {
        const response = await post<{ items: { invite: RegistrationInvite; code: string }[] }>('/admin/invites', {
          label: value(data, 'label').trim(), count: Number(data.get('count')),
          max_uses: Number(data.get('max_uses')), expires_in_days: Number(data.get('expires_in_days')),
        });
        setCodes(response.items.map(({ code }) => code));
        await list.load();
      })}>
        <label>批次标签<input name="label" maxLength={80} required /></label>
        <label>邀请码数量<input required type="number" name="count" min={1} max={20} defaultValue={1} /></label>
        <label>每个码的使用次数<input required type="number" name="max_uses" min={1} max={50} defaultValue={1} /></label>
        <label>有效天数<input required type="number" name="expires_in_days" min={1} max={60} defaultValue={30} /></label>
      </Form>
    </section>
    <section className="card team-stack">
      <h2>已创建的邀请码</h2>
      {list.page && <InviteList items={list.page.items} busy={busy} title={(invite) => invite.label + ' · 尾号 ' + invite.code_hint}
        revoke={(id) => void run(async () => { await post('/admin/invites/' + encodeURIComponent(id) + '/revoke'); await list.load(); })} />}
      <ListStatus {...list} run={run} busy={busy} />
    </section>
    {codes && <Secret title="注册邀请码" entries={codes} onClose={() => setCodes(undefined)} />}
  </>;
}

function Teams({ run, busy }: Actions) {
  const list = useList<AdminTeam>('/admin/teams');
  return <section className="card team-stack">
    <h2>参赛队伍</h2>
    {list.page?.items.length === 0 && <p>暂无队伍。</p>}
    {list.page?.items.map((team) => <details className="team-detail" key={team.id}><summary>{team.name} <code>{team.slug}</code> · {team.members.length} 人</summary>
      <Members members={team.members} /></details>)}
    <ListStatus {...list} run={run} busy={busy} />
  </section>;
}

function Users({ run, busy, query, self }: Actions & { query: string; self: string }) {
  const list = useList<AdminUser>('/admin/users' + (query ? '?query=' + encodeURIComponent(query) : ''));
  const [password, setPassword] = useState<string>();
  return <section className="card team-stack">
    <h2>账号列表</h2>
    {list.page?.items.length === 0 && <p>暂无匹配账号。</p>}
    {list.page && <ul className="team-list">{list.page.items.map((user) => <li key={user.id}>
      <div><strong>{user.display_name}</strong> <span className="team-chip">{user.role === 'organizer' ? '组委会' : '参赛者'}</span> <span className="team-chip">{user.disabled ? '已停用' : '已启用'}</span>
        <p>{user.email}</p><small>{user.team ? user.team.name + ' · ' + (user.team.role === 'captain' ? '队长' : '队员') : '尚未加入队伍'}</small></div>
      {user.id !== self && <div className="actions">
        <Confirm label={user.disabled ? '启用账号' : '停用账号'} message={`确认${user.disabled ? '启用' : '停用'} ${user.display_name} 的账号？`} busy={busy} onConfirm={() => void run(async () => {
          await patch('/admin/users/' + encodeURIComponent(user.id), { disabled: !user.disabled });
          await list.load();
        })} />
        <Confirm label="重置密码" message={`确认重置 ${user.display_name} 的密码？现有会话将退出登录。`} busy={busy} onConfirm={() => void run(async () => {
          const response = await post<{ temporary_password: string }>('/admin/users/' + encodeURIComponent(user.id) + '/reset-password');
          setPassword(response.temporary_password);
          await list.load();
        })} />
      </div>}
    </li>)}</ul>}
    <ListStatus {...list} run={run} busy={busy} />
    {password && <Secret title="临时密码" entries={[password]} onClose={() => setPassword(undefined)} />}
  </section>;
}

const tabs = ['注册邀请码', '队伍', '账号'] as const;

export default function AdminPage({ run, busy, self }: Actions & { self: string }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('注册邀请码');
  const [query, setQuery] = useState('');
  return <>
    <PageHeader title="组委会管理" description="管理注册邀请码、查看队伍及处理账号。" />
    <div className="actions" aria-label="管理类别" role="group">
      {tabs.map((name) => <button key={name} className={'pill ' + (tab === name ? 'primary' : 'secondary')} aria-pressed={tab === name} disabled={busy} onClick={() => setTab(name)}>{name}</button>)}
    </div>
    {tab === '注册邀请码' && <Codes run={run} busy={busy} />}
    {tab === '队伍' && <Teams run={run} busy={busy} />}
    {tab === '账号' && <>
      <section className="card">
        <Form submit="搜索账号" busy={busy} onSubmit={(data) => setQuery(value(data, 'query').trim())}>
          <label>按邮箱或显示名称搜索<input name="query" type="search" defaultValue={query} /></label>
        </Form>
      </section>
      <Users key={query} run={run} busy={busy} query={query} self={self} />
    </>}
  </>;
}

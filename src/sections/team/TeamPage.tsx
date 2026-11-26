import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, patch, post, type TeamInvite, type Member, type Roster, type Session } from './api';
import { Confirm, DateText, Form, InviteList, Secret, value, type Run } from './ui';

const stageLabels: Record<string, string> = { forming: '组队中', qualified: '已确认参赛', scheduled: '已确认参赛', withdrawn: '已退出' };

export function Members({ members, actions }: { members: Member[]; actions?: (member: Member) => React.ReactNode }) {
  return <ul className="team-list">{members.map((member) => <li key={member.user_id}>
    <div><strong>{member.display_name}</strong> <span className="team-chip">{member.role === 'captain' ? '队长' : '队员'}</span>
      <p>{member.email}</p><small>{member.invited_by && `邀请人：${member.invited_by.display_name} · `}加入于 <DateText value={member.joined_at} /></small></div>
    {actions && <div className="actions">{actions(member)}</div>}
  </li>)}</ul>;
}

function WithoutTeam({ session, run, busy, refresh }: Props) {
  const create = session.can_create_team;
  return <>
    <PageHeader title="我的队伍" description={create ? '你可以创建一支队伍并邀请队友。' : '使用注册邀请码获得创建队伍的资格，或等待队长发送邀请链接。'} />
    <section className="card team-stack team-narrow">
      <h2>{create ? '创建队伍' : '兑换注册邀请码'}</h2>
      {create && !session.user.email_verified ? <p>创建队伍需要先验证邮箱，请联系组委会。</p>
        : create ? <Form submit="创建队伍" busy={busy} onSubmit={(data) => void run(async () => {
          await post('/teams', { name: value(data, 'name').trim(), slug: value(data, 'slug').trim() });
          await refresh();
        })}>
          <label>队名<input required maxLength={100} name="name" /></label>
          <label>队伍标识<input required name="slug" autoCapitalize="none" pattern="[a-z][a-z0-9\x2d]{2,31}" aria-describedby="slug-hint" /></label>
          <small id="slug-hint">3–32 个字符，以小写字母开头，只能使用小写字母、数字和连字符。</small>
        </Form> : <Form submit="兑换邀请码" busy={busy} onSubmit={(data) => void run(async () => {
          await post('/registration-invites/redeem', { invite_code: value(data, 'invite_code').trim() });
          await refresh();
        })}>
          <label>注册邀请码<input required name="invite_code" autoComplete="off" /></label>
        </Form>}
    </section>
  </>;
}

type Props = { session: Session; run: Run; busy: boolean; refresh: () => Promise<Session | null> };

function WithTeam({ session, run, busy, refresh }: Props) {
  const team = session.team!;
  const captain = session.membership?.role === 'captain';
  const verified = session.user.email_verified;
  const frozen = ['phase1', 'phase2', 'finished', 'withdrawn'].includes(team.stage);
  const canEditRoster = verified && !frozen;
  const [roster, setRoster] = useState<Roster>();
  const [error, setError] = useState('');
  const [secret, setSecret] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    void api<Roster>('/team', { signal: controller.signal }).then(setRoster).catch((error) => {
      if (!controller.signal.aborted) setError(errorMessage(error));
    });
    return () => controller.abort();
  }, [team.id, captain]);

  async function update(work: () => Promise<unknown>) {
    await work();
    await refresh();
    setRoster(await api<Roster>('/team'));
    setError('');
  }

  return <>
    <PageHeader title={team.name} description={<><code>{team.slug}</code> <span className="team-chip">{stageLabels[team.stage] ?? '比赛阶段更新中'}</span></>} />
    {!verified && <p className="team-message">邮箱尚未验证。需要验证的操作暂不可用，请联系组委会。</p>}
    {frozen && <p className="team-message">当前阶段的成员名单已锁定，增减成员或退出请联系组委会。</p>}
    {captain && verified && team.status === 'forming' && <section className="card team-stack team-rename">
      <h2>队伍设置</h2>
      <Form submit="保存队名" busy={busy} onSubmit={(data) => void run(() => update(() => patch('/team', { name: value(data, 'name').trim() })))}>
        <label>队名<input required name="name" defaultValue={team.name} maxLength={100} /></label>
      </Form>
    </section>}
    <section className="card team-stack">
      <h2>队伍成员</h2>
      {error ? <p role="alert">{error}</p> : !roster ? <p role="status">正在加载成员…</p> : <Members members={roster.members} actions={(member) => captain && member.role !== 'captain' && <>
        {canEditRoster && <Confirm label="移除成员" message={`确认将 ${member.display_name} 移出队伍？`} busy={busy} onConfirm={() => void run(() => update(() => api('/team/members/' + encodeURIComponent(member.user_id), { method: 'DELETE' })))} />}
        {verified && !['finished', 'withdrawn'].includes(team.stage) && <Confirm label="转让队长" message={`确认将队长转让给 ${member.display_name}？`} busy={busy} onConfirm={() => void run(() => update(() => post('/team/transfer', { user_id: member.user_id })))} />}
      </>} />}
      {captain ? <small>队长须先转让队长身份才能退出队伍。</small> : canEditRoster && <Confirm label="退出队伍" message="确认退出这支队伍？" busy={busy} onConfirm={() => void run(async () => { await post('/team/leave'); await refresh(); })} />}
    </section>
    {captain && <section className="card team-stack">
      <h2>队伍邀请</h2>
      {canEditRoster && <Form submit="创建邀请链接" busy={busy} onSubmit={(data) => void run(() => update(async () => {
        const { url } = await post<{ invite: TeamInvite; token: string; url: string }>('/team/invites', {
          max_uses: Number(data.get('max_uses')), expires_in_days: Number(data.get('expires_in_days')),
        });
        setSecret(url);
      }))}>
        <label>最多使用次数<input type="number" name="max_uses" min={1} max={10} defaultValue={1} required /></label>
        <label>有效天数<input type="number" name="expires_in_days" min={1} max={14} defaultValue={7} required /></label>
      </Form>}
      {roster && <InviteList items={roster.invites ?? []} title={(invite) => <>邀请链接 · 创建于 <DateText value={invite.created_at} /></>} busy={busy || !verified}
        revoke={(id) => void run(() => update(() => post('/team/invites/' + encodeURIComponent(id) + '/revoke')))} />}
    </section>}
    {secret && <Secret title="队伍邀请链接" entries={[secret]} onClose={() => setSecret(undefined)} />}
  </>;
}

export default function TeamPage(props: Props) {
  return props.session.team ? <WithTeam key={props.session.team.id} {...props} /> : <WithoutTeam {...props} />;
}

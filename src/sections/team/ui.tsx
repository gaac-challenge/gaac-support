import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Invite } from './api';

export type Run = (work: () => Promise<void>) => Promise<void>;

export function Form({ children, submit, busy, onSubmit }: {
  children: ReactNode; submit: string; busy: boolean; onSubmit: (values: FormData) => void;
}) {
  function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }
  return <form className="team-form" onSubmit={handle}>
    <fieldset disabled={busy}>{children}<button className="pill primary">{submit}</button></fieldset>
  </form>;
}

export const value = (values: FormData, key: string) => String(values.get(key) ?? '');

export function DateText({ value: date }: { value: string }) {
  return <time dateTime={date}>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(date))}</time>;
}

export function AuthLinks() {
  return <div className="actions"><Link className="pill primary" to="/login/">登录</Link><Link className="pill secondary" to="/signup/">注册</Link></div>;
}

export function Confirm({ label, message, busy, onConfirm }: { label: string; message: string; busy: boolean; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="pill team-quiet" type="button" disabled={busy} onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog className="team-dialog" ref={dialog} aria-label={label}>
      <div className="team-stack">
        <p>{message}</p>
        <div className="actions">
          <button className="pill secondary" type="button" onClick={() => dialog.current?.close()} autoFocus>取消</button>
          <button className="pill primary" type="button" onClick={() => { dialog.current?.close(); onConfirm(); }}>确认{label}</button>
        </div>
      </div>
    </dialog>
  </>;
}

export function Secret({ title, entries, onClose }: { title: string; entries: string[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('已复制');
    } catch {
      setFeedback('复制失败，请手动选中并复制。');
    }
  }
  return <dialog className="team-dialog" ref={dialog} aria-label={title} onCancel={(event) => event.preventDefault()}>
    <div className="team-stack"><h2>{title}</h2><p>以下内容只显示一次，请妥善保存。</p>
      {entries.map((entry) => <div className="team-secret" key={entry}><code>{entry}</code><button className="pill secondary" onClick={() => void copy(entry)}>复制</button></div>)}
      {entries.length > 1 && <button className="pill secondary" onClick={() => void copy(entries.join('\n'))}>复制全部</button>}
      <p role="status">{feedback}</p>
      <button className="pill primary" onClick={onClose} autoFocus>我已保存</button>
    </div>
  </dialog>;
}

export function InviteList<T extends Invite>({ items, busy, title, revoke }: {
  items: T[]; busy: boolean; title: (invite: T) => string; revoke: (id: string) => void;
}) {
  if (!items.length) return <p>暂无邀请。</p>;
  return <ul className="team-list">{items.map((invite) => {
    const status = invite.revoked ? '已撤销' : new Date(invite.expires_at).getTime() <= Date.now()
      ? '已过期' : invite.uses >= invite.max_uses ? '已用完' : '有效';
    return <li key={invite.id}>
      <div><strong>{title(invite)}</strong><p>{invite.uses} / {invite.max_uses} 次 · {status}</p><small>到期 <DateText value={invite.expires_at} /></small></div>
      {status === '有效' && <Confirm label="撤销邀请" message="撤销后，这项邀请无法再使用。" busy={busy} onConfirm={() => revoke(invite.id)} />}
    </li>;
  })}</ul>;
}

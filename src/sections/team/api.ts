export type User = {
  id: string; email: string; display_name: string; role: 'participant' | 'organizer';
  email_verified: boolean; disabled: boolean; must_change_password: boolean;
  language: "zh-CN" | "en"; created_at: string; last_login_at: string | null;
};
export type Team = {
  id: string; name: string; slug: string; stage: string; status: string; stage_stale: boolean;
  letter: string | null; week: number | null; window_start: string | null; window_end: string | null;
  gateway_team: string | null; created_at: string;
};
export type Member = {
  user_id: string; display_name: string; email: string; role: 'captain' | 'member';
  invited_by: { user_id: string; display_name: string } | null; joined_at: string;
};
export type Invite = { id: string; max_uses: number; uses: number; expires_at: string; revoked: boolean; created_at: string; created_by: string };
export type TeamInvite = Invite & { team_id: string };
export type RegistrationInvite = Invite & { label: string; code_hint: string; redeemed_by: string[] };
export type AdminUser = User & { team: { id: string; name: string; role: Member['role'] } | null };
export type Config = { signup_open: boolean; accounts: { email_verification: 'required' | 'off'; password_reset: 'self' | 'organizer' } };
export type Session = { user: User; team: Team | null; membership: Member | null; can_create_team: boolean };
export type Roster = { team: Team; members: Member[]; invites?: TeamInvite[] };
export type Preview = { team_name: string; inviter_name: string; expires_at: string };
export type List<T> = { items: T[]; next_cursor: string | null };

export const passwordRequired = 'gaac:password-change-required';

class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly retryAfter?: number) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: 'POST' | 'PATCH' | 'DELETE'; body?: object; signal?: AbortSignal } = {}): Promise<T> {
  const { method, body, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method) headers['X-Requested-With'] = 'gaac-portal';
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/v1' + path, {
    method, headers, credentials: 'include', cache: 'no-store', signal,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = data?.error;
    const fallback = ({ 401: 'unauthorized', 403: 'forbidden', 404: 'not_found' } as Record<number, string>)[response.status];
    const code = error?.code ?? fallback ?? 'internal_error';
    if (code === 'password_change_required' && !signal?.aborted) window.dispatchEvent(new Event(passwordRequired));
    throw new ApiError(code, error?.message ?? '', error?.retry_after);
  }
  return data as T;
}

export const post = <T,>(path: string, body?: object) => api<T>(path, { method: 'POST', body });
export const patch = <T,>(path: string, body: object) => api<T>(path, { method: 'PATCH', body });
export const errorCode = (error: unknown) => error instanceof ApiError ? error.code : '';

const messages: Record<string, string> = {
  unauthorized: '登录信息无效或已过期，请检查邮箱和密码，或重新登录。',
  forbidden: '当前账号没有权限执行此操作。',
  conflict: '当前状态不允许此操作，请刷新后重试。',
  invite_invalid: '邀请无效、已过期、已撤销或已用完，请联系邀请人。',
  password_change_required: '请先修改临时密码。',
  not_found: '找不到该记录。',
  internal_error: '服务暂时不可用，请稍后重试。',
  invalid_request: '提交的信息有误，请检查后重试。',
  email_not_verified: '请先完成邮箱验证。',
};

export function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return '暂时无法完成操作，请检查网络后重试。';
  if (error.code === 'rate_limited') return error.retryAfter ? `操作过于频繁，请在 ${error.retryAfter} 秒后重试。` : '操作过于频繁，请稍后重试。';
  if (error.code === 'conflict' && error.message === "The team's roster is frozen at its current stage.") return '当前阶段的成员名单已锁定，增减成员或退出请联系组委会。';
  if (error.code === 'conflict' && error.message === 'Transfer the captain role before leaving.') return '队长须先转让队长身份才能退出队伍。';
  const friendly = messages[error.code] ?? messages.internal_error;
  return error.code === 'conflict' && error.message ? friendly + ' ' + error.message : friendly;
}

export function listPath(path: string, cursor: string | null) {
  return cursor ? path + (path.includes('?') ? '&' : '?') + 'cursor=' + encodeURIComponent(cursor) : path;
}

import type { AdminUser, Config, Invite, Member, RegistrationInvite, Team, TeamInvite, User } from './api';

type MockUser = { user: User; password: string; credit: boolean };
type Seat = { team: string; role: Member['role']; inviter: string | null; joined: string };
type TeamLink = { invite: TeamInvite; team: string; creator: string };
export const demoPassword = 'demo-password-2026';

export function createMockFetch({ account, verification = 'off' }: { account?: string; verification?: Config['accounts']['email_verification'] } = {}): typeof fetch {
  const now = () => new Date().toISOString();
  const expiry = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  let sequence = 0;
  const id = (prefix: string) => prefix + '-' + ++sequence;
  const users = new Map<string, MockUser>();
  const seats = new Map<string, Seat>();
  const teams = new Map<string, Team>();
  const codes = new Map<string, RegistrationInvite>();
  const links = new Map<string, TeamLink>();

  function addUser(key: string, email: string, name: string, extra: Partial<User> = {}, password = demoPassword) {
    const user: User = { id: key, email, display_name: name, role: 'participant', email_verified: true, disabled: false, must_change_password: false, language: 'zh-CN', created_at: now(), last_login_at: null, ...extra };
    users.set(key, { user, password, credit: key === 'ready' });
    return user;
  }
  function seat(user: string, team: string, role: Member['role'], inviter: string | null = null) {
    seats.set(user, { team, role, inviter, joined: now() });
  }
  function member(key: string, data: Seat): Member {
    const user = users.get(key)!.user;
    return { user_id: key, display_name: user.display_name, email: user.email, role: data.role, joined_at: data.joined,
      invited_by: data.inviter ? { user_id: data.inviter, display_name: users.get(data.inviter)!.user.display_name } : null };
  }
  function roster(team: string) {
    return [...seats.entries()].filter(([, item]) => item.team === team).map(([key, data]) => member(key, data));
  }
  function newInvite(prefix: string, max_uses: number, days: number, created_by: string): Invite {
    return { id: id(prefix), max_uses, uses: 0, expires_at: expiry(days), revoked: false, created_at: now(), created_by };
  }
  function newTeam(id: string, name: string, slug: string): Team {
    return { id, name, slug, status: 'forming', stage: 'forming', stage_stale: false,
      letter: null, week: null, window_start: null, window_end: null, gateway_team: null, created_at: now() };
  }

  addUser('captain', 'captain@example.test', '林晓');
  addUser('member', 'member@example.test', '周远');
  addUser('member-two', 'chen@example.test', '陈宁');
  addUser('ready', 'ready@example.test', '赵晴');
  addUser('solo', 'solo@example.test', '杨帆');
  addUser('organizer', 'organizer@example.test', '组委会测试账号', { role: 'organizer' });
  addUser('temporary', 'temporary@example.test', '临时密码用户', { must_change_password: true });
  teams.set('team-aurora', newTeam('team-aurora', '极光实验室', 'aurora-lab'));
  seat('captain', 'team-aurora', 'captain');
  seat('member', 'team-aurora', 'member', 'captain');
  seat('member-two', 'team-aurora', 'member', 'captain');
  links.set('demo-join', { team: 'team-aurora', creator: 'captain', invite: { ...newInvite('link', 5, 7, 'captain'), team_id: 'team-aurora' } });
  codes.set('DEMO-CAPTAIN', { ...newInvite('registration', 5, 30, 'organizer'), label: '测试队长批次', code_hint: 'TAIN', redeemed_by: [] });
  let signedIn = account;

  const ok = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'X-Request-Id': 'mock' } });
  const fail = (code: string, status: number, message = '') => ok({ error: { code, message, retryable: false, retry_after: null }, request_id: 'mock' }, status);
  const empty = () => new Response(null, { status: 204, headers: { 'X-Request-Id': 'mock' } });
  const invalid = () => fail('invalid_request', 400);
  const forbidden = () => fail('forbidden', 403);
  const conflict = (message: string) => fail('conflict', 409, message);
  const notFound = () => fail('not_found', 404);
  const badInvite = () => fail('invite_invalid', 400);
  const active = (invite?: Invite) => invite && !invite.revoked && invite.uses < invite.max_uses && Date.parse(invite.expires_at) > Date.now();
  const validCount = (n: number, max: number) => Number.isInteger(n) && n >= 1 && n <= max;

  return async (input, init) => {
    const url = new URL(String(input), window.location.origin);
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init?.method ?? 'GET';
    const key = method + ' ' + path;
    if (method !== 'GET' && new Headers(init?.headers).get('X-Requested-With') !== 'gaac-portal') return forbidden();
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
    const current = signedIn ? users.get(signedIn) : undefined;
    const preview = path.match(/^\/team-invites\/([^/]+)\/preview$/);

    if (key === 'GET /public/config') return ok({
      contest: { name: 'GAAC', official_url: 'https://gaac.gosim.org/' },
      signup_open: false, terms_version: 'mock', languages: ['zh-CN', 'en'],
      search: { api_base: '', mcp_url: '', guide_url: '' },
      accounts: { email_verification: verification, password_reset: 'organizer' },
    });
    if (method === 'GET' && preview) {
      const link = links.get(decodeURIComponent(preview[1]));
      if (!link || !active(link.invite)) return badInvite();
      return ok({ team_name: teams.get(link.team)!.name, inviter_name: users.get(link.creator)!.user.display_name, expires_at: link.invite.expires_at });
    }
    if (key === 'POST /auth/login') {
      const match = [...users.values()].find(({ user, password }) => user.email === body.email?.toLowerCase() && password === body.password && !user.disabled);
      if (!match) return fail('unauthorized', 401);
      match.user.last_login_at = now();
      signedIn = match.user.id;
      return ok({ user: match.user });
    }
    if (key === 'POST /auth/signup') {
      const code = codes.get(body.invite_code);
      const link = links.get(body.team_token);
      if (Boolean(body.invite_code) === Boolean(body.team_token) || (!active(code) && !active(link?.invite))) return badInvite();
      if (!body.email || !body.display_name?.trim() || body.password?.length < 12 || !body.password) return invalid();
      if ([...users.values()].some(({ user }) => user.email === body.email.toLowerCase())) return conflict('该邮箱已注册。');
      const user = addUser(id('user'), body.email.toLowerCase(), body.display_name, { email_verified: verification === 'off', last_login_at: now() }, body.password);
      signedIn = user.id;
      if (code) { code.uses++; code.redeemed_by.push(user.id); users.get(user.id)!.credit = true; }
      if (link) { link.invite.uses++; seat(user.id, link.team, 'member', link.creator); }
      return ok({ user }, 201);
    }
    if (!current || current.user.disabled) return fail('unauthorized', 401);
    const user = current.user;
    const membership = seats.get(user.id);
    const team = membership && teams.get(membership.team)!;
    const captain = membership?.role === 'captain';

    if (key === 'GET /me') return ok({ user, team: team ?? null, membership: membership ? member(user.id, membership) : null, can_create_team: !team && current.credit });
    if (key === 'POST /auth/logout') { signedIn = undefined; return empty(); }
    if (key === 'POST /auth/password') {
      if (current.password !== body.current_password || !body.new_password || body.new_password.length < 12) return invalid();
      current.password = body.new_password;
      user.must_change_password = false;
      return empty();
    }
    if (user.must_change_password) return fail('password_change_required', 403);
    if (key === 'PATCH /me') {
      if (!body.display_name?.trim()) return invalid();
      user.display_name = body.display_name;
      return ok(user);
    }
    if (key === 'POST /registration-invites/redeem') {
      const code = codes.get(body.invite_code);
      if (team || current.credit) return conflict('该账号已有队伍或创建资格。');
      if (!code || !active(code) || code.redeemed_by.includes(user.id)) return badInvite();
      current.credit = true;
      code.uses++;
      code.redeemed_by.push(user.id);
      return ok({ user });
    }
    if (key === 'POST /team-invites/redeem') {
      const link = links.get(body.team_token);
      if (team) return conflict('该账号已加入一支队伍。');
      if (!link || !active(link.invite)) return badInvite();
      link.invite.uses++;
      seat(user.id, link.team, 'member', link.creator);
      return ok({ team: teams.get(link.team) });
    }
    if (key === 'POST /teams') {
      if (!user.email_verified) return fail('email_not_verified', 403);
      if (team) return conflict('该账号已加入一支队伍。');
      if (!current.credit) return forbidden();
      if (!/^[a-z][a-z0-9-]{2,31}$/.test(body.slug) || !body.name?.trim()) return invalid();
      if ([...teams.values()].some((team) => team.slug === body.slug)) return conflict('队伍标识已被使用。');
      const created = newTeam(id('team'), body.name, body.slug);
      teams.set(created.id, created);
      seat(user.id, created.id, 'captain');
      current.credit = false;
      return ok(created, 201);
    }
    if (path === '/team' || path.startsWith('/team/')) {
      if (!team) return notFound();
      const invites = [...links.values()].filter((link) => link.team === team.id).map(({ invite }) => invite);
      if (key === 'GET /team') return ok({ team, members: roster(team.id), ...(captain ? { invites } : {}) });
      if (!user.email_verified) return fail('email_not_verified', 403);
      if (key === 'POST /team/leave') {
        if (captain) return conflict('队长须先转让队长身份。');
        seats.delete(user.id);
        return empty();
      }
      if (!captain) return forbidden();
      if (key === 'PATCH /team') {
        if (!body.name?.trim()) return invalid();
        team.name = body.name;
        return ok(team);
      }
      if (key === 'POST /team/invites') {
        const uses = body.max_uses ?? 5;
        const days = body.expires_in_days ?? 7;
        if (!validCount(uses, 10) || !validCount(days, 14)) return invalid();
        const invite = { ...newInvite('link', uses, days, user.id), team_id: team.id };
        const token = id('demo-join');
        links.set(token, { invite, creator: user.id, team: team.id });
        return ok({ invite, token, url: url.origin + import.meta.env.BASE_URL + 'join/' + token }, 201);
      }
      const revoke = path.match(/^\/team\/invites\/([^/]+)\/revoke$/);
      if (method === 'POST' && revoke) {
        const invite = invites.find(({ id }) => id === revoke[1]);
        if (!invite) return notFound();
        invite.revoked = true;
        return ok(invite);
      }
      const remove = path.match(/^\/team\/members\/([^/]+)$/);
      const target = key === 'POST /team/transfer' ? body.user_id : method === 'DELETE' ? remove?.[1] : null;
      if (target) {
        const other = seats.get(target);
        if (!other || other.team !== team.id) return notFound();
        if (other.role === 'captain') return conflict('请选择其他队员。');
        if (remove) { seats.delete(target); return empty(); }
        other.role = 'captain';
        membership!.role = 'member';
        return ok(team);
      }
    }

    if (!path.startsWith('/admin/')) return notFound();
    if (user.role !== 'organizer') return forbidden();
    function list<T>(items: T[]) {
      const start = Number(url.searchParams.get('cursor') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 50);
      return ok({ items: items.slice(start, start + limit), next_cursor: start + limit < items.length ? String(start + limit) : null });
    }
    function adminUser(user: User): AdminUser {
      const seat = seats.get(user.id);
      const team = seat && teams.get(seat.team)!;
      return { ...user, team: team && seat ? { id: team.id, name: team.name, role: seat.role } : null };
    }
    if (key === 'GET /admin/invites') return list([...codes.values()].reverse());
    if (key === 'POST /admin/invites') {
      const uses = body.max_uses ?? 1, days = body.expires_in_days ?? 30;
      if (!body.label?.trim() || body.label.length > 80 || !validCount(body.count, 20) || !validCount(uses, 50) || !validCount(days, 60)) return invalid();
      return ok({ items: Array.from({ length: body.count }, () => {
        const code = id('MOCK-CODE');
        const invite = { ...newInvite('registration', uses, days, user.id), label: body.label, code_hint: code.slice(-4), redeemed_by: [] };
        codes.set(code, invite);
        return { invite, code };
      }) }, 201);
    }
    const revoke = path.match(/^\/admin\/invites\/([^/]+)\/revoke$/);
    if (method === 'POST' && revoke) {
      const invite = [...codes.values()].find(({ id }) => id === revoke[1]);
      if (!invite) return notFound();
      invite.revoked = true;
      return ok(invite);
    }
    if (key === 'GET /admin/teams') return list([...teams.values()].map((team) => ({ ...team, members: roster(team.id), resources: [], active_keys: 0, note: null })));
    if (key === 'GET /admin/users') {
      const query = (url.searchParams.get('query') ?? '').toLowerCase();
      return list([...users.values()].map(({ user }) => adminUser(user)).filter(({ email, display_name }) => (email + '\n' + display_name).toLowerCase().includes(query)));
    }
    const target = path.match(/^\/admin\/users\/([^/]+)(\/reset-password)?$/);
    if (target) {
      const record = users.get(target[1]);
      if (!record) return notFound();
      if (method === 'PATCH' && !target[2]) {
        if (record.user.id === user.id && body.disabled) return conflict('不能停用自己的账号。');
        record.user.disabled = body.disabled;
        return ok(adminUser(record.user));
      }
      if (method === 'POST' && target[2]) {
        record.password = 'mock-temporary-' + id('password');
        record.user.must_change_password = true;
        return ok({ temporary_password: record.password });
      }
    }
    return notFound();
  };
}

export function installMock() {
  const mock = createMockFetch();
  const original = window.fetch.bind(window);
  window.fetch = (resource, options) => String(resource).startsWith('/api/v1/') ? mock(resource, options) : original(resource, options);
}

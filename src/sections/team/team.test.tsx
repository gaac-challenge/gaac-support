// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { createMockFetch, demoPassword } from './mock';

const wait = { timeout: 3000 };

beforeAll(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    value: function (this: HTMLDialogElement) { this.open = true; },
    configurable: true,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    value: function (this: HTMLDialogElement) { this.open = false; },
    configurable: true,
  });
  await import('./TeamArea');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function CurrentPath() {
  return <span data-testid="current-path" hidden>{useLocation().pathname}</span>;
}

function show(path: string, account?: string, override?: (path: string) => Response | undefined) {
  const mock = createMockFetch({ account });
  const fetch = vi.fn<typeof window.fetch>((input, options) => {
    const response = override?.(String(input));
    return response ? Promise.resolve(response) : mock(input, options);
  });
  vi.stubGlobal('fetch', fetch);
  render(<MemoryRouter initialEntries={[path]}><App /><CurrentPath /></MemoryRouter>);
  return fetch;
}

const main = () => within(screen.getByRole('main'));
const fill = (label: string, value: string) => fireEvent.change(main().getByLabelText(label, { exact: true }), { target: { value } });
async function click(name: string, root = main()) {
  fireEvent.click(await root.findByRole('button', { name }, wait));
}
async function confirm(name: string, root = main()) {
  await click(name, root);
  await click('确认' + name, within(await main().findByRole('dialog', { name }, wait)));
}
const heading = (name: string) => main().findByRole('heading', { name }, wait);

it('offers an inline login and captain registration on the signed-out team page', async () => {
  show('/team/');
  expect(await heading('我的队伍')).toBeVisible();
  const login = within(main().getByRole('region', { name: '登录' }));
  expect(login.getByLabelText('邮箱')).toBeVisible();
  expect(login.getByLabelText('密码')).toHaveAttribute('type', 'password');
  expect(login.getByRole('button', { name: '登录' })).toBeVisible();
  expect(main().getByRole('link', { name: '用邀请码注册' })).toHaveAttribute('href', '/signup/');
});

it.each([
  ['/team/', 'captain', '极光实验室'],
  ['/admin/', 'organizer', '创建注册邀请码'],
  ['/account/', 'captain', '修改密码'],
])('preserves %s after inline login', async (path, account, signedInHeading) => {
  show(path);
  await main().findByRole('region', { name: '登录' }, wait);
  fill('邮箱', account + '@example.test');
  fill('密码', demoPassword);
  await click('登录');
  expect(await heading(signedInHeading)).toBeVisible();
  expect(screen.getByTestId('current-path').textContent).toBe(path);
});

it('redeems a registration code at sign-up and creates a team', async () => {
  const fetch = show('/signup/');
  await heading('注册');
  fill('邮箱', 'new-captain@example.test');
  fill('显示名称', '方青');
  fill('注册邀请码', 'DEMO-CAPTAIN');
  fill('密码', demoPassword);
  await click('注册');
  await heading('创建队伍');
  fill('队名', '青山实验室');
  fill('队伍标识', 'green-hill');
  await click('创建队伍');
  expect(await heading('青山实验室')).toBeVisible();
  expect(await main().findByText('方青', {}, wait)).toBeVisible();
  const signup = fetch.mock.calls.find(([url]) => url === '/api/v1/auth/signup')?.[1];
  expect(signup).toMatchObject({ credentials: 'include', cache: 'no-store', headers: { 'X-Requested-With': 'gaac-portal' } });
  expect(JSON.parse(String(signup?.body))).toEqual({ email: 'new-captain@example.test', password: demoPassword, display_name: '方青', invite_code: 'DEMO-CAPTAIN' });
});

it('shows a captain’s generated invite once and keeps the count in the list', async () => {
  show('/team/', 'captain');
  await click('创建邀请链接');
  const dialog = within(await main().findByRole('dialog', { name: '队伍邀请链接' }, wait));
  expect(dialog.getByText(/\/join\/demo-join-/)).toBeVisible();
  await click('我已保存', dialog);
  expect(main().queryByText(/\/join\/demo-join-/)).toBeNull();
  expect(await main().findByText('0 / 1 次 · 有效', {}, wait)).toBeVisible();
  expect(main().getAllByText('邀请链接 · 创建于')).toHaveLength(2);
  expect(main().queryByText(/队伍邀请 · link-|邀请人：—/)).toBeNull();
});

it('logs in from an invite link and redeems it', async () => {
  show('/join/demo-join');
  expect(await main().findByText('林晓 邀请你加入 极光实验室', {}, wait)).toBeVisible();
  fill('邮箱', 'solo@example.test');
  fill('密码', demoPassword);
  await click('登录');
  expect(await heading('极光实验室')).toBeVisible();
  expect(await main().findByText('杨帆', {}, wait)).toBeVisible();
  expect(main().getAllByText(/邀请人：林晓/)).toHaveLength(3);
});

it('adds a new member at sign-up from a team link', async () => {
  const fetch = show('/join/demo-join');
  const login = await main().findByRole('button', { name: '使用已有账号', pressed: true }, wait);
  expect(login).toHaveClass('primary');
  await click('注册新账号');
  expect(main().getByRole('button', { name: '注册新账号', pressed: true })).toHaveClass('primary');
  expect(login).toHaveAttribute('aria-pressed', 'false');
  fill('邮箱', 'recruit@example.test');
  fill('显示名称', '何星');
  fill('密码', demoPassword);
  await click('注册');
  expect(await heading('极光实验室')).toBeVisible();
  expect(await main().findByText('何星', {}, wait)).toBeVisible();
  expect(fetch.mock.calls.some(([url]) => url === '/api/v1/team-invites/redeem')).toBe(false);
});

it('removes a member only after captain confirmation', async () => {
  show('/team/', 'captain');
  const member = await main().findByText('周远', {}, wait);
  await confirm('移除成员', within(member.closest('li')!));
  await waitFor(() => expect(main().queryByText('周远')).toBeNull(), wait);
});

it('transfers the captain role and then allows the former captain to leave', async () => {
  show('/team/', 'captain');
  const member = await main().findByText('周远', {}, wait);
  expect(main().queryByRole('button', { name: '退出队伍' })).toBeNull();
  await confirm('转让队长', within(member.closest('li')!));
  await waitFor(() => expect(within(main().getByText('周远').closest('li')!).getByText('队长')).toBeVisible(), wait);
  await confirm('退出队伍');
  expect(await heading('兑换注册邀请码')).toBeVisible();
});

it('lets an organizer create and save a batch of one-time codes', async () => {
  const fetch = show('/admin/', 'organizer');
  await heading('创建注册邀请码');
  fill('批次标签', '公开演示');
  fill('邀请码数量', '2');
  await click('创建邀请码');
  const dialog = within(await main().findByRole('dialog', { name: '注册邀请码' }, wait));
  expect(dialog.getAllByText(/^MOCK-CODE-/)).toHaveLength(2);
  await click('我已保存', dialog);
  expect(main().queryAllByText(/^MOCK-CODE-/)).toHaveLength(0);
  expect(await main().findAllByText(/^公开演示 · 尾号/, {}, wait)).toHaveLength(2);
  expect(fetch.mock.calls.some(([url]) => url === '/api/v1/admin/invites')).toBe(true);
});

it('forces a password update when the API returns password_change_required', async () => {
  show('/team/', 'solo', (url) => url === '/api/v1/me'
    ? Response.json({ error: { code: 'password_change_required', message: 'Change password' } }, { status: 403 })
    : undefined);
  expect(await heading('修改临时密码')).toBeVisible();
  expect(main().getByLabelText('临时密码')).toBeVisible();
  expect(main().getByLabelText('新密码')).toBeVisible();
});

it('completes the forced change flow after sign-in', async () => {
  show('/login/');
  await main().findByRole('heading', { name: '登录', level: 1 }, wait);
  fill('邮箱', 'temporary@example.test');
  fill('密码', demoPassword);
  await click('登录');
  await heading('修改临时密码');
  fill('临时密码', demoPassword);
  fill('新密码', 'modified-password-2026');
  await click('更新密码');
  expect(await heading('兑换注册邀请码')).toBeVisible();
});

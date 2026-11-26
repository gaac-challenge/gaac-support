import type { Section } from '../types';

export const team: Section = {
  group: 'secondary',
  navigation: [],
  routes: [
    { path: '/team', label: '我的队伍' },
    { path: '/login', label: '登录' },
    { path: '/signup', label: '注册' },
    { path: '/join/*', label: '加入队伍' },
    { path: '/account', label: '我的账号' },
    { path: '/admin', label: '组委会管理' },
    { path: '/desk', label: '我的队伍' },
  ].map((route) => ({ ...route, load: () => import('./TeamArea') })),
};

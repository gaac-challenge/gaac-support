import type { Section } from '../types';

export const sandbox: Section = {
  group: 'secondary',
  routes: [
    { path: '/sandbox', label: '赛程沙盘', load: () => import('./SandboxPage') },
  ],
  navigation: ['/sandbox'],
};

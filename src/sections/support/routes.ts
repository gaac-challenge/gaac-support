import type { Section } from '../types';

export const support: Section = {
  group: 'support',
  routes: [
    { path: '/', label: 'GAAC 技术支持', load: () => import('./SupportPage') },
    { path: '/tasks', label: '比赛任务', load: () => import('./SupportPage') },
    { path: '/model', label: '统一模型', load: () => import('./SupportPage') },
    { path: '/search', label: '搜索服务', load: () => import('./SupportPage') },
    { path: '/data', label: '数据集', load: () => import('./SupportPage') },
    { path: '/tools', label: '工具应用', load: () => import('./SupportPage') },
    { path: '/eval', label: '测评服务', load: () => import('./SupportPage') },
    { path: '/notices', label: '公告与答疑', load: () => import('./SupportPage') },
    { path: '/status', label: '运行状态', load: () => import('./SupportPage') },
    { path: '/desk', label: '本队任务台', load: () => import('./SupportPage') },
  ],
  navigation: ['/tasks', '/model', '/search', '/data', '/tools', '/eval', '/notices', '/status'],
};

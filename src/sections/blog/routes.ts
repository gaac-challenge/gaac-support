import type { Section } from '../types';

export const blog: Section = {
  group: 'reading',
  routes: [
    { path: '/blog', label: '动手笔记', load: () => import('./BlogPage') },
    { path: '/blog/:slug', label: '动手笔记', load: () => import('./BlogPage') },
  ],
  navigation: ['/blog'],
};

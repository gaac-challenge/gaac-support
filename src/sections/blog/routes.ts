import type { Section } from '../types';

export const blog: Section = {
  group: 'reading',
  routes: [
    { path: '/blog', label: '动手笔记', legacy: 'legacy/blog/' },
    { path: '/blog/:slug', label: '动手笔记', legacy: 'legacy/blog/' },
  ],
  navigation: ['/blog'],
};

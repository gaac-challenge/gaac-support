import type { Section } from '../types';

export const comic: Section = {
  group: 'reading',
  routes: [
    { path: '/comic', label: '科学连环画', load: () => import('./ComicPage') },
    { path: '/comic/:volume', label: '科学连环画', load: () => import('./ComicPage') },
  ],
  navigation: ['/comic'],
};

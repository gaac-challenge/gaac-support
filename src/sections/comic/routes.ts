import type { Section } from '../types';

export const comic: Section = {
  group: 'reading',
  routes: [
    { path: '/comic', label: '科学连环画', legacy: 'legacy/comic/' },
    { path: '/comic/:volume', label: '科学连环画', legacy: 'legacy/comic/' },
  ],
  navigation: ['/comic'],
};

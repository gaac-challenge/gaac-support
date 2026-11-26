import type { Section } from '../types';

export const sandbox: Section = {
  group: 'secondary',
  routes: [
    { path: '/sandbox', label: '推演', legacy: 'legacy/sandbox/' },
  ],
  navigation: ['/sandbox'],
};

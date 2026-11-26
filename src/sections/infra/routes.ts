import type { Section } from '../types';

export const infra: Section = {
  group: 'reading',
  routes: [
    { path: '/infra', label: '推理基础设施', legacy: 'legacy/infra/' },
    { path: '/infra/:slug', label: '推理基础设施', legacy: 'legacy/infra/' },
  ],
  navigation: ['/infra'],
};

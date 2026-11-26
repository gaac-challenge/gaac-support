import type { Section } from '../types';

export const prep: Section = {
  group: 'reading',
  routes: [
    { path: '/prep', label: 'DeepSeek 推理读本', legacy: 'legacy/prep/' },
    { path: '/prep/:slug', label: 'DeepSeek 推理读本', legacy: 'legacy/prep/' },
  ],
  navigation: ['/prep'],
};

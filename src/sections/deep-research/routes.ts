import type { Section } from '../types';

export const deepResearch: Section = {
  group: 'reading',
  routes: [
    { path: '/bench/deep-research', label: '深度研究评测', legacy: 'legacy/agent-bench/deep-research/site/' },
    { path: '/bench/deep-research/*', label: '深度研究评测', legacy: 'legacy/agent-bench/deep-research/site/' },
  ],
  navigation: ['/bench/deep-research'],
};

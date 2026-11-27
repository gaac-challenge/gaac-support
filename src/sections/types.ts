import type { ComponentType } from 'react';

export interface SiteRoute {
  path: string;
  label: string;
  load?: () => Promise<{ default: ComponentType }>;
  legacy?: string;
}

export interface Section {
  group: 'support' | 'secondary';
  routes: readonly SiteRoute[];
  navigation: readonly string[];
}

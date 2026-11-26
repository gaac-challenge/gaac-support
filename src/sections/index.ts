import { support } from './support/routes';
import { sandbox } from './sandbox/routes';
import { infra } from './infra/routes';
import { prep } from './prep/routes';
import { deepResearch } from './deep-research/routes';
import { blog } from './blog/routes';

export const sections = [support, infra, prep, deepResearch, blog, sandbox];
export const routes = sections.flatMap((section) => section.routes);

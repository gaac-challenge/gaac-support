import { support } from './support/routes';
import { sandbox } from './sandbox/routes';
import { blog } from './blog/routes';

import { team } from './team/routes';

export const sections = [support, blog, sandbox, team];
export const routes = sections.flatMap((section) => section.routes);

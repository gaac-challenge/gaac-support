import { support } from './support/routes';
import { sandbox } from './sandbox/routes';
import { blog } from './blog/routes';

export const sections = [support, blog, sandbox];
export const routes = sections.flatMap((section) => section.routes);

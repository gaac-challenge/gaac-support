import { support } from './support/routes';
import { sandbox } from './sandbox/routes';
import { team } from './team/routes';

export const sections = [support, sandbox, team];
export const routes = sections.flatMap((section) => section.routes);

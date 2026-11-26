import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions, children, id = 'page-title' }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; id?: string;
}) {
  return <section className="card page-heading" aria-labelledby={id}>
    <div className="page-heading-main">
      <div><h1 id={id}>{title}</h1>{description && <div className="page-heading-lead">{description}</div>}</div>
      {actions && <div className="actions">{actions}</div>}
    </div>
    {children}
  </section>;
}

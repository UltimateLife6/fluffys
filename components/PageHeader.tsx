'use client';

import type { ReactNode } from 'react';

type PageHeaderProps = {
  kicker: string;
  title: string;
  children?: ReactNode;
};

export default function PageHeader({ kicker, title, children }: PageHeaderProps) {
  return (
    <section className="page-hero">
      <div className="shell">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {children ? <div className="page-hero-text">{children}</div> : null}
      </div>
    </section>
  );
}

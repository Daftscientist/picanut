import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header-canopy">
      <div>
        <p className="canopy-label">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-header-canopy__actions">{actions}</div> : null}
    </header>
  );
}

type SectionCardProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SectionCard({ title, eyebrow, description, aside, className = '', children }: SectionCardProps) {
  return (
    <section className={`canopy-panel canopy-section ${className}`.trim()}>
      {(title || eyebrow || description || aside) && (
        <div className="canopy-section__head">
          <div>
            {eyebrow ? <p className="canopy-label">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {aside ? <div>{aside}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  icon?: ReactNode;
  accent?: 'green' | 'gold' | 'slate' | 'red';
};

export function MetricCard({ label, value, detail, icon, accent = 'green' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <p className="canopy-label">{label}</p>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state-canopy">
      <div className="empty-state-canopy__icon">
        <AlertCircle size={20} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

type StatusBadgeProps = {
  tone?: 'green' | 'gold' | 'slate' | 'red';
  children: ReactNode;
};

export function StatusBadge({ tone = 'slate', children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

import { type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}
export function Card({ title, description, action, children, className = '', ...props }: CardProps) {
  return <section {...props} className={`ui-card ${className}`.trim()}>
    {(title || description || action) && <div className="ui-card__heading">
      <div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}
    </div>}
    {children}
  </section>;
}

export interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  foot?: string;
  sample?: boolean;
  className?: string;
}
export function MetricCard({ label, value, icon: Icon, delta, foot, sample = false, className = '' }: MetricCardProps) {
  return <div className={`ui-metric ${className}`.trim()}>
    <div className="ui-metric__heading"><span>{label}</span><span className="ui-metric__icon"><Icon size={18} aria-hidden="true" /></span></div>
    <div className="ui-metric__value">{value}</div>
    <div className="ui-metric__foot">
      {delta && <span className="ui-metric__delta"><ArrowUpRight size={14} aria-hidden="true" />{delta}</span>}
      <span>{foot || (sample ? 'Illustrative metric' : 'Current period')}</span>
    </div>
    {sample && <span className="ui-metric__source">Sample data</span>}
  </div>;
}

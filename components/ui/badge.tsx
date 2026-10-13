import type { HTMLAttributes } from 'react';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'purple' | 'info';
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { tone?: BadgeTone; dot?: boolean; }

export function Badge({ tone = 'neutral', dot = false, className = '', children, ...props }: BadgeProps) {
  return <span {...props} className={`ui-badge ui-badge--${tone} ${className}`.trim()}>
    {dot && <span className="ui-badge__dot" aria-hidden="true" />}
    {children}
  </span>;
}

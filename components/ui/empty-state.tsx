import { FileSearch, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}
export function EmptyState({ title, description, icon: Icon = FileSearch, action, compact = false }: EmptyStateProps) {
  return <div className={`ui-empty ${compact ? 'ui-empty--compact' : ''}`}>
    <div className="ui-empty__icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && <div className="ui-empty__action">{action}</div>}
  </div>;
}

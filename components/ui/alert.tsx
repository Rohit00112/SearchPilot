import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { HTMLAttributes } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
  onDismiss?: () => void;
}
const icons = { info: Info, success: CheckCircle2, warning: TriangleAlert, error: AlertCircle };

export function Alert({ tone = 'info', title, onDismiss, children, className = '', ...props }: AlertProps) {
  const Icon = icons[tone];
  return <div {...props} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}
    className={`ui-alert ui-alert--${tone} ${className}`.trim()}>
    <Icon size={18} aria-hidden="true" />
    <div className="ui-alert__body">{title && <strong>{title}</strong>}{children}</div>
    {onDismiss && <button type="button" className="ui-alert__dismiss" aria-label="Dismiss notification" onClick={onDismiss}><X size={16} /></button>}
  </div>;
}

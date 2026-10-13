import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary', size = 'md', loading = false, leadingIcon, disabled, children, className = '', type = 'button', ...props
}, ref) {
  return <button
    {...props}
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
  >
    {loading ? <LoaderCircle size={16} className="ui-spin" aria-hidden="true" /> : leadingIcon}
    {children}
  </button>;
});

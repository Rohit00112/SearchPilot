import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({
  label, hint, error, containerClassName = '', className = '', id, required, ...props
}, ref) {
  const generated = useId();
  const inputId = id || generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return <div className={`ui-field ${containerClassName}`.trim()}>
    <label htmlFor={inputId} className="ui-field__label">{label}{required && <span className="ui-field__required" aria-label="required"> *</span>}</label>
    <input {...props} ref={ref} id={inputId} required={required}
      className={`ui-input ${error ? 'ui-input--error' : ''} ${className}`.trim()}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={[hintId,errorId].filter(Boolean).join(' ') || undefined}
    />
    {hint && <p className="ui-field__hint" id={hintId}>{hint}</p>}
    {error && <p className="ui-field__error" id={errorId}>{error}</p>}
  </div>;
});

'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  className?: string;
}
export function Dialog({ open, onClose, labelledBy, describedBy, children, className = '' }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = panel.current;
    const first = root?.querySelector<HTMLElement>('[autofocus], input:not([disabled]), button:not([disabled]), [tabindex="0"]');
    (first || root)?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !root) return;
      const controls = Array.from(root.querySelectorAll<HTMLElement>(focusable)).filter(el => el.getClientRects().length > 0);
      if (controls.length === 0) { event.preventDefault(); root.focus(); return; }
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === firstControl || document.activeElement === root)) {
        event.preventDefault(); lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault(); firstControl.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className={`ui-dialog__backdrop ${className}`.trim()} onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="ui-dialog__surface" ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
      aria-describedby={describedBy} tabIndex={-1}>
      {children}
    </div>
  </div>;
}

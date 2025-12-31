import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

/**
 * Toaster component with WCAG 2.1 compliant aria-live regions
 * - Uses role="status" for success/info toasts (polite announcements)
 * - Uses role="alert" for error/destructive toasts (assertive announcements)
 */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Destructive toasts use assertive announcements for immediate attention
        const isDestructive = variant === 'destructive';
        const ariaLive = isDestructive ? 'assertive' : 'polite';
        const role = isDestructive ? 'alert' : 'status';
        
        return (
          <Toast 
            key={id} 
            variant={variant}
            role={role}
            aria-live={ariaLive}
            aria-atomic="true"
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose aria-label="Close notification" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

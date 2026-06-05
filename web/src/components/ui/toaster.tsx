'use client';

import { useToast } from '@/lib/hooks/use-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed z-[100] flex flex-col gap-2 bottom-0 left-0 right-0 p-4 sm:bottom-4 sm:right-4 sm:left-auto sm:p-0 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-white',
            toast.variant === 'destructive' && 'border-red-200 bg-red-50',
            toast.variant === 'success' && 'border-green-200 bg-green-50',
          )}
        >
          <div className="flex-1">
            {toast.title && (
              <p className={cn('text-sm font-semibold', toast.variant === 'destructive' ? 'text-red-800' : 'text-gray-900')}>
                {toast.title}
              </p>
            )}
            {toast.description && (
              <p className={cn('text-sm mt-0.5', toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-600')}>
                {toast.description}
              </p>
            )}
          </div>
          <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

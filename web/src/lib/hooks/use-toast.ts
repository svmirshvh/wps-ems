import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

let toastState: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notify() {
  listeners.forEach((l) => l([...toastState]));
}

export function toast({ title, description, variant = 'default', duration = 4000 }: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  toastState = [...toastState, { id, title, description, variant }];
  notify();
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id);
    notify();
  }, duration);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState);

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, []);

  useState(() => {
    const unsub = subscribe(setToasts);
    return unsub;
  });

  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      toastState = toastState.filter((t) => t.id !== id);
      notify();
    },
  };
}

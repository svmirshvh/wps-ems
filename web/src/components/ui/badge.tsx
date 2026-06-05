import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        draft: 'bg-gray-100 text-gray-700',
        submitted: 'bg-blue-100 text-blue-700',
        manager_approved: 'bg-lime-100 text-lime-700',
        finance_approved: 'bg-green-100 text-green-700',
        paid: 'bg-emerald-100 text-emerald-800',
        rejected: 'bg-red-100 text-red-700',
        outline: 'border border-current bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

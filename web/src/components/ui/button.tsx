import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-wurth-red text-white hover:bg-red-800',
        secondary: 'bg-wurth-darkgrey text-white hover:bg-gray-700',
        outline: 'border border-wurth-lightgrey bg-white text-wurth-darkgrey hover:bg-gray-50',
        ghost: 'hover:bg-gray-100 text-wurth-darkgrey',
        link: 'text-wurth-red underline-offset-4 hover:underline',
        success: 'bg-wurth-green text-white hover:bg-green-700',
        info: 'bg-wurth-cyan text-white hover:bg-cyan-700',
        destructive: 'bg-wurth-red text-white hover:bg-red-800',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded px-3 text-xs',
        lg: 'h-11 rounded px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

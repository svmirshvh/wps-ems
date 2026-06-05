import { cn, CLAIM_STATUS_LABELS, CLAIM_STATUS_COLORS } from '@/lib/utils';

interface ClaimStatusBadgeProps {
  status: string;
  className?: string;
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap',
      CLAIM_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700',
      className,
    )}>
      {CLAIM_STATUS_LABELS[status] || status}
    </span>
  );
}

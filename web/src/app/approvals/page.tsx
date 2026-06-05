'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, Loader2, Clock, AlertCircle } from 'lucide-react';
import { approvalsApi } from '@/lib/api/approvals';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimStatusBadge } from '@/components/claims/claim-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/hooks/use-toast';

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  const { data: pending, isLoading } = useQuery({
    queryKey: ['approvals-pending'],
    queryFn: approvalsApi.getPending,
    refetchInterval: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ claimId, action, comment }: any) =>
      approvalsApi.approve(claimId, { action, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setApprovalAction(null);
      setSelected(null);
      setComment('');
      toast({ title: 'Action recorded successfully', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Action failed', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const getActionLabel = (claim: any) => {
    if (user?.role === 'MANAGER') return 'Approve';
    if (user?.role === 'FINANCE') {
      if (claim.status === 'MANAGER_APPROVED') return 'Finance Approve';
      if (claim.status === 'FINANCE_APPROVED') return 'Mark Paid';
    }
    return 'Approve';
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isLoading ? '...' : `${pending?.length ?? 0} claims pending your action`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pending?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-12 w-12 text-green-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">No claims pending your review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending?.map((claim: any) => (
            <Card key={claim.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{claim.claimNumber}</span>
                        <ClaimStatusBadge status={claim.status} />
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {claim.user?.firstName} {claim.user?.lastName}
                        <span className="text-gray-400 ml-1.5">({claim.user?.department || 'N/A'})</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {claim._count?.items ?? 0} items · Submitted {formatDate(claim.submittedAt || claim.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(Number(claim.totalAed))}</p>
                      <p className="text-xs text-gray-400">EUR {Number(claim.totalEur).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/claims/${claim.id}`}>
                        <button className="p-2 text-gray-400 hover:text-wurth-cyan hover:bg-cyan-50 rounded transition-colors" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => { setSelected(claim); setApprovalAction('approve'); }}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">{getActionLabel(claim)}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setSelected(claim); setApprovalAction('reject'); }}
                        className="gap-1.5"
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Reject</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={!!approvalAction} onOpenChange={() => { setApprovalAction(null); setComment(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve'
                ? `✓ ${getActionLabel(selected || {})} Claim`
                : '✗ Reject Claim'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {selected && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Claim</span>
                  <span className="font-semibold">{selected.claimNumber}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Employee</span>
                  <span className="font-semibold">{selected.user?.firstName} {selected.user?.lastName}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-wurth-red">{formatCurrency(Number(selected.totalAed))}</span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Comment {approvalAction === 'reject' ? '(required)' : '(optional)'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-wurth-red focus:outline-none"
                rows={3}
                placeholder={approvalAction === 'reject' ? 'Reason for rejection...' : 'Optional comment...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalAction(null); setComment(''); }}>
              Cancel
            </Button>
            <Button
              variant={approvalAction === 'approve' ? 'success' : 'destructive'}
              onClick={() => {
                if (!selected) return;
                approveMutation.mutate({ claimId: selected.id, action: approvalAction!, comment });
              }}
              disabled={approveMutation.isPending || (approvalAction === 'reject' && !comment)}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

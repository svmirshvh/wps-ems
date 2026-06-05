'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Send, FileText, Paperclip, CheckCircle, XCircle, Loader2,
  Eye, Image as ImageIcon, UserPlus, CreditCard, Edit2, Save, X, MessageSquare,
} from 'lucide-react';
import { claimsApi, usersApi } from '@/lib/api/claims';
import { approvalsApi } from '@/lib/api/approvals';
import { attachmentsApi } from '@/lib/api/attachments';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimStatusBadge } from '@/components/claims/claim-status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from '@/lib/utils';
import { toast } from '@/lib/hooks/use-toast';
import Link from 'next/link';

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('submitted') === 'true';
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [approvalDialog, setApprovalDialog] = useState<{ action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [selectedFinanceId, setSelectedFinanceId] = useState('');
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ accountNo: '', iban: '', swift: '', bankName: '' });

  const { data: claimRaw, isLoading } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => claimsApi.get(id),
  });
  const claim: any = claimRaw;

  // Sync bank form when claim loads (useEffect avoids setState during render)
  useEffect(() => {
    if (claim?.user && !editingBank) {
      setBankForm({
        accountNo: claim.user.accountNo || '',
        iban: claim.user.iban || '',
        swift: claim.user.swift || '',
        bankName: claim.user.bankName || '',
      });
    }
  }, [claim?.user?.id]);

  const { data: financeMembers } = useQuery({
    queryKey: ['finance-members'],
    queryFn: claimsApi.getFinanceMembers,
    enabled: user?.role === 'FINANCE' || user?.role === 'ADMIN',
  });

  const submitMutation = useMutation({
    mutationFn: () => claimsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast({ title: 'Claim submitted!', description: 'Awaiting manager approval.', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Submission failed', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ action, comment }: { action: 'approve' | 'reject'; comment: string }) =>
      approvalsApi.approve(id, { action, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setApprovalDialog(null);
      setComment('');
      toast({ title: 'Action recorded', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Action failed', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const inviteMutation = useMutation({
    mutationFn: (financeId: string) => claimsApi.inviteFinance(id, financeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      setInviteDialog(false);
      setSelectedFinanceId('');
      toast({ title: 'Finance member invited', description: 'They now have access to review this claim.', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Invite failed', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const bankMutation = useMutation({
    mutationFn: (data: typeof bankForm) => usersApi.updateBankDetails(claim!.user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', id] });
      setEditingBank(false);
      toast({ title: 'Bank details updated', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const openAttachment = async (attachmentId: string) => {
    setLoadingAttachmentId(attachmentId);
    try {
      const { url } = await attachmentsApi.getSignedUrl(attachmentId);
      window.open(url, '_blank');
    } catch {
      toast({ title: 'Could not open file', variant: 'destructive' });
    } finally {
      setLoadingAttachmentId(null);
    }
  };

  const downloadPdf = async () => {
    try {
      const blob = await claimsApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${claim?.claimNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Failed to download PDF', variant: 'destructive' });
    }
  };

  // Build thread timeline from audit logs + approvals combined
  const timeline = useMemo(() => {
    if (!claim) return [];
    const events: any[] = [];

    // Audit log events
    (claim.auditLogs || []).forEach((log: any) => {
      events.push({
        id: log.id,
        type: 'audit',
        action: log.action,
        actor: log.user,
        metadata: log.metadata,
        createdAt: log.createdAt,
      });
    });

    // Approval events (may overlap with audit, deduplicate by time+actor)
    (claim.approvals || []).forEach((a: any) => {
      // Avoid adding if we already have an audit entry for the same action around the same time
      const isDupe = events.some(
        (e) => e.type === 'audit' && Math.abs(new Date(e.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5000 && e.actor?.id === a.approver?.id,
      );
      if (!isDupe) {
        events.push({
          id: a.id,
          type: 'approval',
          action: a.action,
          actor: a.approver,
          comment: a.comment,
          createdAt: a.createdAt,
        });
      }
    });

    return events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [claim]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-gray-100 rounded" />
        <div className="h-40 bg-gray-100 rounded-lg" />
        <div className="h-60 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!claim) return <div className="text-center py-16 text-gray-500">Claim not found</div>;

  const canApproveAsManager = user?.role === 'MANAGER' && claim.status === 'SUBMITTED';
  const canApproveAsFinance = (user?.role === 'FINANCE' || user?.role === 'BILL_HEAD') && ['MANAGER_APPROVED', 'FINANCE_APPROVED'].includes(claim.status);
  const canApprove = canApproveAsManager || canApproveAsFinance;
  const canSubmit = (user?.role === 'EMPLOYEE' || user?.role === 'ADMIN') && claim.status === 'DRAFT' && claim.userId === user?.id;
  const canInviteFinance = (user?.role === 'FINANCE' || user?.role === 'BILL_HEAD') && claim.status !== 'DRAFT';
  const canEditBank = user?.role === 'FINANCE' || user?.role === 'BILL_HEAD' || user?.role === 'ADMIN';

  const getFinanceApproveLabel = () => {
    if (claim.status === 'FINANCE_APPROVED') return 'Mark as Paid';
    return 'Finance Approve';
  };

  const itemsByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    items: claim.items?.filter((i: any) => i.categoryCode === cat.code) || [],
  })).filter(c => c.items.length > 0);

  const getTimelineStyle = (action: string) => {
    if (action.includes('APPROVED') || action === 'MARKED_PAID') return { dot: 'bg-green-500', bg: 'bg-green-50 border-green-200', text: 'text-green-800' };
    if (action.includes('REJECTED')) return { dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-800' };
    if (action === 'CLAIM_SUBMITTED') return { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' };
    if (action === 'FINANCE_INVITED') return { dot: 'bg-purple-500', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800' };
    if (action === 'CLAIM_REOPENED') return { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' };
    return { dot: 'bg-gray-400', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
  };

  const formatAction = (action: string, metadata?: any) => {
    const map: Record<string, string> = {
      CLAIM_CREATED: 'Claim created',
      CLAIM_SUBMITTED: 'Claim submitted for approval',
      CLAIM_UPDATED: 'Claim details updated',
      CLAIM_DELETED: 'Claim deleted',
      MANAGER_APPROVED: 'Approved by Manager',
      MANAGER_REJECTED: 'Rejected by Manager',
      FINANCE_APPROVED: 'Approved by Finance',
      FINANCE_REJECTED: 'Rejected by Finance',
      MARKED_PAID: 'Marked as Paid',
      CLAIM_REOPENED: 'Claim reopened for editing',
      REOPENED: 'Claim reopened',
      FINANCE_INVITED: `Finance member invited${metadata?.invitedFinanceName ? `: ${metadata.invitedFinanceName}` : ''}`,
    };
    return map[action] || action.replace(/_/g, ' ');
  };

  // Finance members already with access (excluding current assignee)
  const existingFinanceAccess = new Set([
    claim.assignedFinanceId,
    ...(claim.financeAccess || []).map((a: any) => a.financeId),
  ]);

  const invitableMembers = (financeMembers || []).filter(
    (m: any) => !existingFinanceAccess.has(m.id) && m.id !== user?.id,
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Submission confirmation banner */}
      {justSubmitted && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-5 py-4">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Claim submitted successfully</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your reference number is <strong>{claim?.claimNumber}</strong>. A confirmation email has been sent to you and your assigned finance contact.
            </p>
          </div>
        </div>
      )}

      {/* Finance access info */}
      {claim.assignedFinance && (user?.role !== 'EMPLOYEE') && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span>Assigned to <strong>{claim.assignedFinance.firstName} {claim.assignedFinance.lastName}</strong></span>
          {(claim.financeAccess || []).length > 0 && (
            <span className="ml-2 text-xs text-gray-400">
              · Also shared with {(claim.financeAccess || []).length} other{(claim.financeAccess || []).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{claim.claimNumber}</h1>
              <ClaimStatusBadge status={claim.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{claim.eventName || claim.purpose || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadPdf} className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>

          {canInviteFinance && (
            <Button variant="outline" size="sm" onClick={() => setInviteDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Invite Finance
            </Button>
          )}

          {canSubmit && (
            <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="gap-2">
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit
            </Button>
          )}

          {canApprove && (
            <>
              <Button variant="success" size="sm" onClick={() => setApprovalDialog({ action: 'approve' })} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {canApproveAsFinance ? getFinanceApproveLabel() : 'Approve'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setApprovalDialog({ action: 'reject' })} className="gap-2">
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Claim Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wider">Employee Details</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Row label="Name" value={`${claim.user?.lastName}, ${claim.user?.firstName}`} />
            <Row label="Email" value={claim.user?.email} />
            <Row label="Department" value={claim.department || claim.user?.department || '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wider">Claim Details</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Row label="Claim Number" value={claim.claimNumber} />
            <Row label="Created" value={formatDate(claim.createdAt)} />
            <Row label="Submitted" value={claim.submittedAt ? formatDate(claim.submittedAt) : '-'} />
            <Row label="Purpose" value={claim.eventName || claim.purpose || '-'} />
          </CardContent>
        </Card>
      </div>

      {/* Expense Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Expense Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {itemsByCategory.map((cat) => (
            <div key={cat.code}>
              <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{cat.name}</p>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs text-gray-400 px-6 py-2 font-medium">Date</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">PL Nr</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">Description</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">Pillar</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">Country</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">Orig. Amount</th>
                      <th className="text-right text-xs text-gray-400 px-4 py-2 font-medium">AED</th>
                      <th className="text-right text-xs text-gray-400 px-4 py-2 font-medium">EUR</th>
                      <th className="text-left text-xs text-gray-400 px-4 py-2 font-medium">Receipt #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cat.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 text-xs text-gray-600">{formatDate(item.expenseDate)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{item.plCostTypeNr || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 max-w-xs">
                          <p className="font-medium">{item.description}</p>
                          {item.plCostTypeName && <p className="text-xs text-gray-400">{item.plCostTypeName}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{item.pillarName || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{item.country || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {item.currency !== 'AED' ? `${item.currency} ${Number(item.originalAmount).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(item.aedAmount))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          EUR {Number(item.eurAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{item.receiptNumber || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={6} className="px-6 py-2 text-xs font-semibold text-gray-500">Sub Total {cat.code}</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                        {formatCurrency(cat.items.reduce((s: number, i: any) => s + Number(i.aedAmount), 0))}
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                        EUR {cat.items.reduce((s: number, i: any) => s + Number(i.eurAmount), 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {cat.items.map((item: any) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.expenseDate)} · {item.country || '-'}</p>
                        {item.plCostTypeName && <p className="text-xs text-gray-400">{item.plCostTypeName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(item.aedAmount))}</p>
                        {item.currency !== 'AED' && (
                          <p className="text-xs text-gray-400">{item.currency} {Number(item.originalAmount).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between rounded-b-lg">
            <span className="text-sm font-semibold text-gray-300">Total Amount</span>
            <div className="text-right">
              <p className="text-xl font-bold">{formatCurrency(Number(claim.totalAed))}</p>
              <p className="text-sm text-gray-400">EUR {Number(claim.totalEur).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details — Finance can edit, Employee sees read-only */}
      {claim.user && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Bank Details
              </CardTitle>
              {canEditBank && !editingBank && (
                <button
                  onClick={() => setEditingBank(true)}
                  className="flex items-center gap-1.5 text-xs text-wurth-cyan hover:text-blue-700 font-medium"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
              )}
              {canEditBank && editingBank && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBank(false)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    onClick={() => bankMutation.mutate(bankForm)}
                    disabled={bankMutation.isPending}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    {bankMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              )}
            </div>
            {!canEditBank && (
              <p className="text-xs text-amber-600 mt-1">Bank details can only be updated by the Finance team</p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {editingBank ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'accountNo', label: 'Account No.' },
                  { key: 'iban', label: 'IBAN' },
                  { key: 'swift', label: 'SWIFT/BIC' },
                  { key: 'bankName', label: 'Bank Name' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-400 font-medium block mb-1">{label}</label>
                    <input
                      className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-wurth-cyan focus:outline-none"
                      value={(bankForm as any)[key]}
                      onChange={(e) => setBankForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Row label="Account Holder" value={`${claim.user.firstName} ${claim.user.lastName}`} />
                <Row label="Account No." value={claim.user.accountNo || '-'} />
                <Row label="IBAN" value={claim.user.iban || '-'} />
                <Row label="SWIFT" value={claim.user.swift || '-'} />
                <Row label="Bank" value={claim.user.bankName || '-'} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {claim.attachments?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500 font-medium uppercase tracking-wider flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Receipts & Attachments ({claim.attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {claim.attachments.map((att: any) => (
                <button
                  key={att.id}
                  onClick={() => openAttachment(att.id)}
                  disabled={loadingAttachmentId === att.id}
                  className="relative flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors text-left group"
                >
                  {loadingAttachmentId === att.id ? (
                    <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                  ) : att.mimeType?.startsWith('image/') ? (
                    <ImageIcon className="h-8 w-8 text-wurth-cyan" />
                  ) : (
                    <FileText className="h-8 w-8 text-wurth-red" />
                  )}
                  <div className="w-full">
                    <p className="text-xs text-gray-700 font-medium truncate">{att.originalName}</p>
                    <p className="text-xs text-gray-400">{att.mimeType?.includes('pdf') ? 'PDF' : 'Image'} · {(att.fileSize / 1024).toFixed(0)} KB</p>
                  </div>
                  <Eye className="absolute top-2 right-2 h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thread Timeline */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" /> Claim Thread
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />

              <div className="space-y-4 pl-12">
                {timeline.map((event, idx) => {
                  const style = getTimelineStyle(event.action);
                  const actorName = event.actor
                    ? `${event.actor.firstName} ${event.actor.lastName}`
                    : 'System';
                  const actorRole = event.actor?.role ? ` · ${event.actor.role}` : '';

                  return (
                    <div key={event.id} className="relative">
                      {/* Dot */}
                      <div className={`absolute -left-8 mt-1 w-3 h-3 rounded-full border-2 border-white ${style.dot} ring-1 ring-gray-200`} />

                      <div className={`rounded-lg border px-4 py-3 ${style.bg}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className={`text-sm font-semibold ${style.text}`}>
                              {formatAction(event.action, event.metadata)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {actorName}<span className="text-gray-400">{actorRole}</span>
                            </p>
                          </div>
                          <time className="text-xs text-gray-400 whitespace-nowrap">{formatDate(event.createdAt)}</time>
                        </div>
                        {event.comment && (
                          <div className="mt-2 pt-2 border-t border-current border-opacity-10">
                            <p className="text-sm text-gray-600 italic">"{event.comment}"</p>
                          </div>
                        )}
                        {event.metadata?.invitedFinanceName && (
                          <p className="text-xs text-purple-600 mt-1">Invited: {event.metadata.invitedFinanceName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => { setApprovalDialog(null); setComment(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog?.action === 'approve' ? '✓ Approve Claim' : '✗ Reject Claim'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-gray-600 mb-4">
              {approvalDialog?.action === 'approve'
                ? `Are you sure you want to approve claim ${claim.claimNumber}?`
                : `Are you sure you want to reject claim ${claim.claimNumber}?`}
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Comment {approvalDialog?.action === 'reject' ? '(required)' : '(optional)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-wurth-red focus:outline-none"
              rows={3}
              placeholder="Add a comment..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApprovalDialog(null); setComment(''); }}>Cancel</Button>
            <Button
              variant={approvalDialog?.action === 'approve' ? 'success' : 'destructive'}
              onClick={() => approveMutation.mutate({ action: approvalDialog!.action, comment })}
              disabled={approveMutation.isPending || (approvalDialog?.action === 'reject' && !comment)}
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {approvalDialog?.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Finance Dialog */}
      <Dialog open={inviteDialog} onOpenChange={() => { setInviteDialog(false); setSelectedFinanceId(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-wurth-cyan" /> Invite Finance Member
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-gray-600 mb-4">
              Select a finance team member to give them access to review this claim and take action.
            </p>
            {invitableMembers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">All finance members already have access to this claim.</p>
            ) : (
              <div className="space-y-2">
                {invitableMembers.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedFinanceId(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                      selectedFinanceId === m.id
                        ? 'border-wurth-cyan bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                      {m.firstName[0]}{m.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteDialog(false); setSelectedFinanceId(''); }}>Cancel</Button>
            <Button
              onClick={() => selectedFinanceId && inviteMutation.mutate(selectedFinanceId)}
              disabled={!selectedFinanceId || inviteMutation.isPending}
              className="gap-2"
            >
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5 font-medium">{value}</p>
    </div>
  );
}

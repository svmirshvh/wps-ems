'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, FileText, Trash2, Download, Eye, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { claimsApi } from '@/lib/api/claims';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimStatusBadge } from '@/components/claims/claim-status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'MANAGER_APPROVED', label: 'Mgr Approved' },
  { value: 'FINANCE_APPROVED', label: 'Fin Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
];

const FINANCE_TABS = [
  { key: 'assigned', label: 'Assigned to Me', icon: Clock, desc: 'Claims assigned to you by employees' },
  { key: 'invited', label: 'Invited', icon: CheckCircle, desc: 'Claims shared with you by colleagues' },
  { key: 'all', label: 'All My Claims', icon: DollarSign, desc: 'All claims you can access' },
];

export default function ClaimsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [financeTab, setFinanceTab] = useState<'assigned' | 'invited' | 'all'>('assigned');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isFinance = user?.role === 'FINANCE';
  const isBillHead = user?.role === 'BILL_HEAD';

  const scope = isFinance ? financeTab : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['claims', { status, search, scope }],
    queryFn: () => claimsApi.list({ status: status || undefined, search: search || undefined, scope }),
  });

  const deleteMutation = useMutation({
    mutationFn: claimsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      toast({ title: 'Claim deleted', variant: 'default' });
    },
  });

  const downloadPdf = async (id: string, claimNumber: string) => {
    try {
      const blob = await claimsApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${claimNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Failed to download PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {isFinance ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-wurth-red">Finance Claims</span>
                <span className="text-xs text-gray-400">· Module</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Review and process expense claims assigned to you</p>
            </>
          ) : isBillHead ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-wurth-red">Finance Supervisor</span>
                <span className="text-xs text-gray-400">· Bill Head</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">All Expense Claims</h1>
              <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} total claims · Full supervisory access</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEmployee ? 'My Expense Claims' : 'All Expense Claims'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEmployee ? `${data?.total ?? 0} claims submitted` : `${data?.total ?? 0} total claims`}
              </p>
            </>
          )}
        </div>
        {isEmployee && (
          <Link href="/claims/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Claim
            </Button>
          </Link>
        )}
      </div>

      {/* Finance Module Tabs */}
      {isFinance && (
        <div className="border-b border-gray-200">
          <nav className="flex gap-0 -mb-px">
            {FINANCE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFinanceTab(tab.key as any)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                    financeTab === tab.key
                      ? 'border-wurth-red text-wurth-red'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {data?.total !== undefined && financeTab === tab.key && (
                    <span className="ml-1 bg-wurth-red text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {data.total}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search claims..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    status === opt.value
                      ? 'bg-wurth-red text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {isFinance
                  ? financeTab === 'assigned'
                    ? 'No claims assigned to you yet'
                    : financeTab === 'invited'
                    ? 'No claims shared with you'
                    : 'No accessible claims'
                  : isBillHead
                  ? 'No claims found'
                  : 'No claims found'}
              </p>
              {isEmployee && (
                <Link href="/claims/new" className="mt-4 inline-block">
                  <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Claim</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Claim #</th>
                      {!isEmployee && <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Employee</th>}
                      {(isFinance || isBillHead) && <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Assigned To</th>}
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Purpose</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Date</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.data?.map((claim: any) => (
                      <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/claims/${claim.id}`} className="font-semibold text-sm text-gray-900 hover:text-wurth-red">
                            {claim.claimNumber}
                          </Link>
                        </td>
                        {!isEmployee && (
                          <td className="px-4 py-4 text-sm text-gray-700">
                            <p className="font-medium">{claim.user?.firstName} {claim.user?.lastName}</p>
                            <p className="text-xs text-gray-400">{claim.user?.department || '-'}</p>
                          </td>
                        )}
                        {(isFinance || isBillHead) && (
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {claim.assignedFinance
                              ? `${claim.assignedFinance.firstName} ${claim.assignedFinance.lastName}`
                              : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {claim.eventName || claim.purpose || '-'}
                        </td>
                        <td className="px-4 py-4">
                          <ClaimStatusBadge status={claim.status} />
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(claim.totalAed))}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">{formatDate(claim.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/claims/${claim.id}`}>
                              <button className="p-1.5 text-gray-400 hover:text-wurth-cyan rounded hover:bg-cyan-50 transition-colors" title="View">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              onClick={() => downloadPdf(claim.id, claim.claimNumber)}
                              className="p-1.5 text-gray-400 hover:text-wurth-red rounded hover:bg-red-50 transition-colors" title="Download PDF">
                              <Download className="h-4 w-4" />
                            </button>
                            {claim.status === 'DRAFT' && isEmployee && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete claim ${claim.claimNumber}?`)) {
                                    deleteMutation.mutate(claim.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden divide-y divide-gray-100">
                {data?.data?.map((claim: any) => (
                  <Link key={claim.id} href={`/claims/${claim.id}`}
                    className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">{claim.claimNumber}</p>
                      {!isEmployee && (
                        <p className="text-xs text-gray-700 font-medium">{claim.user?.firstName} {claim.user?.lastName}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">{claim.eventName || claim.purpose || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(claim.createdAt)}</p>
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-1.5">
                      <ClaimStatusBadge status={claim.status} />
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(claim.totalAed))}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

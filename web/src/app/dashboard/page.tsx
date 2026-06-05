'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle, DollarSign, ArrowRight } from 'lucide-react';
import { claimsApi } from '@/lib/api/claims';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClaimStatusBadge } from '@/components/claims/claim-status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: claimsApi.getDashboard,
  });

  const kpiCards = [
    { label: 'Draft', value: stats?.draft ?? 0, icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100', status: 'DRAFT' },
    { label: 'Submitted', value: stats?.submitted ?? 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', status: 'SUBMITTED' },
    { label: 'Approved', value: (stats?.financeApproved ?? 0) + (stats?.paid ?? 0), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', status: 'FINANCE_APPROVED' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', status: 'REJECTED' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/claims/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Claim</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <Link key={card.status} href={`/claims?status=${card.status}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 font-medium">{card.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Claims */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {user?.role === 'EMPLOYEE' ? 'My Recent Claims' : 'All Recent Claims'}
            </CardTitle>
            <Link href="/claims" className="text-sm text-wurth-red hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : stats?.recentClaims?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No claims yet</p>
              <p className="text-gray-400 text-xs mt-1">Create your first expense claim to get started</p>
              <Link href="/claims/new" className="mt-4 inline-block">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> New Claim
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats?.recentClaims?.map((claim: any) => (
                <Link key={claim.id} href={`/claims/${claim.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-red-50 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-wurth-red" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{claim.claimNumber}</p>
                      {user?.role !== 'EMPLOYEE' && claim.user && (
                        <p className="text-xs font-medium text-gray-700 truncate">{claim.user.firstName} {claim.user.lastName}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate">{claim.eventName || claim.purpose || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(claim.totalAed))}</p>
                      <p className="text-xs text-gray-400">{formatDate(claim.createdAt)}</p>
                    </div>
                    <ClaimStatusBadge status={claim.status} />
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-wurth-red transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats for Managers/Finance */}
      {(user?.role === 'MANAGER' || user?.role === 'FINANCE' || user?.role === 'ADMIN') && (
        <Card className="border-l-4 border-l-wurth-cyan">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Pending Your Action</p>
                <p className="text-2xl font-bold text-wurth-cyan mt-1">
                  {user?.role === 'FINANCE'
                    ? (stats?.submitted ?? 0) + (stats?.managerApproved ?? 0)
                    : (stats?.submitted ?? 0)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {user?.role === 'FINANCE'
                    ? `${stats?.submitted ?? 0} awaiting manager · ${stats?.managerApproved ?? 0} ready for finance`
                    : 'claims awaiting your approval'}
                </p>
              </div>
              <Link href="/approvals">
                <Button variant="info" size="sm" className="gap-2">
                  Review Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

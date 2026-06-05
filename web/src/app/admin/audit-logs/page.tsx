'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Activity } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CLAIM_CREATED: 'bg-purple-100 text-purple-700',
  CLAIM_SUBMITTED: 'bg-orange-100 text-orange-700',
  CLAIM_UPDATED: 'bg-yellow-100 text-yellow-700',
  CLAIM_DELETED: 'bg-red-100 text-red-700',
  MANAGER_APPROVED: 'bg-green-100 text-green-700',
  FINANCE_APPROVED: 'bg-emerald-100 text-emerald-700',
  MANAGER_REJECTED: 'bg-red-100 text-red-700',
  FINANCE_REJECTED: 'bg-red-100 text-red-700',
  RECEIPT_UPLOADED: 'bg-cyan-100 text-cyan-700',
  CLAIM_ITEM_ADDED: 'bg-indigo-100 text-indigo-700',
};

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiClient.get('/audit-logs').then(r => r.data),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete activity log for all system actions</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No audit logs yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data?.data?.map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 px-4 py-3">
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 max-w-[120px] truncate ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}
                    title={log.action.replace(/_/g, ' ')}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      <span className="font-medium">{log.user?.firstName} {log.user?.lastName}</span>
                      {log.entityId && <span className="text-gray-400 text-xs ml-1.5 hidden sm:inline">→ {log.entityType} {log.entityId.slice(0, 8)}…</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{log.user?.email}</p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDate(log.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

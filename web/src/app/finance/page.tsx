'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Eye, CheckCircle, XCircle, Clock, TrendingUp, FileText, Table } from 'lucide-react';
import { financeApi } from '@/lib/api/finance';
import { claimsApi } from '@/lib/api/claims';
import { approvalsApi } from '@/lib/api/approvals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClaimStatusBadge } from '@/components/claims/claim-status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/hooks/use-toast';

export default function FinancePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['finance-dashboard', startDate, endDate],
    queryFn: () => financeApi.getDashboard({ startDate: startDate || undefined, endDate: endDate || undefined }),
  });

  const exportToCSV = async () => {
    try {
      const claims = await financeApi.getExport({ startDate: startDate || undefined, endDate: endDate || undefined });
      const rows = [
        ['Claim Number', 'Employee', 'Department', 'Status', 'Total AED', 'Total EUR', 'Submitted Date', 'Items'],
        ...claims.map((c: any) => [
          c.claimNumber,
          `${c.user?.firstName} ${c.user?.lastName}`,
          c.department || c.user?.department || '',
          c.status,
          Number(c.totalAed).toFixed(2),
          Number(c.totalEur).toFixed(2),
          c.submittedAt ? formatDate(c.submittedAt) : '-',
          c.items?.length ?? 0,
        ]),
      ];
      const csv = rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wps-expense-claims-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const exportToExcel = async () => {
    try {
      const claims = await financeApi.getExport({ startDate: startDate || undefined, endDate: endDate || undefined });
      const headers = ['Claim Number', 'Employee', 'Department', 'Status', 'Total AED', 'Total EUR', 'Submitted Date', 'Items'];
      const rows = claims.map((c: any) => [
        c.claimNumber,
        `${c.user?.firstName} ${c.user?.lastName}`,
        c.department || c.user?.department || '',
        c.status,
        Number(c.totalAed).toFixed(2),
        Number(c.totalEur).toFixed(2),
        c.submittedAt ? formatDate(c.submittedAt) : '-',
        c.items?.length ?? 0,
      ]);

      const esc = (v: any) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const cell = (v: any, type = 'String') =>
        `<Cell ss:StyleID="s1"><Data ss:Type="${type}">${esc(v)}</Data></Cell>`;
      const headerCell = (v: string) =>
        `<Cell ss:StyleID="s2"><Data ss:Type="String">${esc(v)}</Data></Cell>`;

      const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="s1"><Alignment ss:WrapText="0"/></Style>
    <Style ss:ID="s2"><Font ss:Bold="1"/><Interior ss:Color="#CC0000" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>
  </Styles>
  <Worksheet ss:Name="Expense Claims">
    <Table>
      <Row>${headers.map(headerCell).join('')}</Row>
      ${rows.map((row: any[]) => `<Row>${row.map((v: any, i: number) => cell(v, i >= 4 && i <= 5 ? 'Number' : 'String')).join('')}</Row>`).join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

      const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wps-expense-claims-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const kpis = [
    { label: 'Pending Review', value: data?.kpis?.totalPending ?? 0, sub: `AED ${(data?.kpis?.pendingAmount ?? 0).toFixed(0)}`, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'In Progress', value: data?.kpis?.totalApproved ?? 0, sub: `AED ${(data?.kpis?.approvedAmount ?? 0).toFixed(0)}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Paid Out', value: data?.kpis?.totalPaid ?? 0, sub: `AED ${(data?.kpis?.paidAmount ?? 0).toFixed(0)}`, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Rejected', value: data?.kpis?.totalRejected ?? 0, sub: '', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all expense claims</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Table className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-gray-500">From Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-gray-500">To Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-gray-500 font-medium">{kpi.label}</span>
                <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              {isLoading ? (
                <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
                  {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Chart */}
      {data?.monthlyData && data.monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Claims Volume (AED)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`AED ${Number(v).toFixed(0)}`, 'Amount']} />
                <Bar dataKey="total" fill="#CC0000" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Claims Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Claims</CardTitle>
            <Link href="/claims" className="text-sm text-wurth-red hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Claim #</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Employee</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Department</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Date</th>
                      <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data?.recentClaims?.map((claim: any) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <Link href={`/claims/${claim.id}`} className="text-sm font-semibold text-gray-900 hover:text-wurth-red">
                            {claim.claimNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {claim.user?.firstName} {claim.user?.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{claim.department || claim.user?.department || '-'}</td>
                        <td className="px-4 py-3"><ClaimStatusBadge status={claim.status} /></td>
                        <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(Number(claim.totalAed))}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatDate(claim.createdAt)}</td>
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-1">
                            <Link href={`/claims/${claim.id}`}>
                              <button className="p-1.5 text-gray-400 hover:text-wurth-cyan hover:bg-cyan-50 rounded">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {data?.recentClaims?.map((claim: any) => (
                  <Link key={claim.id} href={`/claims/${claim.id}`} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{claim.claimNumber}</p>
                      <p className="text-xs text-gray-500">{claim.user?.firstName} {claim.user?.lastName}</p>
                      <p className="text-xs text-gray-400">{formatDate(claim.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <ClaimStatusBadge status={claim.status} />
                      <p className="text-sm font-bold mt-1">{formatCurrency(Number(claim.totalAed))}</p>
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

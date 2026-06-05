'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toast } from '@/lib/hooks/use-toast';
import { UserPlus, Shield, Edit, Trash2 } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-orange-100 text-orange-700',
  FINANCE: 'bg-green-100 text-green-700',
  ADMIN: 'bg-red-100 text-red-700',
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', department: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get('/users').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/users', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'EMPLOYEE', department: '' });
      toast({ title: 'User created successfully', variant: 'success' });
    },
    onError: (err: any) => toast({ title: 'Failed to create user', description: err?.response?.data?.message, variant: 'destructive' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.put(`/users/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} users</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Department</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-semibold text-gray-500 px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.data?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.department || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-100 rounded"
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(val) => setForm(f => ({ ...f, role: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['EMPLOYEE', 'MANAGER', 'FINANCE', 'ADMIN'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

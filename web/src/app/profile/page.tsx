'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/lib/store/auth-store';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/hooks/use-toast';
import { Save, User, CreditCard, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const isEmployee = user?.role === 'EMPLOYEE';

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      department: user?.department || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/users/profile', data).then(r => r.data),
    onSuccess: (updated) => {
      if (accessToken && refreshToken) {
        setAuth({ ...user!, ...updated }, accessToken, refreshToken);
      }
      toast({ title: 'Profile updated successfully', variant: 'success' });
    },
    onError: () => toast({ title: 'Failed to update profile', variant: 'destructive' }),
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal information</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-wurth-cyan" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 mb-4">
            <Label>Email (read-only)</Label>
            <Input value={user?.email || ''} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-1.5 mb-4">
            <Label>Role (read-only)</Label>
            <Input value={user?.role || ''} disabled className="bg-gray-50" />
          </div>
          <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input {...register('firstName')} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input {...register('lastName')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input {...register('department')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bank Details — read-only for employees */}
      <Card className={isEmployee ? 'border-amber-100' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-wurth-cyan" /> Bank Details
            {isEmployee && <Lock className="h-3.5 w-3.5 text-amber-500 ml-1" />}
          </CardTitle>
          {isEmployee && (
            <p className="text-xs text-amber-600 mt-1">
              Bank details are managed by the Finance team. Contact Finance to update your banking information.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Account No.', value: user?.accountNo },
              { label: 'IBAN', value: user?.iban },
              { label: 'SWIFT/BIC', value: user?.swift },
              { label: 'Bank Name', value: user?.bankName },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-gray-500">{label}</Label>
                <Input
                  value={value || ''}
                  disabled
                  className={isEmployee ? 'bg-amber-50 text-gray-500 cursor-not-allowed' : 'bg-gray-50'}
                  placeholder="Not set"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

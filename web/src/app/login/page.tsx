'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      const result = await authApi.login(data.email, data.password);
      setAuth(result.user, result.accessToken, result.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err?.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast({ title: 'Sign in failed', description: msg, variant: 'destructive', duration: 5000 });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-wurth-red py-8 px-4">
        <div className="max-w-sm mx-auto space-y-2">
          <div className="bg-white rounded px-3 py-1.5 inline-flex">
            <img
              src="/images/wps-logo.svg"
              alt="Würth Professional Solutions"
              style={{ height: 36, width: 'auto', maxWidth: '100%' }}
            />
          </div>
          <p className="text-red-200 text-sm">Expense Management System</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-4 pt-12 pb-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-sm text-gray-500 mb-8">Use your WPS corporate credentials</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@wps.local"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-2">Demo credentials:</p>
              <div className="space-y-1">
                {[
                  ['employee@wps.local', 'Employee@123', 'EMPLOYEE'],
                  ['manager@wps.local', 'Manager@123', 'MANAGER'],
                  ['finance@wps.local', 'Finance@123', 'FINANCE'],
                  ['billhead@wps.local', 'BillHead@123', 'BILL_HEAD'],
                  ['admin@wps.local', 'Admin@123', 'ADMIN'],
                ].map(([email, pass, role]) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => {
                      setValue('email', email, { shouldValidate: true });
                      setValue('password', pass, { shouldValidate: true });
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-xs text-left transition-colors"
                  >
                    <span className="text-gray-600">{email}</span>
                    <span className="text-wurth-red font-medium">{role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

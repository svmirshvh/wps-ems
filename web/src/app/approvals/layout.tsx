import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function ApprovalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN']}>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

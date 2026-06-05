import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['ADMIN', 'FINANCE', 'BILL_HEAD']}>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

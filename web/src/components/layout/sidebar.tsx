'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, CheckCircle, Settings2, LogOut, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
  { href: '/claims',    label: 'Claims',    icon: FileText,         roles: ['EMPLOYEE', 'MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
  { href: '/approvals', label: 'Approvals', icon: CheckCircle,      roles: ['MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
  { href: '/admin/users', label: 'Admin',   icon: Settings2,        roles: ['ADMIN'] },
];

interface InnerProps {
  visibleItems: typeof NAV_ITEMS;
  claimsLabel: string;
  pathname: string;
  user: any;
  onLinkClick: () => void;
  onLogout: () => void;
  hideLogo?: boolean;
}

function SidebarInner({ visibleItems, claimsLabel, pathname, user, onLinkClick, onLogout, hideLogo }: InnerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo — hidden in mobile drawer (drawer header already shows it) */}
      {!hideLogo && (
        <div className="px-4 py-5 border-b border-white/10 shrink-0">
          <Link href="/dashboard" onClick={onLinkClick}>
            <div className="bg-white rounded px-3 py-1.5 inline-flex">
              <img src="/images/wps-logo.svg" alt="Würth Professional Solutions" className="h-7 w-auto" />
            </div>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const label = item.href === '/claims' ? claimsLabel : item.label;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-red-100 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/10 shrink-0 space-y-0.5">
        <Link
          href="/profile"
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
            pathname.startsWith('/profile')
              ? 'bg-white/20'
              : 'hover:bg-white/10',
          )}
        >
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-red-200 truncate leading-tight">{user?.role}</p>
          </div>
        </Link>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-200 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, refreshToken } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken ?? undefined); } catch {}
    queryClient.clear();
    logout();
    router.push('/login');
  };

  const claimsLabel = user?.role === 'EMPLOYEE' ? 'My Claims' : 'Claims';
  const visibleItems = NAV_ITEMS.filter(item => user && item.roles.includes(user.role));

  const innerProps: InnerProps = {
    visibleItems,
    claimsLabel,
    pathname,
    user,
    onLinkClick: () => setMobileOpen(false),
    onLogout: handleLogout,
  };

  return (
    <>
      {/* ── Desktop sidebar ── fixed, always visible ──────────────────── */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-wurth-red z-30 shadow-xl">
        <SidebarInner {...innerProps} />
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-wurth-red flex items-center gap-3 px-4 z-30 shadow-lg">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard">
          <div className="bg-white rounded px-2 py-1 inline-flex">
            <img src="/images/wps-logo.svg" alt="WPS" className="h-5 w-auto" />
          </div>
        </Link>
      </div>

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 w-64 bg-wurth-red z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="bg-white rounded px-2 py-1 inline-flex">
            <img src="/images/wps-logo.svg" alt="WPS" className="h-5 w-auto" />
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <SidebarInner {...innerProps} hideLogo onLinkClick={() => setMobileOpen(false)} />
        </div>
      </aside>
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, X, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', roles: ['EMPLOYEE', 'MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
    { href: '/claims', label: claimsLabel, roles: ['EMPLOYEE', 'MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
    { href: '/approvals', label: 'Approvals', roles: ['MANAGER', 'FINANCE', 'BILL_HEAD', 'ADMIN'] },
    { href: '/admin/users', label: 'Admin', roles: ['ADMIN'] },
  ];

  const visibleLinks = navLinks.filter(l => user && l.roles.includes(user.role));

  return (
    <header className="bg-wurth-red shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center shrink-0">
            <div className="bg-white rounded px-2 py-1 flex items-center">
              <img
                src="/images/wps-logo.svg"
                alt="Würth Professional Solutions"
                className="h-5 sm:h-7 w-auto"
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded text-sm font-medium transition-colors',
                  pathname.startsWith(link.href)
                    ? 'bg-white/20 text-white'
                    : 'text-red-100 hover:bg-white/10 hover:text-white',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-white hover:bg-white/10 rounded px-3 py-2 transition-colors"
              >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="hidden sm:block text-sm font-medium">{user?.firstName}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <span className="mt-1 inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                      {user?.role}
                    </span>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden bg-red-800 border-t border-red-700">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-4 py-3 text-sm font-medium border-b border-red-700/50',
                pathname.startsWith(link.href)
                  ? 'bg-white/10 text-white'
                  : 'text-red-100 hover:bg-white/5 hover:text-white',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

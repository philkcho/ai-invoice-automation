'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Companies', href: '/companies', roles: ['SUPER_ADMIN'] },
  { label: 'Users', href: '/users', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
  { label: 'Vendors', href: '/vendors', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
  { label: 'Invoices', href: '/invoices', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'] },
  { label: 'Purchase Orders', href: '/purchase-orders', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'] },
  { label: 'Approvals', href: '/approvals', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'APPROVER'] },
  { label: 'Payments', href: '/payments', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'] },
  { label: 'Tax Rates', href: '/settings/tax-rates', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
  { label: 'Invoice Types', href: '/settings/invoice-types', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
  { label: 'Approval Settings', href: '/settings/approval-settings', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
];

const bottomItems: NavItem[] = [
  { label: 'My Profile', href: '/profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col">
      <nav className="flex-1 py-4">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-4 py-2.5 text-sm hover:bg-gray-800 hover:text-white transition-colors',
              isActive(item.href) && 'bg-gray-800 text-white border-l-2 border-blue-500'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-700 py-2">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-4 py-2.5 text-sm hover:bg-gray-800 hover:text-white transition-colors',
              isActive(item.href) && 'bg-gray-800 text-white border-l-2 border-blue-500'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

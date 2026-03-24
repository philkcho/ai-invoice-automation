'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Upload,
  PenLine,
  Mail,
  FolderOpen,
  CheckCircle,
  Banknote,
  Store,
  Tag,
  ShieldCheck,
  ScrollText,
  MailCheck,
  Newspaper,
  CreditCard,
  HelpCircle,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
  icon: LucideIcon;
  section?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard', href: '/', section: 'MAIN',
    icon: LayoutDashboard,
  },
  {
    label: 'Companies', href: '/companies', section: 'MAIN', roles: ['SUPER_ADMIN'],
    icon: Building2,
  },
  {
    label: 'Users', href: '/users', section: 'MAIN', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: Users,
  },
  {
    label: 'Invoices', href: '/invoices', section: 'DATA', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: FileText,
  },
  {
    label: 'Invoice (Upload)', href: '/invoices/upload', section: 'DATA', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: Upload,
  },
  {
    label: 'Invoice (Manual)', href: '/invoices/new', section: 'DATA', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: PenLine,
  },
  {
    label: 'Invoice (Email)', href: '/invoices/email', section: 'DATA', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: Mail,
  },
  {
    label: 'Invoice (File)', href: '/invoices/file', section: 'DATA', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: FolderOpen,
  },
  {
    label: 'Approvals', href: '/approvals', section: 'WORKFLOW', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'APPROVER'],
    icon: CheckCircle,
  },
  {
    label: 'Payments', href: '/payments', section: 'WORKFLOW', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT'],
    icon: Banknote,
  },
  {
    label: 'Vendors', href: '/vendors', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: Store,
  },
  {
    label: 'Invoice Types', href: '/settings/invoice-types', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: Tag,
  },
  {
    label: 'Approval Rules', href: '/settings/approval-settings', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: ShieldCheck,
  },
  {
    label: 'Company Policies', href: '/settings/company-policies', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: ScrollText,
  },
  {
    label: 'Email Integration', href: '/settings/email', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: MailCheck,
  },
  {
    label: 'Email Digest', href: '/settings/email-digest', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: Newspaper,
  },
  {
    label: 'Billing', href: '/settings/billing', section: 'SETTINGS', roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
    icon: CreditCard,
  },
];

const bottomItems: NavItem[] = [
  {
    label: 'Help', href: '/help',
    icon: HelpCircle,
  },
  {
    label: 'My Profile', href: '/profile',
    icon: UserCircle,
  },
];

const sectionLabels: Record<string, string> = {
  MAIN: '',
  DATA: 'Data',
  WORKFLOW: 'Workflow',
  SETTINGS: 'Settings',
};

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const sections: Record<string, NavItem[]> = {};
  for (const item of visibleItems) {
    const sec = item.section || 'MAIN';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(item);
  }

  const sectionKeys = Object.keys(sections);

  return (
    <aside className="w-60 bg-gradient-to-b from-sidebar to-sidebar-light text-stone-300 flex flex-col shrink-0">
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {sectionKeys.map((section, idx) => {
          const items = sections[section];
          return (
            <div key={section}>
              {idx > 0 && (
                <Separator className="my-3 bg-stone-700/40" />
              )}
              {sectionLabels[section] && (
                <div className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
                  {sectionLabels[section]}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (isActive(item.href)) {
                        window.dispatchEvent(new Event('sidebar-nav-reset'));
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                      isActive(item.href)
                        ? 'bg-sidebar-active text-white shadow-sm shadow-primary-900/40 font-medium'
                        : 'text-stone-400 hover:bg-sidebar-hover hover:text-white'
                    )}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-stone-700/40 py-3 px-3">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                isActive(item.href)
                  ? 'bg-sidebar-active text-white shadow-sm'
                  : 'text-stone-400 hover:bg-sidebar-hover hover:text-white'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import CompanySwitcher from '@/components/common/CompanySwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { FileText, User, LogOut, Settings } from 'lucide-react';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-primary-100/40 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Link href="/landing" className="flex items-center gap-2.5 hover:opacity-80 transition">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            AI Invoice Automation
          </h1>
        </Link>
        <CompanySwitcher />
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-primary-50 transition-colors duration-200 outline-none cursor-pointer">
            <div className="text-right mr-0.5">
              <div className="text-sm font-medium text-gray-700">{user?.full_name}</div>
              <div className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</div>
            </div>
            <Avatar size="default">
              <AvatarFallback className="bg-gradient-to-br from-primary-200 to-primary-300 text-sm font-semibold text-primary-700">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5 px-0.5">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="w-4 h-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/billing')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

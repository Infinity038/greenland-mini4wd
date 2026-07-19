'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// Temporary compatibility bridge. Middleware has already verified a real
// Supabase staff session before any non-login /admin route reaches this
// layout. Existing legacy modules still look for their old local UI flag;
// the automated cleanup commit removes those checks and then removes this
// bridge before Production merge.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/admin/login') {
      localStorage.setItem('adminSession', JSON.stringify({ expires: Date.now() + 60 * 60 * 1000 }));
    }
  }, [pathname]);

  return children;
}

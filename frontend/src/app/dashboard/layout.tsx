'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  GitPullRequest, 
  Layers, 
  Settings, 
  History, 
  LayoutDashboard, 
  Activity, 
  HelpCircle,
  Menu,
  X,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/config';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'connected' | 'checking' | 'starting' | 'disconnected'>('checking');

  // Check backend API connection
  useEffect(() => {
    console.log('[ReviewPilot API Monitor] Active Config:', { API_URL, environment: process.env.NODE_ENV });
    const checkApi = async () => {
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;
      let lastStatus: number | null = null;
      let lastBody: string | null = null;
      
      const url = `${API_URL}/health`;

      while (attempt < maxRetries) {
        attempt++;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          // Any response (even error status codes like 401, 403, 404, 500) 
          // means the backend is reachable and online!
          if (res.ok || [401, 403, 404, 500].includes(res.status)) {
            setApiStatus('connected');
            return;
          }

          // Gateway issues (502, 503, 504) indicate cold starting
          if ([502, 503, 504].includes(res.status)) {
            setApiStatus('starting');
            lastStatus = res.status;
            try {
              lastBody = await res.text();
            } catch {
              lastBody = '(failed to read body)';
            }
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            continue;
          }

          lastStatus = res.status;
          try {
            lastBody = await res.text();
          } catch {
            lastBody = '(failed to read body)';
          }
        } catch (err: any) {
          lastError = err;
          
          if (err.name === 'AbortError') {
            setApiStatus('starting');
          }
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // If all attempts failed, set to disconnected
      setApiStatus('disconnected');

      // Output diagnostics group for troubleshooting
      console.group('ReviewPilot API Health Check Diagnostics');
      console.error('API Health Check failed after %d attempts.', maxRetries);
      console.log('Resolved API_URL:', API_URL);
      console.log('Target Request URL:', url);
      if (lastStatus !== null) console.log('Last HTTP Status Code:', lastStatus);
      if (lastBody !== null) console.log('Last Response Body:', lastBody);
      if (lastError !== null) console.error('Last Thrown Exception:', lastError);
      console.groupEnd();
    };

    checkApi();
    const interval = setInterval(checkApi, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Repositories', href: '/dashboard/repos', icon: Layers },
    { name: 'Reviews', href: '/dashboard/reviews', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500 font-mono">Verifying user context...</span>
        </div>
      </div>
    );
  }

  // Auth Context handles navigation to /login, prevent page flash
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-900 bg-neutral-950 shrink-0">
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-900">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
              <span className="text-black font-black text-[10px]">R</span>
            </div>
            <span className="font-semibold text-sm tracking-tight text-neutral-200">ReviewPilot</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive 
                    ? 'bg-neutral-900 text-white' 
                    : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="p-4 border-t border-neutral-900 bg-neutral-950/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.github_username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-neutral-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-neutral-200 truncate">{user.github_username}</span>
                <span className="text-[10px] text-neutral-500">Developer</span>
              </div>
            </div>
            <button 
              onClick={logout} 
              title="Log Out" 
              className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-neutral-900 bg-black/80 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-neutral-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Breadcrumb Info */}
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>ReviewPilot</span>
              <span>/</span>
              <span className="text-neutral-300 font-medium capitalize">
                {pathname.split('/').pop() || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* API Health Connection Dot */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-neutral-900 bg-neutral-950 text-[10px] text-neutral-400">
              <span className={`w-1.5 h-1.5 rounded-full ${
                apiStatus === 'connected' 
                  ? 'bg-emerald-500 shadow-sm shadow-emerald-400' 
                  : apiStatus === 'starting' || apiStatus === 'checking'
                  ? 'bg-amber-500 animate-pulse' 
                  : 'bg-red-500'
              }`} />
              <span className="hidden sm:inline">
                {apiStatus === 'connected' 
                  ? 'API Connected' 
                  : apiStatus === 'starting'
                  ? 'Backend Starting...'
                  : apiStatus === 'checking'
                  ? 'Connecting API...'
                  : 'API Offline'}
              </span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </a>
          </div>
        </header>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/90 flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="font-semibold text-neutral-200">ReviewPilot Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-base font-semibold py-2 border-b border-neutral-900 ${
                      isActive ? 'text-white' : 'text-neutral-400'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-neutral-900 pt-6 flex items-center justify-between">
              <span className="text-sm text-neutral-400 truncate max-w-[200px]">{user.github_username} (Developer)</span>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="text-xs text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Dashboard Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

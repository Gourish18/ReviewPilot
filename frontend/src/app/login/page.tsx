'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { API_URL } from '@/config';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="currentColor"
    className={className}
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGithubLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    window.location.href = `${API_URL}/api/auth/login`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      if (err === 'database_save_failed') {
        setError('Failed to securely register your GitHub credentials in the database.');
      } else if (err === 'database_error') {
        setError('Database connection error occurred. Please try again later.');
      } else {
        setError(`Authentication failed: ${err.replace(/_/g, ' ')}`);
      }
    }
  }, []);

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-center bg-black text-white px-6">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_40%,#121214,transparent)] pointer-events-none" />

      <div className="relative w-full max-w-[400px] mx-auto">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-4 hover:scale-105 transition-transform">
            <span className="text-black font-black text-lg">R</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome to ReviewPilot</h1>
          <p className="text-sm text-neutral-500 mt-1.5">Sign in to review and orchestrate code quality audits.</p>
        </div>

        {/* Auth Card */}
        <div className="border border-neutral-900 bg-neutral-950 p-8 rounded-xl shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-lg flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleGithubLogin} className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black font-semibold text-sm h-11 rounded hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <GithubIcon className="w-4 h-4" />
              )}
              {isLoading ? 'Connecting...' : 'Continue with GitHub'}
            </button>
          </form>

          {/* Quick Mock Login Bypass for Review */}
          {/* <div className="mt-4 flex justify-center">
            <Link
              href="/dashboard"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1"
            >
              Bypass OAuth & Enter Dashboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div> */}

          <div className="mt-8 border-t border-neutral-900 pt-6">
            <div className="flex gap-2 text-[11px] text-neutral-500 items-start">
              <Shield className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
              <span>
                ReviewPilot only requests repository read/write and webhook access. Your source code keys are encrypted and remain private.
              </span>
            </div>
          </div>
        </div>

        {/* Footer info link */}
        <div className="mt-8 text-center text-xs text-neutral-600">
          <Link href="/" className="hover:text-neutral-400 transition-colors">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

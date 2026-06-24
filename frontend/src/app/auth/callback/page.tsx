'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      localStorage.setItem('reviewpilot_token', token);
      // Let the AuthContext detect the updated local storage token and redirect
      window.location.href = '/dashboard';
    } else {
      console.error('OAuth callback failed: token query parameter not found.');
      router.push('/login?error=token_missing');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-neutral-400 font-medium">Securing session connection...</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

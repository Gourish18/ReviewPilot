'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  GitPullRequest, 
  ShieldAlert, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  Calendar,
  Tag,
  Info,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/config';

interface ReviewDetail {
  id: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  commitSha: string | null;
  status: 'pending' | 'completed' | 'failed';
  triageCategory: string | null;
  securityFindings: string[];
  logicFindings: string[];
  markdownReport: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const reviewId = params.id as string;

  // Fetch single review detail by ID
  const { 
    data: review, 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useQuery<ReviewDetail>({
    queryKey: ['review_detail', reviewId, token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/reviews/${reviewId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Review report not found or you do not have permission to view it.');
        }
        throw new Error('Failed to retrieve the review details from the server.');
      }
      return res.json();
    },
    enabled: !!token && !!reviewId,
  });

  // Loading State (Skeleton UI)
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="w-28 h-4 bg-neutral-900 rounded animate-pulse" />
          <div className="w-40 h-8 bg-neutral-900 rounded animate-pulse" />
        </div>
        
        {/* Header Block Skeleton */}
        <div className="border border-neutral-900 bg-neutral-950 p-8 rounded-lg space-y-4">
          <div className="space-y-2">
            <div className="w-3/4 h-8 bg-neutral-900 rounded animate-pulse" />
            <div className="w-1/3 h-4 bg-neutral-900 rounded animate-pulse" />
          </div>
          <div className="h-px bg-neutral-900 pt-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="space-y-2">
              <div className="w-16 h-3 bg-neutral-900 rounded animate-pulse" />
              <div className="w-24 h-5 bg-neutral-900 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-16 h-3 bg-neutral-900 rounded animate-pulse" />
              <div className="w-24 h-5 bg-neutral-900 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="w-16 h-3 bg-neutral-900 rounded animate-pulse" />
              <div className="w-24 h-5 bg-neutral-900 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="h-40 bg-neutral-900 rounded-lg border border-neutral-900 animate-pulse" />
            <div className="h-40 bg-neutral-900 rounded-lg border border-neutral-900 animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-96 bg-neutral-900 rounded-lg border border-neutral-900 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error State
  if (isError || !review) {
    return (
      <div className="space-y-6">
        <Link 
          href="/dashboard/reviews"
          className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reviews
        </Link>

        <div className="border border-red-950 bg-red-950/15 p-8 rounded-lg flex flex-col items-center text-center max-w-2xl mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Failed to Load Report</h3>
            <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
              {error?.message || 'An error occurred while fetching the review. Please ensure you own the repository and try again.'}
            </p>
          </div>
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => refetch()}
              className="border border-neutral-800 bg-black hover:bg-neutral-900 text-white text-xs px-4 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Retry Fetch
            </button>
            <Link
              href="/dashboard/reviews"
              className="bg-white text-black font-semibold text-xs px-4 py-2 rounded hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Back to Reviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Status Style Resolver
  const getStatusBadgeStyles = (status: 'pending' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return 'text-emerald-500 bg-emerald-950/10 border-emerald-950/80';
      case 'pending':
        return 'text-amber-500 bg-amber-950/10 border-amber-950/80 animate-pulse';
      case 'failed':
        return 'text-red-500 bg-red-950/10 border-red-950/80';
    }
  };

  return (
    <div className="space-y-10">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link 
          href="/dashboard/reviews"
          className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Reviews
        </Link>

        {review.repositoryOwner && review.repositoryName && (
          <a 
            href={`https://github.com/${review.repositoryOwner}/${review.repositoryName}/pull/${review.prNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white text-xs px-3.5 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            View Pull Request on GitHub <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Audit Summary Header Card */}
      <div className="border border-neutral-900 bg-neutral-950 p-8 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-semibold text-white tracking-tight leading-tight">
                {review.prTitle}
              </span>
              <span className="text-xs font-mono text-neutral-500 shrink-0">
                #{review.prNumber}
              </span>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-neutral-300">{review.repositoryFullName}</span>
              {review.commitSha && (
                <>
                  <span>•</span>
                  <span>Commit: <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-300 font-mono">{review.commitSha.substring(0, 7)}</code></span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className={`text-[10px] uppercase font-bold tracking-wide px-2.5 py-1 rounded border ${getStatusBadgeStyles(review.status)}`}>
              {review.status}
            </span>
          </div>
        </div>

        {/* Tabular Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-neutral-900 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Triage Category</span>
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Tag className="w-4 h-4 text-neutral-400" />
              <span className="uppercase tracking-wider">{review.triageCategory || 'General'}</span>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Audit Executed</span>
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>{new Date(review.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Code Analysis</span>
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <GitPullRequest className="w-4 h-4 text-neutral-400" />
              <span>AI Multi-Agent Review</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Findings (Left) & Markdown Report (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Security and Logic Findings */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Security Findings Card */}
          <div className="border border-neutral-900 bg-neutral-950 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Security Risks
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${
                review.securityFindings.length > 0 ? 'bg-red-950 text-red-400' : 'bg-neutral-900 text-neutral-500'
              }`}>
                {review.securityFindings.length}
              </span>
            </div>
            
            {review.securityFindings.length > 0 ? (
              <ul className="space-y-3">
                {review.securityFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed border-l-2 border-red-900/60 pl-3 py-0.5">
                    {finding}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500 italic">No security findings detected.</p>
            )}
          </div>

          {/* Logic/Correctness Findings Card */}
          <div className="border border-neutral-900 bg-neutral-950 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Code Logic & Structure
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${
                review.logicFindings.length > 0 ? 'bg-amber-950 text-amber-400' : 'bg-neutral-900 text-neutral-500'
              }`}>
                {review.logicFindings.length}
              </span>
            </div>

            {review.logicFindings.length > 0 ? (
              <ul className="space-y-3">
                {review.logicFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed border-l-2 border-amber-900/60 pl-3 py-0.5">
                    {finding}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500 italic">No logic findings detected.</p>
            )}
          </div>

        </div>

        {/* Right Column: Full Markdown Report */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-neutral-900 bg-neutral-950 rounded-lg p-6 md:p-8 space-y-6">
            <div className="border-b border-neutral-900 pb-4 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Detailed AI Report
              </h3>
            </div>

            {review.markdownReport ? (
              <article className="prose prose-invert max-w-none prose-xs sm:prose-sm prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-white prose-code:bg-neutral-900 prose-code:px-1 prose-code:rounded prose-pre:bg-black/50 prose-pre:border prose-pre:border-neutral-900">
                <ReactMarkdown>{review.markdownReport}</ReactMarkdown>
              </article>
            ) : (
              <div className="text-center py-12 text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
                <Info className="w-6 h-6 text-neutral-600" />
                <span>No compiled markdown report content found.</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

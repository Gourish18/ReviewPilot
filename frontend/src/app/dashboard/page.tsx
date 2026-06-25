'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitPullRequest,
  Layers,
  ShieldAlert,
  Plus,
  ToggleRight,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/config';

interface ReviewItem {
  id: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  triageCategory: string | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// Helper to format timestamps to a friendly relative string
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function DashboardOverview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch connected repositories from database
  const {
    data: reposData,
    isLoading: isLoadingRepos,
    isError: isReposError
  } = useQuery<{ repositories: any[]; pagination: any }>({
    queryKey: ['connected_repos', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/repositories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load connected repositories.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const allRepos = reposData?.repositories || [];
  const repositories = allRepos.filter((repo: any) => repo.isConnected === true);

  // 2. Fetch recent reviews from database
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    isError: isReviewsError,
    refetch: refetchReviews,
    isFetching: isFetchingReviews
  } = useQuery<{ reviews: ReviewItem[]; pagination: any }>({
    queryKey: ['recent_reviews', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/reviews?page=1&limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load recent reviews.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const reviews = reviewsData?.reviews || [];
  const totalReviewsRun = reviewsData?.pagination?.total || 0;

  // 3. Disconnect repository mutation
  const disconnectMutation = useMutation({
    mutationFn: async (githubRepoId: number) => {
      const res = await fetch(`${API_URL}/api/repositories/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ github_id: githubRepoId }),
      });
      if (!res.ok) {
        throw new Error('Failed to disconnect repository.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected_repos'] });
      queryClient.invalidateQueries({ queryKey: ['github_repos'] });
    },
  });

  return (
    <div className="space-y-10">
      {/* Title & Action Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor connected repositories and view AI agent pull request feedback logs.</p>
        </div>
        <Link
          href="/dashboard/repos"
          className="bg-white text-black font-semibold text-xs px-3.5 py-2 rounded hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Repository
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Connected Repositories */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Connected Repos</span>
            <Layers className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {isLoadingRepos ? '...' : repositories.length}
            </span>
            <span className="text-[10px] text-neutral-500">active configurations</span>
          </div>
        </div>

        {/* Metric 2: Reviews Run */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Reviews Run</span>
            <Clock className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {isLoadingReviews ? '...' : totalReviewsRun}
            </span>
            <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> active audits
            </span>
          </div>
        </div>

        {/* Metric 3: Avg Quality Score */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Quality Score</span>
            <Sparkles className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">90.5</span>
            <span className="text-[10px] text-neutral-500">grade A (outstanding)</span>
          </div>
        </div>

        {/* Metric 4: Security Alerts */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Security Alerts</span>
            <ShieldAlert className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-red-500">0</span>
            <span className="text-[10px] text-neutral-500">clean codebase</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Repos & Recent reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Repository Switcher */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-neutral-900 bg-neutral-950 rounded-lg overflow-hidden">
            <div className="border-b border-neutral-900 px-6 py-4 bg-neutral-950/80">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Monitored Repositories</h2>
            </div>

            <div className="divide-y divide-neutral-900">
              {isLoadingRepos ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between animate-pulse">
                    <div className="space-y-2 w-2/3">
                      <div className="h-3.5 bg-neutral-900 rounded" />
                      <div className="h-2.5 bg-neutral-900 rounded w-1/2" />
                    </div>
                    <div className="h-6 bg-neutral-900 rounded w-12" />
                  </div>
                ))
              ) : isReposError ? (
                <div className="p-6 text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Failed to load configurations
                </div>
              ) : repositories.length > 0 ? (
                repositories.map(repo => (
                  <div key={repo.id} className="p-6 flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {repo.owner}/{repo.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5">
                        AI reviews active
                      </span>
                    </div>
                    <button
                      onClick={() => disconnectMutation.mutate(repo.githubRepoId)}
                      disabled={disconnectMutation.isPending}
                      className="text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ToggleRight className="w-8 h-8 text-white" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500 leading-normal">
                  <p>No active repositories linked.</p>
                  <Link href="/dashboard/repos" className="text-white hover:underline mt-2 inline-block">
                    Link repository →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pull Request Review Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-neutral-900 bg-neutral-950 rounded-lg overflow-hidden">
            <div className="border-b border-neutral-900 px-6 py-4 bg-neutral-950/80 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Recent Pull Request Audits</h2>
              <button
                onClick={() => refetchReviews()}
                disabled={isLoadingReviews || isFetchingReviews}
                className="text-[10px] text-neutral-500 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isFetchingReviews ? 'animate-spin' : ''}`} />
                Sync feed
              </button>
            </div>

            <div className="divide-y divide-neutral-900">
              {isLoadingReviews ? (
                // Skeleton Loader
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                    <div className="flex items-start gap-3.5 w-full max-w-lg">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="h-3.5 bg-neutral-900 rounded w-2/3" />
                        <div className="h-2.5 bg-neutral-900 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-8 bg-neutral-900 rounded w-20 shrink-0" />
                  </div>
                ))
              ) : isReviewsError ? (
                <div className="p-8 text-center text-xs text-red-400 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Failed to load review feed
                </div>
              ) : reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-950/30 transition-colors">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-neutral-800 flex-shrink-0 bg-neutral-900 flex items-center justify-center">
                        <GitPullRequest className={`w-4.5 h-4.5 ${review.status === 'completed'
                          ? 'text-emerald-500'
                          : review.status === 'pending'
                            ? 'text-amber-500 animate-pulse'
                            : 'text-red-500'
                          }`} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-white truncate">
                            {review.prTitle}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                            #{review.prNumber}
                          </span>
                          {review.triageCategory && (
                            <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-1.5 py-0.2 rounded uppercase tracking-wider font-semibold">
                              {review.triageCategory}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-1">
                          <span>{review.repositoryOwner}/{review.repositoryName}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t border-neutral-900 sm:border-0 pt-3 sm:pt-0">
                      {/* Status Badge */}
                      <div className="flex flex-col items-start sm:items-end">
                        <span className={`text-[10px] uppercase font-bold tracking-wide ${review.status === 'completed'
                          ? 'text-emerald-500'
                          : review.status === 'pending'
                            ? 'text-amber-500'
                            : 'text-red-500'
                          }`}>
                          {review.status}
                        </span>
                      </div>

                      {/* View Report Link */}
                      {review.status === 'completed' ? (
                        <Link
                          href={`/dashboard/reviews/${review.id}`}
                          className="border border-neutral-800 bg-black hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          Report <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <div className="w-[78px] h-8 flex items-center justify-center text-[10px] text-neutral-600 font-mono">
                          {review.status === 'pending' ? 'processing' : 'aborted'}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-xs text-neutral-500 leading-normal">
                  <p>No reviews yet.</p>
                  <p className="text-neutral-600 mt-1">Reviews will appear after ReviewPilot analyzes a Pull Request.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

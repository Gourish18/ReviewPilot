'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitPullRequest,
  Layers,
  ShieldAlert,
  Plus,
  ChevronRight,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/config';

interface DashboardData {
  overview: {
    repositoriesTotal: number;
    repositoriesConnected: number;
    reviewsCompleted: number;
    reviewsPending: number;
    reviewsFailed: number;
    averageQualityScore: number;
    securityAlerts: number;
  };
  reviewTrend: Array<{ date: string; count: number; avgScore: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  repositoryBreakdown: Array<{ name: string; count: number; avgScore: number }>;
  recentActivity: Array<{
    type: 'repo_connected' | 'review_completed' | 'review_failed' | 'review_pending';
    repoName: string;
    timestamp: string;
    details?: string;
    score?: number;
  }>;
  latestReviews: Array<{
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
  }>;
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

// Map average quality score to a letter grade and descriptive label
const getGrade = (score: number) => {
  if (score >= 90) return { letter: 'A', label: 'outstanding' };
  if (score >= 80) return { letter: 'B', label: 'very good' };
  if (score >= 70) return { letter: 'C', label: 'needs polish' };
  return { letter: 'F', label: 'critical attention' };
};

// Map security alert count to warning style classes and text labels
const getSecurityStatus = (count: number) => {
  if (count === 0) return { text: 'clean codebase', color: 'text-neutral-500' };
  if (count <= 2) return { text: 'minor warnings', color: 'text-amber-500' };
  return { text: 'vulnerabilities detected', color: 'text-red-500 animate-pulse' };
};

// Get visual CSS gradients for the triage categories
const getCategoryGradient = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'frontend':
      return 'bg-gradient-to-r from-pink-500 to-rose-500';
    case 'backend':
      return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    case 'security':
      return 'bg-gradient-to-r from-red-500 to-orange-500';
    case 'infrastructure':
      return 'bg-gradient-to-r from-purple-500 to-violet-500';
    default:
      return 'bg-gradient-to-r from-neutral-500 to-neutral-300';
  }
};

export default function DashboardOverview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch all dynamic dashboard metrics and activity in a single, optimized request
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery<DashboardData>({
    queryKey: ['dashboard_data', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load live dashboard statistics.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  // 2. Disconnect repository mutation (remains active for monitored repo switch card)
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
      queryClient.invalidateQueries({ queryKey: ['dashboard_data'] });
    },
  });

  // Loading skeleton state matching high-fidelity dark-theme dashboard
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-48 h-8 bg-neutral-900 rounded animate-pulse" />
            <div className="w-80 h-4 bg-neutral-900 rounded animate-pulse" />
          </div>
          <div className="w-36 h-9 bg-neutral-900 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-neutral-950 border border-neutral-900 rounded-lg p-6 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-neutral-950 border border-neutral-900 rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-96 bg-neutral-950 border border-neutral-900 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Error boundary layout
  if (isError || !data) {
    return (
      <div className="border border-red-950 bg-red-950/15 p-8 rounded-lg flex flex-col items-center text-center max-w-2xl mx-auto space-y-4 my-12">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">Dashboard Ingestion Failed</h3>
          <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
            {error?.message || 'Unable to retrieve real-time statistics. Please verify the backend database connection.'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="border border-neutral-800 bg-black hover:bg-neutral-900 text-white text-xs px-4 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Retry Connection
        </button>
      </div>
    );
  }

  const { overview, categoryBreakdown, repositoryBreakdown, recentActivity, latestReviews } = data;
  const gradeInfo = getGrade(overview.averageQualityScore);
  const securityStatus = getSecurityStatus(overview.securityAlerts);
  const totalReviews = overview.reviewsCompleted + overview.reviewsPending + overview.reviewsFailed;

  // Resolve timeline icon representation for activities
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'repo_connected':
        return (
          <div className="w-[18px] h-[18px] rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center">
            <Plus className="w-2.5 h-2.5 text-emerald-400" />
          </div>
        );
      case 'review_completed':
        return (
          <div className="w-[18px] h-[18px] rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center">
            <CheckCircle className="w-2.5 h-2.5 text-blue-400" />
          </div>
        );
      case 'review_failed':
        return (
          <div className="w-[18px] h-[18px] rounded-full bg-red-950 border border-red-800 flex items-center justify-center">
            <XCircle className="w-2.5 h-2.5 text-red-400" />
          </div>
        );
      case 'review_pending':
        return (
          <div className="w-[18px] h-[18px] rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center animate-pulse">
            <Clock className="w-2.5 h-2.5 text-amber-400" />
          </div>
        );
      default:
        return (
          <div className="w-[18px] h-[18px] rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Activity className="w-2.5 h-2.5 text-neutral-400" />
          </div>
        );
    }
  };

  // Resolve narrative descriptions for activities
  const getActivityText = (activity: any) => {
    const repoName = activity.repoName;
    switch (activity.type) {
      case 'repo_connected':
        return (
          <span>
            Connected repository <span className="font-semibold text-white">{repoName}</span>
          </span>
        );
      case 'review_completed':
        return (
          <span>
            AI audit completed for <span className="font-semibold text-white">{repoName}</span>: <span className="italic text-neutral-300">{activity.details}</span> (Score: <span className="font-bold text-emerald-400">{activity.score}</span>)
          </span>
        );
      case 'review_failed':
        return (
          <span>
            AI audit <span className="font-semibold text-red-400">failed</span> for <span className="font-semibold text-white">{repoName}</span>: <span className="text-neutral-500">{activity.details}</span>
          </span>
        );
      case 'review_pending':
        return (
          <span>
            AI audit <span className="font-semibold text-amber-400 animate-pulse">started</span> for <span className="font-semibold text-white">{repoName}</span>: <span className="text-neutral-400">{activity.details}</span>
          </span>
        );
      default:
        return <span>System activity on {repoName}</span>;
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white font-sans">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor connected codebases and view live automated PR review metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Sync Dashboard"
            className="border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white p-2 rounded transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dashboard/repos"
            className="bg-white text-black font-semibold text-xs px-3.5 py-2 rounded hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Repository
          </Link>
        </div>
      </div>

      {/* Metrics Row (SaaS Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Repositories Linked */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Connected Repos</span>
            <Layers className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {overview.repositoriesConnected}
            </span>
            <span className="text-xs text-neutral-500">
              / {overview.repositoriesTotal} synced
            </span>
          </div>
        </div>

        {/* Metric 2: Reviews Ingested */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Reviews Run</span>
            <GitPullRequest className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {totalReviews}
            </span>
            <span className="text-[10px] text-neutral-500">
              ({overview.reviewsCompleted} ok, {overview.reviewsPending} pending, {overview.reviewsFailed} failed)
            </span>
          </div>
        </div>

        {/* Metric 3: Average Quality Score */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Quality Score</span>
            <Sparkles className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {overview.averageQualityScore}
            </span>
            <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 font-semibold">
              <TrendingUp className="w-3 h-3 shrink-0" /> Grade {gradeInfo.letter} ({gradeInfo.label})
            </span>
          </div>
        </div>

        {/* Metric 4: Security Alerts */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Security Alerts</span>
            <ShieldAlert className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold ${overview.securityAlerts > 0 ? 'text-red-500' : 'text-white'}`}>
              {overview.securityAlerts}
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-wide ${securityStatus.color}`}>
              {securityStatus.text}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row (Category Breakdown and Repository Statistics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown Progress Bar list */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-6">
          <div className="border-b border-neutral-900 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Triage Classification Distribution</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Automated Multi-Agent triage classifications across completed reviews.</p>
          </div>

          <div className="space-y-4">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((item) => {
                const totalCategoryReviews = categoryBreakdown.reduce((sum, c) => sum + c.count, 0);
                const pct = totalCategoryReviews > 0 ? Math.round((item.count / totalCategoryReviews) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold text-neutral-400">
                      <span className="capitalize tracking-wide">{item.category}</span>
                      <span>{item.count} reviews ({pct}%)</span>
                    </div>
                    <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getCategoryGradient(item.category)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-neutral-500 italic py-4 text-center">No classified completed audits to display.</p>
            )}
          </div>
        </div>

        {/* Repository breakdown list */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-6">
          <div className="border-b border-neutral-900 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Repository Performance Summary</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Average AI quality scores tracked across your codebase projects.</p>
          </div>

          <div className="divide-y divide-neutral-900">
            {repositoryBreakdown.length > 0 ? (
              repositoryBreakdown.map((repo) => (
                <div key={repo.name} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300 truncate max-w-[240px]">
                    {repo.name}
                  </span>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[10px] text-neutral-500">{repo.count} reviews</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      repo.avgScore >= 90
                        ? 'text-emerald-500 bg-emerald-950/10 border-emerald-950/80'
                        : repo.avgScore >= 75
                        ? 'text-amber-500 bg-amber-950/10 border-amber-950/80'
                        : 'text-red-500 bg-red-950/10 border-red-950/80'
                    }`}>
                      Score: {repo.avgScore}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic py-4 text-center">No repository reviews recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Activity Timeline and Pull Request Review Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity Timeline */}
        <div className="lg:col-span-1 border border-neutral-900 bg-neutral-950 rounded-lg p-6 space-y-6">
          <div className="border-b border-neutral-900 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Live Activity Feed</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Real-time repository connections and webhook pipeline events.</p>
          </div>

          <div className="pt-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="relative pl-6 pb-6 last:pb-0">
                  {/* Vertical connector line */}
                  {index < recentActivity.length - 1 && (
                    <div className="absolute left-[8.5px] top-4 bottom-0 w-px bg-neutral-900" />
                  )}
                  {/* Activity Indicator icon */}
                  <div className="absolute left-0 top-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-neutral-300 leading-relaxed">
                      {getActivityText(activity)}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 italic text-center py-8">No recent actions recorded on the system.</p>
            )}
          </div>
        </div>

        {/* Right Column: Pull Request Review Feed */}
        <div className="lg:col-span-2 border border-neutral-900 bg-neutral-950 rounded-lg overflow-hidden flex flex-col">
          <div className="border-b border-neutral-900 px-6 py-4 bg-neutral-950/80">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Recent Pull Request Audits</h2>
          </div>

          <div className="divide-y divide-neutral-900 flex-1">
            {latestReviews.length > 0 ? (
              latestReviews.map((review) => (
                <div key={review.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-950/30 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-8 h-8 rounded-full border border-neutral-800 flex-shrink-0 bg-neutral-900 flex items-center justify-center">
                      <GitPullRequest className={`w-4.5 h-4.5 ${
                        review.status === 'completed'
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
                    <div className="flex flex-col items-start sm:items-end">
                      <span className={`text-[10px] uppercase font-bold tracking-wide ${
                        review.status === 'completed'
                          ? 'text-emerald-500'
                          : review.status === 'pending'
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}>
                        {review.status}
                      </span>
                    </div>

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
              <div className="p-12 text-center text-xs text-neutral-500 leading-normal flex flex-col items-center justify-center gap-2 flex-1">
                <p className="font-semibold text-neutral-400">No reviews run yet.</p>
                <p className="text-neutral-600 mt-1">Reviews will appear here dynamically once a webhook triggers analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

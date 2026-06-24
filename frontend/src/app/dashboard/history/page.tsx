'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

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

export default function HistoryPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [filterQuery, setFilterQuery] = useState('');
  const limit = 10;

  // 1. Fetch paginated review history from backend
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery<{ reviews: ReviewItem[]; pagination: any }>({
    queryKey: ['reviews_history', token, page],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/reviews?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch review history from the server.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const reviews = data?.reviews || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // 2. Perform client-side filter on search query
  const filteredLogs = reviews.filter(log =>
    log.prTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
    log.repositoryFullName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Title & Action Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Review History</h1>
          <p className="text-sm text-neutral-500 mt-1">Audit log of all AI review graph executions across your repositories.</p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white text-xs px-3.5 py-2 rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Filter logs by repository or PR title..."
          value={filterQuery}
          onChange={(e) => {
            setFilterQuery(e.target.value);
            setPage(1); // Reset page on filter
          }}
          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
        />
      </div>

      {/* Error State */}
      {isError && (
        <div className="border border-red-950 bg-red-950/20 p-6 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Query Error</h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {error?.message || 'An error occurred while loading your review history. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Logs Table Card */}
      <div className="border border-neutral-900 bg-neutral-950 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-900 bg-neutral-950 text-neutral-500 font-medium">
                <th className="p-4 uppercase tracking-wider">Repository</th>
                <th className="p-4 uppercase tracking-wider">PR Title</th>
                <th className="p-4 uppercase tracking-wider">Status</th>
                <th className="p-4 uppercase tracking-wider">Triage Category</th>
                <th className="p-4 uppercase tracking-wider">Created At</th>
                <th className="p-4 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="p-4"><div className="h-3.5 bg-neutral-900 rounded w-24" /></td>
                    <td className="p-4"><div className="h-3.5 bg-neutral-900 rounded w-48" /></td>
                    <td className="p-4"><div className="h-6 bg-neutral-900 rounded w-16" /></td>
                    <td className="p-4"><div className="h-6 bg-neutral-900 rounded w-16" /></td>
                    <td className="p-4"><div className="h-3.5 bg-neutral-900 rounded w-24" /></td>
                    <td className="p-4 text-right"><div className="h-6 bg-neutral-900 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-950/40 transition-colors text-neutral-300">
                    {/* Repository */}
                    <td className="p-4 font-semibold text-neutral-400">
                      {log.repositoryFullName}
                    </td>
                    
                    {/* PR Title */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{log.prTitle}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">#{log.prNumber}</span>
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="p-4">
                      <span className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded border ${
                        log.status === 'completed' 
                          ? 'text-emerald-500 bg-emerald-950/10 border-emerald-950' 
                          : log.status === 'pending'
                          ? 'text-amber-500 bg-amber-950/10 border-amber-950 animate-pulse'
                          : 'text-red-500 bg-red-950/10 border-red-950'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    {/* Triage Category */}
                    <td className="p-4">
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                        log.triageCategory === 'security'
                          ? 'text-red-400 bg-red-950/10 border-red-950'
                          : log.triageCategory === 'backend'
                          ? 'text-blue-400 bg-blue-950/10 border-blue-950'
                          : log.triageCategory === 'frontend'
                          ? 'text-pink-400 bg-pink-950/10 border-pink-950'
                          : log.triageCategory === 'infrastructure'
                          ? 'text-purple-400 bg-purple-950/10 border-purple-950'
                          : 'text-neutral-400 bg-neutral-950 border-neutral-900'
                      }`}>
                        {log.triageCategory || 'general'}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="p-4 text-neutral-500 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      {log.status === 'completed' ? (
                        <Link
                          href={`/dashboard/pr/${log.id}`}
                          className="border border-neutral-800 bg-black hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 text-xs px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Report <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-neutral-600 font-mono text-[10px]">
                          {log.status === 'pending' ? 'processing' : 'aborted'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-neutral-500 font-mono">
                    No history logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-neutral-900">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1 || isLoading}
            className="border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-neutral-500 font-mono">
            Page {page} of {pagination.totalPages} (Total: {pagination.total})
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))}
            disabled={page >= pagination.totalPages || isLoading}
            className="border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

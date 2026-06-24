'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Search, Check, Plus, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface GitHubRepo {
  id: string | null;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  isConnected: boolean;
  language: string | null;
  private: boolean;
}

export default function RepositoriesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch repositories from backend
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery<{ repositories: GitHubRepo[]; pagination: any }>({
    queryKey: ['github_repos', token],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/repositories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to fetch repositories from the server.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const repos = data?.repositories || [];

  // 2. Connect repository mutation
  const connectMutation = useMutation({
    mutationFn: async (repo: { githubRepoId: number; owner: string; name: string }) => {
      const res = await fetch('http://localhost:8000/api/repositories/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ github_id: repo.githubRepoId }),
      });
      if (!res.ok) {
        throw new Error('Failed to connect repository.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github_repos'] });
    },
  });

  // 3. Disconnect repository mutation
  const disconnectMutation = useMutation({
    mutationFn: async (githubRepoId: number) => {
      const res = await fetch('http://localhost:8000/api/repositories/disconnect', {
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
      queryClient.invalidateQueries({ queryKey: ['github_repos'] });
    },
  });

  // 4. Sync repositories mutation using POST /api/repositories/sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8000/api/repositories/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to synchronize repositories.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['github_repos'] });
    },
  });

  const handleRefresh = () => {
    syncMutation.mutate();
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isWorking = isFetching || syncMutation.isPending || connectMutation.isPending || disconnectMutation.isPending;

  return (
    <div className="space-y-10">
      {/* Title Block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Repositories</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage connected GitHub repositories and configure webhook events.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isWorking}
          className="border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white text-xs px-3.5 py-2 rounded transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
          {isWorking ? 'Syncing...' : 'Sync GitHub Repos'}
        </button>
      </div>

      {/* GitHub App banner */}
      <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-800">
          <ShieldCheck className="w-4.5 h-4.5 text-neutral-300" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">GitHub App Integration</h2>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            ReviewPilot connects securely via our official GitHub App. Webhooks will trigger review runs automatically when you open, update, or synchronize any Pull Request.
          </p>
          <div className="mt-3">
            <a
              href="https://github.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-neutral-300 hover:text-white transition-colors underline"
            >
              Configure GitHub permissions →
            </a>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-900 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
        />
      </div>

      {/* Error State */}
      {(isError || syncMutation.isError) && (
        <div className="border border-red-950 bg-red-950/20 p-6 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Sync Error</h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              {error?.message || syncMutation.error?.message || 'An error occurred while loading your GitHub repositories. Please verify your connection status and try again.'}
            </p>
          </div>
        </div>
      )}

      {/* Repositories Grid List */}
      <div className="border border-neutral-900 bg-neutral-950 rounded-lg overflow-hidden divide-y divide-neutral-900">
        {isLoading ? (
          // Skeleton Loading state
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
              <div className="space-y-3 w-full max-w-xl">
                <div className="flex items-center gap-2.5">
                  <div className="h-4 bg-neutral-900 rounded w-1/3" />
                  <div className="h-3 bg-neutral-900 rounded w-12" />
                </div>
                <div className="h-3 bg-neutral-900 rounded w-3/4" />
              </div>
              <div className="h-8 bg-neutral-900 rounded w-24 shrink-0" />
            </div>
          ))
        ) : filteredRepos.length > 0 ? (
          filteredRepos.map(repo => (
            <div key={repo.githubRepoId} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-neutral-200">
                    {repo.fullName}
                  </span>
                  <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
                    {repo.language || 'N/A'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-normal">
                  {repo.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {repo.isConnected ? (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 border border-emerald-950/60 bg-emerald-950/20 px-2.5 py-1 rounded-full">
                      <Check className="w-3 h-3" />
                      <span>Review Active</span>
                    </div>
                    <button
                      onClick={() => disconnectMutation.mutate(repo.githubRepoId)}
                      disabled={isWorking}
                      className="border border-neutral-900 bg-black hover:bg-neutral-900 text-neutral-400 hover:text-red-400 text-xs px-3 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => connectMutation.mutate({
                      githubRepoId: repo.githubRepoId,
                      owner: repo.owner,
                      name: repo.name
                    })}
                    disabled={isWorking}
                    className="bg-white text-black font-semibold text-xs px-3.5 py-1.5 rounded hover:bg-neutral-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Connect Repo
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-neutral-500 font-mono">
            No repositories match your search query.
          </div>
        )}
      </div>
    </div>
  );
}

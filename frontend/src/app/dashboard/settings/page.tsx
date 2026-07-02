'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { API_URL } from '@/config';
import { 
  Settings, 
  Save, 
  Sparkles, 
  Key, 
  Bell, 
  ShieldAlert, 
  Check, 
  Loader2,
  Sliders,
  Eye,
  GitBranch
} from 'lucide-react';

interface UserSettingsData {
  preferredLLMProvider: 'gemini' | 'openai' | 'anthropic' | 'local';
  preferredModel: string;
  temperature: number;
  maxTokens: number;
  reviewDepth: 'shallow' | 'standard' | 'deep';
  enableSecurityReview: boolean;
  enableLogicReview: boolean;
  enableArchitectureReview: boolean;
  enablePerformanceReview: boolean;
  enableComments: boolean;
  enableSummary: boolean;
  notificationPreferences: {
    email: boolean;
    slack: boolean;
  };
  defaultRepositoryBehavior: 'opt-in' | 'opt-out';
}

export default function SettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // 1. Load settings from backend via GET /api/settings
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<{ success: boolean; settings: UserSettingsData }>({
    queryKey: ['user_settings', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load settings from server.');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const settings = data?.settings;

  // 2. Save settings mutation via PUT /api/settings
  const saveMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<UserSettingsData>) => {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) {
        throw new Error('Failed to save settings.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_settings'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;

    const formData = new FormData(e.currentTarget);
    
    const payload: Partial<UserSettingsData> = {
      preferredLLMProvider: formData.get('preferredLLMProvider') as any,
      preferredModel: formData.get('preferredModel') as string,
      temperature: parseFloat(formData.get('temperature') as string),
      maxTokens: parseInt(formData.get('maxTokens') as string, 10),
      reviewDepth: formData.get('reviewDepth') as any,
      enableSecurityReview: formData.get('enableSecurityReview') === 'on',
      enableLogicReview: formData.get('enableLogicReview') === 'on',
      enableArchitectureReview: formData.get('enableArchitectureReview') === 'on',
      enablePerformanceReview: formData.get('enablePerformanceReview') === 'on',
      enableComments: formData.get('enableComments') === 'on',
      enableSummary: formData.get('enableSummary') === 'on',
      notificationPreferences: {
        email: formData.get('notifyEmail') === 'on',
        slack: formData.get('notifySlack') === 'on',
      },
      defaultRepositoryBehavior: formData.get('defaultRepositoryBehavior') as any,
    };

    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
        <span className="text-xs text-neutral-500 font-mono">Fetching settings profile...</span>
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="border border-red-950 bg-red-950/20 p-6 rounded-lg flex items-start gap-3 max-w-2xl">
        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Settings Sync Failed</h3>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {error?.message || 'Unable to retrieve settings. Verify backend status and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure your review preferences, agent orchestration, and notifications.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl pb-16">
        {/* Module 1: AI Model Preferences */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Sparkles className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">AI Model & Strategy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">LLM Provider</label>
              <select
                name="preferredLLMProvider"
                defaultValue={settings.preferredLLMProvider}
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="openai">OpenAI ChatGPT</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="local">Local LLM (Ollama/LM Studio)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Model Choice</label>
              <input
                type="text"
                name="preferredModel"
                defaultValue={settings.preferredModel}
                placeholder="e.g. gemini-2.5-flash"
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Temperature (Creativity)</label>
              <input
                type="range"
                name="temperature"
                min="0.0"
                max="1.0"
                step="0.05"
                defaultValue={settings.temperature}
                className="w-full accent-white cursor-pointer bg-neutral-900 border border-neutral-800 rounded h-8 px-2"
                onChange={(e) => {
                  const valSpan = document.getElementById('temp-val-display');
                  if (valSpan) valSpan.textContent = e.target.value;
                }}
              />
              <p className="text-[10px] text-neutral-500">
                Current Value: <span id="temp-val-display" className="font-mono text-neutral-300">{settings.temperature}</span> (Lower is more deterministic).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Max Output Tokens</label>
              <input
                type="number"
                name="maxTokens"
                defaultValue={settings.maxTokens}
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Review Depth</label>
            <select
              name="reviewDepth"
              defaultValue={settings.reviewDepth}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
            >
              <option value="shallow">Shallow (Fast reviews, highlights major problems only)</option>
              <option value="standard">Standard (Balanced reviews, ideal for PR pipelines)</option>
              <option value="deep">Deep (Detailed review, evaluates architecture and edge cases)</option>
            </select>
          </div>
        </div>

        {/* Module 2: Code Review Features & Scopes */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Sliders className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Active Review Scopes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enableSecurityReview"
                defaultChecked={settings.enableSecurityReview}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Security Auditing</span>
                <span className="text-[10px] text-neutral-500">Scan code changes for injection, leaks, XSS, and authorization flaws.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enableLogicReview"
                defaultChecked={settings.enableLogicReview}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Logic & Correctness</span>
                <span className="text-[10px] text-neutral-500">Evaluate conditions, boundary cases, async catchers, and resource leaks.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enableArchitectureReview"
                defaultChecked={settings.enableArchitectureReview}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Architectural Design</span>
                <span className="text-[10px] text-neutral-500">Check layering, abstractions, couplings, and style conventions.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enablePerformanceReview"
                defaultChecked={settings.enablePerformanceReview}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Performance & Efficiency</span>
                <span className="text-[10px] text-neutral-500">Detect computational bottlenecks, unnecessary render loops, memory issues.</span>
              </div>
            </label>
          </div>

          <div className="border-t border-neutral-900 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enableSummary"
                defaultChecked={settings.enableSummary}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Compile Markdown Reports</span>
                <span className="text-[10px] text-neutral-500">Enable automated compilation of findings into markdown summaries.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-neutral-900/40 transition-colors">
              <input
                type="checkbox"
                name="enableComments"
                defaultChecked={settings.enableComments}
                className="accent-white cursor-pointer mt-0.5"
              />
              <div>
                <span className="text-xs font-semibold text-neutral-200 block">Publish GitHub Comments</span>
                <span className="text-[10px] text-neutral-500">Automatically post review reports directly on GitHub PR timelines.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Module 3: Repository Connection Config */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <GitBranch className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Repository Integration Options</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Default Sync Connection Behavior</label>
            <select
              name="defaultRepositoryBehavior"
              defaultValue={settings.defaultRepositoryBehavior}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
            >
              <option value="opt-in">Manual Opt-in (Review repositories only when Connected manually)</option>
              <option value="opt-out">Auto Opt-out (Sync and connect all discovered repositories by default)</option>
            </select>
          </div>
        </div>

        {/* Module 4: Secrets Configuration */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Key className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Security Credentials</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Encrypted Webhook Secret</label>
            <div className="relative">
              <input
                type="password"
                value="••••••••••••••••••••••••••••••••"
                disabled
                className="w-full bg-neutral-900/30 border border-neutral-800/80 rounded p-2 pl-3 text-xs text-neutral-500 cursor-not-allowed font-mono"
              />
              <span className="absolute right-3.5 top-2.5 text-[9px] uppercase font-bold text-neutral-600 tracking-wider">Secure</span>
            </div>
            <p className="text-[10px] text-neutral-500">
              Assigned automatically. The secret is securely loaded on the backend environment and never exposed to the client UI.
            </p>
          </div>
        </div>

        {/* Module 5: Notifications */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Bell className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Notifications</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="notifyEmail"
                defaultChecked={settings.notificationPreferences.email}
                className="accent-white cursor-pointer"
              />
              <span className="text-xs text-neutral-300">Send email digests on completed code reviews</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="notifySlack"
                defaultChecked={settings.notificationPreferences.slack}
                className="accent-white cursor-pointer"
              />
              <span className="text-xs text-neutral-300">Deliver Slack alerts on failed reviews or webhook blocks</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-white text-black font-semibold text-xs px-4 py-2.5 rounded hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>

          {saveMutation.isSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Settings saved successfully.</span>
            </div>
          )}

          {saveMutation.isError && (
            <div className="text-xs text-red-400">
              Failed to save: {saveMutation.error?.message || 'Server error occurred.'}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

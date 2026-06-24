'use client';

import React, { useState } from 'react';
import { Settings, Save, Sparkles, Key, Bell, ShieldAlert, Check } from 'lucide-react';

export default function SettingsPage() {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [customInstructions, setCustomInstructions] = useState(
    '1. Focus on checking TypeScript safety and typing definitions.\n2. Ensure async functions catch promise rejections.\n3. Do not complain about spacing or style, let ESLint handle it.'
  );
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPR, setNotifyPR] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Configure your review preferences, agent orchestration, and notifications.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        {/* Module 1: AI Model Preferences */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Sparkles className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">AI Model & Strategy</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Model Choice</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neutral-600"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fastest, default)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deeper reasoning)</option>
            </select>
            <p className="text-[10px] text-neutral-500">
              Flash is recommended for inline code checks. Pro can be utilized for complex architectural reviews.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Custom Prompts & Rules</label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={4}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-neutral-600 leading-relaxed"
              placeholder="e.g. Run tests on changed files..."
            />
            <p className="text-[10px] text-neutral-500">
              These guidelines are appended to the system instructions of the Security and Code Quality agents.
            </p>
          </div>
        </div>

        {/* Module 2: Secrets Configuration */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Key className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Security Credentials</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Encrypted Webhook Secret</label>
            <input
              type="password"
              value="••••••••••••••••••••••••••••••••"
              disabled
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded p-2 text-xs text-neutral-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-neutral-500">
              Assigned automatically upon linking the ReviewPilot GitHub Application.
            </p>
          </div>
        </div>

        {/* Module 3: Notifications */}
        <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
            <Bell className="w-4.5 h-4.5 text-neutral-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">Notifications</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="accent-white cursor-pointer"
              />
              <span className="text-xs text-neutral-300">Email summaries when a PR review completes</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPR}
                onChange={(e) => setNotifyPR(e.target.checked)}
                className="accent-white cursor-pointer"
              />
              <span className="text-xs text-neutral-300">Post reviews directly to the GitHub PR Files tab</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="bg-white text-black font-semibold text-xs px-4 py-2.5 rounded hover:bg-neutral-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>

          {isSaved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Settings saved successfully.</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

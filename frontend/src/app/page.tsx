'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  GitPullRequest, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Terminal,
  Activity,
  Layers
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-black text-white selection:bg-neutral-800 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-900 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <span className="text-black font-black text-xs">R</span>
            </div>
            <span className="font-semibold tracking-tight text-neutral-200">ReviewPilot</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-400">
            <a href="#features" className="hover:text-neutral-100 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-neutral-100 transition-colors">How it works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-100 transition-colors flex items-center gap-1">
              Docs <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-white text-black text-xs font-semibold px-3 py-1.5 rounded hover:bg-neutral-200 transition-colors flex items-center gap-1"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 border-b border-neutral-900">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f11_1px,transparent_1px),linear-gradient(to_bottom,#0f0f11_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="relative max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-xs font-medium text-neutral-400 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            <span>Multi-Agent PR Review Workflows</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white max-w-3xl leading-tight sm:leading-none mb-6">
            AI PR reviews that feel like a senior developer.
          </h1>

          <p className="text-neutral-400 text-lg sm:text-xl max-w-2xl mb-10 font-normal leading-relaxed">
            ReviewPilot uses autonomous multi-agent LangGraph workflows to thoroughly review your pull requests for security flaws, code quality issues, and architecture logic.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white text-black font-semibold text-sm px-6 py-3 rounded hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-white/5"
            >
              Start Reviewing Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 text-sm px-6 py-3 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              See how it works
            </a>
          </div>

          {/* Interactive UI Mock/Preview Area - Handcrafted SVG & CSS representation to avoid placeholders */}
          <div className="mt-16 w-full max-w-4xl border border-neutral-800 bg-neutral-950 rounded-xl overflow-hidden shadow-2xl shadow-neutral-900/40">
            <div className="border-b border-neutral-900 px-4 py-3 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
                <div className="w-3 h-3 rounded-full bg-neutral-800" />
                <span className="text-xs text-neutral-500 font-mono ml-2">reviewpilot / graph-orchestrator / config.ts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-950/80 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded font-mono">
                  AGENT RUN ACTIVE
                </span>
              </div>
            </div>
            <div className="p-6 text-left font-mono text-xs sm:text-sm overflow-x-auto text-neutral-400 space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-neutral-600 select-none">24</span>
                <span className="text-neutral-200"><span className="text-neutral-500">export const</span> reviewWorkflow = <span className="text-neutral-500">new</span> LangGraphWorkflow(&#123;</span>
              </div>
              <div className="flex items-start gap-4">
                <span className="text-neutral-600 select-none">25</span>
                <span className="text-neutral-200">&nbsp;&nbsp;agents: [TriageAgent, SecurityAgent, QualityAgent],</span>
              </div>
              <div className="flex items-start gap-4 border-l-2 border-red-900 bg-red-950/20 py-1 pl-2">
                <span className="text-red-500 select-none">26</span>
                <span className="text-red-200">&nbsp;&nbsp;apiKey: process.env.GEMINI_API_KEY_SECURE, <span className="text-neutral-600">// DEPRECATED CONFIG</span></span>
              </div>
              <div className="flex items-start gap-4 bg-neutral-900/50 p-4 border border-neutral-800 rounded-lg my-2 font-sans text-sm">
                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">ReviewPilot Security Agent</span>
                    <span className="text-[10px] bg-red-950 border border-red-900 text-red-400 px-1.5 py-0.2 rounded font-mono">
                      WARNING
                    </span>
                  </div>
                  <p className="text-neutral-300 text-xs">
                    Hardcoded API Key parameter used. Environment keys should be loaded dynamically using the <code className="bg-neutral-800 text-neutral-200 px-1 rounded font-mono">config</code> singleton module to avoid configuration leakage.
                  </p>
                  <div className="mt-2 text-[11px] font-mono text-neutral-500">
                    Suggested replacement: <code className="text-neutral-200">apiKey: config.gemini.apiKey</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 border-b border-neutral-900">
        <div className="text-center mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Core Modules</h2>
          <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Supercharged agents, working in parallel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="border border-neutral-900 bg-neutral-950/50 p-8 rounded-lg hover:border-neutral-800 transition-colors">
            <div className="w-10 h-10 border border-neutral-800 rounded-lg flex items-center justify-center bg-black mb-6">
              <Layers className="w-5 h-5 text-neutral-300" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-2">LangGraph Workflows</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              We compile code reviews as a Graph of cooperating agents. The Triage agent routes tasks to dedicated security and quality agents for deep, contextual evaluation.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="border border-neutral-900 bg-neutral-950/50 p-8 rounded-lg hover:border-neutral-800 transition-colors">
            <div className="w-10 h-10 border border-neutral-800 rounded-lg flex items-center justify-center bg-black mb-6">
              <ShieldCheck className="w-5 h-5 text-neutral-300" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-2">Automated Security Audits</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Scan code instantly for exposed client secrets, bad cryptography, input parsing hazards, dependency alerts, and common OWASP injection vulnerabilities.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="border border-neutral-900 bg-neutral-950/50 p-8 rounded-lg hover:border-neutral-800 transition-colors">
            <div className="w-10 h-10 border border-neutral-800 rounded-lg flex items-center justify-center bg-black mb-6">
              <Zap className="w-5 h-5 text-neutral-300" />
            </div>
            <h3 className="font-semibold text-white text-lg mb-2">Powered by Gemini 2.5</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Leverage the 1M+ token window size of Gemini 2.5 Flash. Read entire project dependencies and files to ensure review logic remains fully context-aware.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-neutral-950/20 border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Workflow</h2>
            <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Integration in four simple steps.
            </p>
          </div>

          <div className="relative border-l border-neutral-900 pl-8 ml-4 space-y-12">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-12 top-0.5 w-8 h-8 rounded-full border border-neutral-800 bg-black flex items-center justify-center font-mono text-xs text-neutral-300">
                1
              </div>
              <h3 className="font-semibold text-white text-base mb-1">Connect GitHub</h3>
              <p className="text-neutral-400 text-sm max-w-xl">
                Log in via secure GitHub OAuth and link the repositories you want monitored. ReviewPilot configures repository webhooks automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-12 top-0.5 w-8 h-8 rounded-full border border-neutral-800 bg-black flex items-center justify-center font-mono text-xs text-neutral-300">
                2
              </div>
              <h3 className="font-semibold text-white text-base mb-1">Open a Pull Request</h3>
              <p className="text-neutral-400 text-sm max-w-xl">
                Write code, commit, and push. As soon as you open a PR or commit new code, the GitHub webhook immediately pushes a review request to our backend.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-12 top-0.5 w-8 h-8 rounded-full border border-neutral-800 bg-black flex items-center justify-center font-mono text-xs text-neutral-300">
                3
              </div>
              <h3 className="font-semibold text-white text-base mb-1">AI Agent Collaboration</h3>
              <p className="text-neutral-400 text-sm max-w-xl">
                The Express.js orchestration service coordinates LangGraph nodes. The models review your diffs, draft corrections, and score code quality.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-12 top-0.5 w-8 h-8 rounded-full border border-neutral-800 bg-black flex items-center justify-center font-mono text-xs text-neutral-300">
                4
              </div>
              <h3 className="font-semibold text-white text-base mb-1">Get Direct Code Feedback</h3>
              <p className="text-neutral-400 text-sm max-w-xl">
                ReviewPilot automatically publishes comments on correct lines inside the PR’s File Changes tab, or logs results inside your developer dashboard dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 max-w-5xl mx-auto px-6 text-center">
        <div className="border border-neutral-900 bg-neutral-950 p-12 rounded-2xl flex flex-col items-center relative overflow-hidden">
          {/* Subtle gradient glow in background */}
          <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-96 h-96 bg-neutral-900/50 blur-3xl rounded-full" />

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-4 relative z-10">
            Write better code. Save code review cycles.
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-md mb-8 relative z-10 leading-relaxed">
            Get instant code analysis, logic audits, and security feedback directly on your commits. Connect in under 2 minutes.
          </p>
          <Link
            href="/login"
            className="bg-white text-black font-semibold text-sm px-6 py-3 rounded hover:bg-neutral-200 transition-colors flex items-center gap-1.5 relative z-10"
          >
            Connect GitHub Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600 bg-black mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-neutral-900 flex items-center justify-center">
              <span className="text-white font-bold text-[8px]">R</span>
            </div>
            <span>ReviewPilot © 2026. Built for developer productivity.</span>
          </div>
          <div className="flex gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400 transition-colors">GitHub App</a>
            <a href="#" className="hover:text-neutral-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-neutral-400 transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

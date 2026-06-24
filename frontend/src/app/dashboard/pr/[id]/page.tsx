'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  GitPullRequest, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle,
  FileCode,
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface Comment {
  id: string;
  filePath: string;
  lineNumber: number;
  diffContext: string[];
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
}

export default function PRReportPage() {
  const params = useParams();
  const prId = params.id as string;

  // Mock data for the specific report
  const [report] = useState({
    id: prId,
    title: 'feat: add security scanner node to review graph',
    prNumber: 42,
    repoOwner: 'octocat',
    repoName: 'express-review-service',
    status: 'completed',
    score: 94,
    commitSha: '6d8c4fa03a5e128b9d3c',
    timeCompleted: '15 minutes ago',
    summary: 'This pull request introduces a new dedicated `SecurityAgent` node into the LangGraph orchestration flow. It scans for hardcoded secrets, dangerous commands, and general security flaws using structured schemas before passing state to the Aggregator. The code is highly modular, well-tested, and conforms to standard TypeScript schemas.',
    securitySummary: 'No critical exposed secrets detected. One minor warning flagged for local fallback logic.',
    qualitySummary: 'Excellent logical layout. Style is clean, functions are fully type hinted, and all dependencies are explicitly defined.',
  });

  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      filePath: 'src/agents/security.ts',
      lineNumber: 26,
      diffContext: [
        '24: export const scanSecrets = (diffContent: string) => {',
        '25:   // Scan for API keys',
        '26:   const apiKey = process.env.GEMINI_API_KEY_SECURE || "fallback_local_key";',
        '27:   if (!apiKey) return [];',
        '28: };'
      ],
      severity: 'warning',
      category: 'Security',
      message: 'Avoid defining inline fallback strings for credentials. Even if it is a local key, it should be fetched from configuration settings or standard environment loaders to prevent accidental commits of test secrets.',
      suggestion: 'const apiKey = config.gemini.apiKey ?? null;'
    },
    {
      id: 'c2',
      filePath: 'src/routes/health.routes.ts',
      lineNumber: 48,
      diffContext: [
        '46: router.get("/health", (_req, res) => {',
        '47:   const timestamp = Date.now();',
        '48:   res.json({ status: "healthy", timestamp });',
        '49: });'
      ],
      severity: 'info',
      category: 'Style',
      message: 'Consider defining typed response contracts for API endpoints rather than returning unstructured objects. This keeps the Express API clear and predictable.',
      suggestion: 'type HealthStatusResponse = { status: string; timestamp: number }'
    }
  ]);

  const getSeverityStyles = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return {
          bg: 'bg-red-950/20 border-red-900/60',
          text: 'text-red-400',
          badge: 'bg-red-950 border-red-900 text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/20 border-amber-900/60',
          text: 'text-amber-400',
          badge: 'bg-amber-950 border-amber-900 text-amber-400'
        };
      case 'info':
        return {
          bg: 'bg-neutral-900 border-neutral-800',
          text: 'text-neutral-300',
          badge: 'bg-neutral-900 border-neutral-800 text-neutral-400'
        };
    }
  };

  return (
    <div className="space-y-10">
      {/* Back link & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link 
          href="/dashboard"
          className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <a 
          href={`https://github.com/${report.repoOwner}/${report.repoName}/pull/${report.prNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white text-xs px-3.5 py-2 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          View Pull Request on GitHub <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Header Info Block */}
      <div className="border border-neutral-900 bg-neutral-950 p-8 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl font-semibold text-white tracking-tight">
                {report.title}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                #{report.prNumber}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {report.repoOwner}/{report.repoName} • Commit: <code className="bg-neutral-900 px-1 rounded">{report.commitSha.substring(0, 7)}</code>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Scorecard</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-mono font-bold text-white">{report.score}</span>
                <span className="text-xs text-neutral-500">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabular review stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-neutral-900">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Security Check</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4" /> Passed with Warnings
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Code Quality</span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4" /> Good Structure
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Analysis Time</span>
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              Completed {report.timeCompleted}
            </div>
          </div>
        </div>
      </div>

      {/* Structured Reports Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Summaries */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">AI Summary</h2>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              {report.summary}
            </p>
          </div>

          <div className="border border-neutral-900 bg-neutral-950 p-6 rounded-lg space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Security Audit</h2>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              {report.securitySummary}
            </p>
          </div>
        </div>

        {/* Right Side: Code Inline Comments */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Detailed Code Findings</h2>
          
          <div className="space-y-6">
            {comments.map((comment) => {
              const styles = getSeverityStyles(comment.severity);
              return (
                <div 
                  key={comment.id} 
                  className={`border rounded-lg overflow-hidden bg-neutral-950/40 ${styles.bg}`}
                >
                  {/* File Path Header */}
                  <div className="border-b border-neutral-900 px-4 py-2.5 bg-neutral-950 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                      <FileCode className="w-4 h-4 text-neutral-500" />
                      <span>{comment.filePath} : Line {comment.lineNumber}</span>
                    </div>
                    
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${styles.badge}`}>
                      {comment.severity}
                    </span>
                  </div>

                  {/* Diff Highlight block */}
                  <div className="p-4 bg-black/60 border-b border-neutral-900 overflow-x-auto">
                    <pre className="font-mono text-xs text-neutral-400 space-y-1">
                      {comment.diffContext.map((line, idx) => {
                        const isTarget = line.startsWith(`${comment.lineNumber}:`);
                        return (
                          <div 
                            key={idx} 
                            className={isTarget ? 'bg-neutral-900/60 text-white font-semibold py-0.5 px-2 -mx-2 border-l-2 border-white' : 'px-2'}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>

                  {/* Message body */}
                  <div className="p-4 space-y-3 font-sans">
                    <div className="flex items-start gap-2">
                      {comment.severity === 'error' && <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />}
                      {comment.severity === 'warning' && <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />}
                      {comment.severity === 'info' && <Info className="w-4.5 h-4.5 text-neutral-400 shrink-0 mt-0.5" />}
                      
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {comment.message}
                      </p>
                    </div>

                    {comment.suggestion && (
                      <div className="bg-neutral-950 border border-neutral-900 p-3 rounded font-mono text-xs">
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-1">Recommended Fix</span>
                        <code className="text-neutral-200">{comment.suggestion}</code>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

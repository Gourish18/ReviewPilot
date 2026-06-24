ReviewPilot 🚀

ReviewPilot is an AI-powered Pull Request Review platform that automatically analyzes GitHub Pull Requests, identifies potential security and code quality issues, stores review history, and publishes feedback directly on GitHub.

Features
🔐 GitHub OAuth Authentication
📦 Repository Synchronization
🔗 Repository Connect / Disconnect Controls
🪝 GitHub Webhook Integration
🤖 AI-Powered Code Review using LangGraph + Gemini
🛡️ Security Analysis
🧠 Logic & Maintainability Analysis
💾 Review Persistence with MongoDB
💬 Automatic GitHub PR Comment Publishing
📊 Review History Dashboard
📄 Detailed Review Report Pages
Architecture
GitHub Pull Request
        ↓
GitHub Webhook
        ↓
Express Backend
        ↓
PR Diff Retrieval
        ↓
LangGraph Workflow

 ┌──────────────┐
 │ Triage Node  │
 └──────┬───────┘
        ↓
 ┌──────────────┐
 │ Security Node│
 └──────┬───────┘
        ↓
 ┌──────────────┐
 │  Logic Node  │
 └──────┬───────┘
        ↓
 ┌──────────────┐
 │Aggregation   │
 └──────┬───────┘
        ↓

 Gemini Review
        ↓

 MongoDB Storage
        ↓

 GitHub Comment
Tech Stack
Frontend
Next.js 16
React
TypeScript
Tailwind CSS
TanStack Query
Backend
Node.js
Express.js
TypeScript
MongoDB
Mongoose
JWT Authentication
AI Layer
LangGraph
LangChain
Google Gemini
Integrations
GitHub OAuth
GitHub Webhooks
GitHub REST API
Workflow
Authentication
User Login
    ↓
GitHub OAuth
    ↓
JWT Issued
Repository Setup
Sync Repositories
    ↓
Connect Repository
    ↓
Webhook Registration
Automated Review
Pull Request Opened
    ↓
Webhook Triggered
    ↓
Diff Retrieved
    ↓
AI Analysis
    ↓
Review Stored
    ↓
Comment Posted
Environment Variables

Backend:

PORT=8000

MONGODB_URI=

JWT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

GEMINI_API_KEY=

FRONTEND_URL=http://localhost:3000

Frontend:

NEXT_PUBLIC_API_URL=http://localhost:8000
Installation
Clone Repository
git clone https://github.com/your-username/ReviewPilot.git
cd ReviewPilot
Backend
cd backend

npm install

npm run dev
Frontend
cd frontend

npm install

npm run dev
Key Features Implemented
Authentication
GitHub OAuth Login
JWT Authentication
Protected Routes
Repository Management
Repository Synchronization
Connect / Disconnect Controls
Webhook Processing
Signature Verification
Event Filtering
Pull Request Ingestion
AI Review Pipeline
PR Classification
Security Analysis
Logic Analysis
Markdown Report Generation
Persistence
Review History Storage
Review Status Tracking
Repository Metadata Storage
Publishing
GitHub Comment Creation
Review Report Delivery
Example Review Output
# Pull Request Review Report

## Summary

The reviewed changes are generally well-structured.

## 🛡️ Security Findings

No security vulnerabilities were identified.

## 🧠 Logic & Code Quality Findings

- Debug logging detected.
- Consider removing temporary console statements before merge.

## Recommendation

Approve with Minor Changes
Future Improvements
Inline GitHub Review Comments
Multi-LLM Support
Repository-Level Rules
Team Collaboration Features
Review Analytics Dashboard
Background Job Processing
Review Caching & Deduplication
Author

Gourish Prajapati

Built as a full-stack AI engineering project combining GitHub automation, LangGraph workflows, and LLM-powered code analysis



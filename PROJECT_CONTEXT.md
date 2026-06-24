# ReviewPilot Project Context

This document is written for onboarding and learning. The goal is not only to finish ReviewPilot, but to understand every major backend component well enough to explain it in an interview.

The preferred working style for future phases is:

1. Explain the concepts.
2. Explain the architecture.
3. Explain the implementation plan.
4. Let the primary developer implement it.
5. Review the code afterward.

Do not treat future phases as pure code-generation tasks.

## Project Overview

ReviewPilot is an AI-powered pull request review platform.

It connects to a developer's GitHub account, lets them choose repositories to monitor, and will eventually review pull requests automatically. The intended system will inspect code changes, run an AI review workflow, identify quality and security issues, and show results in both the dashboard and GitHub pull request comments.

The real-world problem it solves is code review bottlenecks. Teams often wait hours or days for feedback, and reviewers may miss security issues, architectural concerns, or subtle logic problems. ReviewPilot is meant to provide fast first-pass feedback so human reviewers can focus on judgment, product context, and final approval.

Someone would use ReviewPilot to:

- Get early feedback before a human review.
- Catch common security and code quality issues.
- Maintain a review history across repositories.
- Automate repetitive review checks.
- Learn from structured code suggestions.

## Current Architecture

### Frontend

The frontend is an existing Next.js application.

Stack:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui-style component patterns
- TanStack Query
- Lucide icons

The frontend is already built and should remain visually intact. Do not redesign pages, change layouts, or alter component structure unless an API integration absolutely requires it.

### Backend

The backend is being migrated to:

- Express.js
- TypeScript
- Node.js

Current backend status: Phase A scaffold exists.

### Database

The database layer is planned as:

- MongoDB Atlas
- Mongoose

MongoDB Atlas is the hosted database service. Mongoose is the object modeling library used to define schemas, validation, indexes, and relationships.

### Authentication

Authentication is planned as:

- GitHub OAuth
- JWT session token for the current frontend flow

The current frontend expects a token stored in browser `localStorage` under:

```text
reviewpilot_token
```

That token is sent to protected API routes as:

```text
Authorization: Bearer <token>
```

### AI

Planned AI components:

- LangGraph for workflow orchestration
- Gemini for code review reasoning

LangGraph will eventually model the review pipeline as nodes, edges, and shared state. Gemini will be used by review agents to inspect diffs and produce structured feedback.

## Current Status

### What Has Been Completed

The frontend UI already exists.

Phase A of the backend migration is complete:

- Express backend folder created.
- TypeScript configured.
- Environment configuration added.
- MongoDB connection helper added.
- Express app setup added.
- Health route added at `GET /health`.

### What Was Migrated From The Previous Architecture

The project was originally described around:

- FastAPI
- Supabase
- PostgreSQL

It is now being migrated to:

- Express.js
- TypeScript
- MongoDB Atlas
- Mongoose
- GitHub OAuth

Frontend user-facing text was updated so the visible architecture language no longer references FastAPI, Supabase, PostgreSQL, Python backend, or Pydantic.

### What Currently Works

Backend:

- The backend can typecheck.
- The Express app can start if `.env` contains a valid `MONGODB_URI`.
- `GET /health` exists.

Frontend:

- The Next.js frontend typecheck passes.
- The Next.js frontend production build passes.
- The UI routes exist.
- Dashboard route protection exists in the frontend auth context.

### What Is Still Missing

Backend:

- User model.
- Repository model.
- GitHub OAuth routes.
- JWT signing and verification.
- Auth middleware.
- Repository sync routes.
- GitHub API integration.
- Webhook handling.
- PR review persistence.
- LangGraph/Gemini review workflow.

Frontend integration:

- Frontend still calls hardcoded backend URLs such as `http://localhost:8000`.
- Login still redirects to `/api/auth/login`, but that route does not exist yet.
- Dashboard auth expects `/api/auth/me`, but that route does not exist yet.
- Repository pages expect repository API routes, but those routes do not exist yet.
- Several dashboard pages still use mock data.

## Frontend Analysis

### Existing Pages And Routes

Frontend route files:

- `frontend/src/app/page.tsx`
  - Public landing page.
- `frontend/src/app/login/page.tsx`
  - GitHub login page.
- `frontend/src/app/auth/callback/page.tsx`
  - OAuth callback page that reads `token` from the URL and stores it.
- `frontend/src/app/dashboard/layout.tsx`
  - Protected dashboard shell.
- `frontend/src/app/dashboard/page.tsx`
  - Dashboard overview.
- `frontend/src/app/dashboard/repos/page.tsx`
  - Repository connection management.
- `frontend/src/app/dashboard/history/page.tsx`
  - Review history page.
- `frontend/src/app/dashboard/settings/page.tsx`
  - Review settings page.
- `frontend/src/app/dashboard/pr/[id]/page.tsx`
  - PR report detail page.

### Existing Routes

Public routes:

- `/`
- `/login`
- `/auth/callback`

Protected dashboard routes:

- `/dashboard`
- `/dashboard/repos`
- `/dashboard/history`
- `/dashboard/settings`
- `/dashboard/pr/[id]`

### Pages That Use Mock Data

Mock data exists in:

- `frontend/src/app/dashboard/page.tsx`
  - Recent pull request audits.
  - Dashboard review metrics.
- `frontend/src/app/dashboard/history/page.tsx`
  - Static audit log entries.
- `frontend/src/app/dashboard/pr/[id]/page.tsx`
  - Static PR report, summaries, and comments.
- `frontend/src/app/dashboard/settings/page.tsx`
  - Local-only settings state.
- `frontend/src/app/page.tsx`
  - Landing page preview/mock UI.

API-backed or intended API-backed pages:

- `frontend/src/app/dashboard/page.tsx`
  - Calls `GET /api/repositories`.
  - Calls `POST /api/repositories/disconnect`.
- `frontend/src/app/dashboard/repos/page.tsx`
  - Calls `GET /api/repositories/github`.
  - Calls `POST /api/repositories/connect`.
  - Calls `POST /api/repositories/disconnect`.
- `frontend/src/context/auth-context.tsx`
  - Calls `GET /api/auth/me`.

### Which Pages Are Protected

Dashboard protection is handled by:

```text
frontend/src/context/auth-context.tsx
```

The check is:

1. On load, read `localStorage.getItem('reviewpilot_token')`.
2. If a token exists, call `GET http://localhost:8000/api/auth/me`.
3. If `/api/auth/me` returns OK, store the user in state.
4. If no user exists after loading, redirect dashboard routes to `/login`.

This means `/dashboard/repos` redirects to `/login` today because the backend does not yet implement token creation or `/api/auth/me`.

## Backend Analysis

### Existing Backend Structure

Current backend files:

- `backend/package.json`
  - Scripts and dependencies.
- `backend/package-lock.json`
  - Installed dependency lockfile.
- `backend/tsconfig.json`
  - TypeScript configuration.
- `backend/.env.example`
  - Environment variable template.
- `backend/src/app.ts`
  - Express app setup.
- `backend/src/server.ts`
  - Server startup and graceful shutdown.
- `backend/src/config/env.ts`
  - Environment loading and validation.
- `backend/src/config/database.ts`
  - MongoDB connection and disconnect helpers.

### Existing Endpoints

Implemented:

```text
GET /health
```

Planned but not implemented yet:

```text
GET /api/auth/login
GET /api/auth/github/callback
GET /api/auth/me
POST /api/auth/logout
GET /api/repositories
GET /api/repositories/github
POST /api/repositories/connect
POST /api/repositories/disconnect
POST /api/repositories/sync
POST /api/webhooks/github
```

### Existing Configuration

Current environment variables:

```text
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=<MongoDB Atlas connection string>
```

Planned future variables:

```text
JWT_SECRET=<secret used to sign app JWTs>
GITHUB_CLIENT_ID=<GitHub OAuth app client id>
GITHUB_CLIENT_SECRET=<GitHub OAuth app client secret>
GITHUB_CALLBACK_URL=http://localhost:8000/api/auth/github/callback
TOKEN_ENCRYPTION_KEY=<key used to encrypt GitHub access tokens>
```

## Development Roadmap

### Phase A: Express Setup, MongoDB Connection, Environment Config

Status: Completed.

What was built:

- A new `backend/` folder.
- Express app setup.
- TypeScript configuration.
- Environment variable loading with `dotenv`.
- Required `MONGODB_URI` validation.
- MongoDB Atlas connection through Mongoose.
- CORS configured for the frontend origin.
- JSON body parsing.
- Health endpoint.
- Graceful shutdown logic.

Why this phase matters:

Every backend needs a stable foundation before adding domain logic. Phase A proves the app can start, read configuration, connect to the database, and respond to a simple request.

### Phase B: User And Repository Models

Goal:

Create the first MongoDB domain models.

Why these models exist:

- `User` represents the developer who signs in with GitHub.
- `Repository` represents a GitHub repository that the user can connect to ReviewPilot.

Expected `User` fields:

- GitHub ID
- GitHub username
- Email
- Avatar URL
- Display name
- Encrypted GitHub access token
- GitHub token scope
- Last login time
- Timestamps

Expected `Repository` fields:

- User ID
- GitHub repository ID
- Owner
- Name
- Full name
- Description
- Language
- Private/public flag
- GitHub HTML URL
- Default branch
- Connection status
- Connected/disconnected timestamps
- Webhook information
- Last synced time
- Timestamps

How MongoDB relationships work here:

MongoDB does not require foreign keys like SQL databases. A repository document stores a `userId` field that references the `_id` of a user document. Mongoose can model this with `ObjectId` and `ref`, but MongoDB itself does not enforce the relationship the way PostgreSQL would.

The important relationship is:

```text
User one-to-many Repository
```

One user can connect many repositories. Each repository document belongs to one user.

### Phase C: GitHub OAuth

Goal:

Allow users to sign in with GitHub.

OAuth flow:

1. User clicks "Continue with GitHub".
2. Frontend redirects to backend `/api/auth/login`.
3. Backend redirects user to GitHub's authorization page.
4. GitHub asks the user to approve access.
5. GitHub redirects back to backend callback URL with a temporary `code`.
6. Backend exchanges the `code` for an access token.
7. Backend calls GitHub API to get user profile data.
8. Backend creates or updates the user in MongoDB.

Authorization code flow:

The browser never receives the GitHub client secret. The backend receives a short-lived code and privately exchanges it for an access token.

Access tokens:

The GitHub access token allows ReviewPilot to call GitHub APIs on behalf of the user. It should be encrypted before being saved to MongoDB.

Callback handling:

The backend callback should finish by redirecting to:

```text
/auth/callback?token=<app-jwt>
```

That shape matches the current frontend.

### Phase D: Authentication

Goal:

Protect backend API routes and make dashboard auth work.

JWT:

A JWT is a signed token containing claims such as the user ID. The frontend sends it on each request. The backend verifies the signature to prove the token was created by the backend.

Middleware:

Auth middleware should:

1. Read the `Authorization` header.
2. Extract the bearer token.
3. Verify the JWT.
4. Load the user from MongoDB.
5. Attach the user to the request.
6. Reject unauthorized requests.

Protected routes:

Routes like `/api/auth/me`, `/api/repositories`, and `/api/repositories/github` should require a valid JWT.

### Phase E: Repository Synchronization

Goal:

Fetch GitHub repositories and merge them with local connection state.

GitHub API:

The backend uses the saved GitHub access token to call GitHub APIs such as listing repositories for the authenticated user.

Repository fetching:

The backend should fetch GitHub repositories, normalize them into the shape the frontend expects, and include whether each repository is already connected.

Database synchronization:

Connecting a repository should create or update a MongoDB repository document. Disconnecting should mark it inactive rather than immediately deleting historical data.

### Phase F: PR Review System

Goal:

Start handling real pull request events.

Webhooks:

GitHub webhooks let GitHub notify ReviewPilot when something happens, such as a pull request being opened or synchronized.

Pull request events:

Important events include:

- `pull_request.opened`
- `pull_request.synchronize`
- `pull_request.reopened`

Review generation:

When a PR event arrives, the backend should fetch changed files and diffs, pass them to the review pipeline, store the result, and optionally publish comments back to GitHub.

### Phase G: LangGraph Workflow

Goal:

Build a structured AI review workflow.

Nodes:

Nodes are individual steps in the graph. Examples:

- Triage node
- Security review node
- Code quality node
- Architecture review node
- Aggregation node

Edges:

Edges define how the workflow moves from one node to another.

State:

State is the shared data passed through the graph, such as PR metadata, diffs, file summaries, findings, and final score.

Review pipeline:

The pipeline should take pull request context as input and produce structured review output that can be saved in MongoDB and shown in the dashboard.

## Learning Notes

### Phase B: User And Repository Models

Concepts to learn first:

- MongoDB documents and collections.
- Mongoose schemas and models.
- ObjectId references.
- Indexes and uniqueness.
- Timestamps.
- Basic data validation.

Files the primary developer should implement:

- `backend/src/models/User.ts`
- `backend/src/models/Repository.ts`

Files AI can safely generate:

- TypeScript interface drafts.
- Example schema field lists.
- Index suggestions.

Common interview questions:

- How is MongoDB different from SQL databases?
- What is a Mongoose schema?
- What is an index and why does it matter?
- How would you model a one-to-many relationship in MongoDB?
- Why store GitHub ID separately from MongoDB `_id`?

Common mistakes:

- Forgetting unique indexes.
- Storing access tokens in plain text.
- Confusing GitHub repository ID with MongoDB document ID.
- Overusing embedded documents when references are better.

### Phase C: GitHub OAuth

Concepts to learn first:

- OAuth 2.0 authorization code flow.
- Redirect URI.
- Client ID vs client secret.
- OAuth scopes.
- CSRF protection with `state`.
- Access token exchange.

Files the primary developer should implement:

- `backend/src/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/githubOAuth.service.ts`

Files AI can safely generate:

- TypeScript types for GitHub API responses.
- Helper function templates.
- Error handling patterns.

Common interview questions:

- What problem does OAuth solve?
- Why should the client secret only live on the backend?
- What is the difference between authentication and authorization?
- What is the OAuth `state` parameter for?
- What should you do with access tokens after receiving them?

Common mistakes:

- Exposing the GitHub client secret to the frontend.
- Skipping `state` validation.
- Forgetting to handle denied authorization.
- Assuming GitHub always returns a public email.

### Phase D: Authentication

Concepts to learn first:

- JWT structure: header, payload, signature.
- Bearer tokens.
- Express middleware.
- Protected routes.
- Token expiration.
- Difference between session tokens and provider access tokens.

Files the primary developer should implement:

- `backend/src/services/token.service.ts`
- `backend/src/middleware/requireAuth.ts`
- `backend/src/types/express.d.ts`

Files AI can safely generate:

- Type definitions.
- Middleware skeletons.
- Error response helpers.

Common interview questions:

- How does JWT verification work?
- What is stored in a JWT payload?
- Why should JWTs expire?
- Where should tokens be stored in a browser?
- What are the risks of localStorage?

Common mistakes:

- Putting secrets or access tokens inside JWT payloads.
- Trusting decoded JWTs without verifying signatures.
- Returning different auth error formats across routes.
- Forgetting to handle missing `Authorization` headers.

### Phase E: Repository Synchronization

Concepts to learn first:

- Calling third-party APIs from a backend.
- GitHub REST API pagination.
- Normalizing external API responses.
- Upsert operations.
- Idempotency.

Files the primary developer should implement:

- `backend/src/services/githubApi.service.ts`
- `backend/src/services/repositorySync.service.ts`
- `backend/src/routes/repository.routes.ts`
- `backend/src/controllers/repository.controller.ts`

Files AI can safely generate:

- GitHub response type drafts.
- Mapping helper functions.
- Test data examples.

Common interview questions:

- Why should GitHub API calls go through the backend?
- What does idempotent mean?
- How do you handle pagination?
- How do you avoid duplicate repositories in the database?
- What happens if GitHub is down?

Common mistakes:

- Not checking that a repository belongs to the authenticated user.
- Treating disconnect as hard delete too early.
- Ignoring GitHub API rate limits.
- Returning GitHub's raw API response directly to the frontend.

### Phase F: PR Review System

Concepts to learn first:

- Webhooks.
- HMAC signature verification.
- Pull request lifecycle.
- Background jobs.
- Review result persistence.

Files the primary developer should implement:

- `backend/src/routes/webhook.routes.ts`
- `backend/src/controllers/webhook.controller.ts`
- Future review models and services.

Files AI can safely generate:

- Webhook event type definitions.
- Example payload summaries.
- Draft persistence schemas.

Common interview questions:

- What is a webhook?
- How do you verify a webhook came from GitHub?
- Why might webhook processing need a background queue?
- What PR events should trigger a review?
- How would you prevent duplicate processing?

Common mistakes:

- Trusting webhook payloads without signature verification.
- Doing slow AI work directly inside the webhook request.
- Not storing event IDs for deduplication.
- Failing to handle repeated GitHub deliveries.

### Phase G: LangGraph Workflow

Concepts to learn first:

- Graph-based workflows.
- Nodes and edges.
- Shared state.
- Agent specialization.
- Structured AI outputs.

Files the primary developer should implement:

- Future LangGraph workflow files.
- Review state definitions.
- Node implementations for review steps.

Files AI can safely generate:

- Prompt drafts.
- Example output schemas.
- Initial node skeletons.

Common interview questions:

- Why use a graph instead of one long prompt?
- What is state in a workflow?
- How do specialized agents improve review quality?
- How do you validate AI output?
- How would you make AI review results reproducible?

Common mistakes:

- Letting prompts become unstructured and hard to test.
- Not validating model output.
- Mixing every review concern into one node.
- Not storing enough context to debug a review later.

## Coding Guidance

For every future phase:

1. Do not immediately generate code.
2. Explain the concepts first.
3. Explain the architecture next.
4. Explain the implementation plan.
5. Let the primary developer implement the first version.
6. Review the implementation afterward.
7. Only generate code when explicitly asked.

The project should be built as a learning path. Each backend component should be understandable, explainable, and interview-ready.

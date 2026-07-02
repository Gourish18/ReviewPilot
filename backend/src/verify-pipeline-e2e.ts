import mongoose from 'mongoose';
import { env } from './config/env.js';
import { compiledReviewWorkflow } from './services/review/nodes/workflow.js';
import { Review } from './models/Review.js';
import { User } from './models/User.js';
import { Repository } from './models/Repository.js';

const runVerification = async () => {
  console.log('Connecting to database...');
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB.');

  // Create a mock user and repository if they don't exist
  let testUser = await User.findOne({ username: 'e2e-pipeline-pilot' });
  if (!testUser) {
    testUser = await User.create({
      githubId: 777777,
      username: 'e2e-pipeline-pilot',
      email: 'e2e@reviewpilot.com',
      avatarUrl: 'https://github.com/avatar.png',
      accessToken: 'mock_token'
    });
  }

  let testRepo = await Repository.findOne({ githubRepoId: 777777 });
  if (!testRepo) {
    testRepo = await Repository.create({
      userId: testUser._id,
      githubRepoId: 777777,
      owner: 'e2e-pipeline-pilot',
      name: 'e2e-test-repo',
      fullName: 'e2e-pipeline-pilot/e2e-test-repo',
      description: 'E2E Validation Repository',
      private: false,
      isConnected: true
    });
  }

  const cases = [
    {
      name: 'PR A: Clean up console.log statements',
      title: 'refactor: remove debugging console statements',
      number: 101,
      description: 'Clean up debug console logs before production merge.',
      filePaths: ['src/controllers/user.controller.ts'],
      diff: `diff --git a/src/controllers/user.controller.ts b/src/controllers/user.controller.ts
index a1b2c3d..e5f6g7h 100644
--- a/src/controllers/user.controller.ts
+++ b/src/controllers/user.controller.ts
@@ -15,5 +15,3 @@ export const getUser = async (req: Request, res: Response) => {
   const user = await UserService.findById(req.params.id);
-  console.log("Fetched user data successfully:", user);
   res.json(user);
 };`
    },
    {
      name: 'PR B: SQL Injection Vulnerability',
      title: 'feat: add user search by username query',
      number: 102,
      description: 'Implement user search functionality using raw SQL query.',
      filePaths: ['src/controllers/search.controller.ts'],
      diff: `diff --git a/src/controllers/search.controller.ts b/src/controllers/search.controller.ts
index f2d3e4b..c5b6a7d 100644
--- a/src/controllers/search.controller.ts
+++ b/src/controllers/search.controller.ts
@@ -10,6 +10,6 @@ export const searchUsers = async (req: Request, res: Response) => {
   const { query } = req.query;
-  // Unsafe query interpolation allowing SQL Injection
-  const sql = \`SELECT * FROM users WHERE username = '\${query}'\`;
-  const users = await db.query(sql);
+  const sql = \`SELECT * FROM users WHERE username = '\${query}'\`;
+  const users = await db.query(sql);
   res.json(users);
 };`
    },
    {
      name: 'PR C: Add React UI Component',
      title: 'feat: add interactive button component with loading state',
      number: 103,
      description: 'Add a reusable React button component with Tailwind styling and loading spinner.',
      filePaths: ['src/components/Button.tsx'],
      diff: `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
new file mode 100644
index 0000000..f3a2b1c
--- /dev/null
+++ b/src/components/Button.tsx
@@ -0,0 +1,22 @@
+import React from 'react';
+
+interface ButtonProps {
+  label: string;
+  isLoading?: boolean;
+  onClick: () => void;
+}
+
+export const Button: React.FC<ButtonProps> = ({ label, isLoading, onClick }) => {
+  return (
+    <button
+      onClick={onClick}
+      disabled={isLoading}
+      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
+    >
+      {isLoading ? (
+        <span className="animate-spin mr-2">⏳</span>
+      ) : null}
+      {label}
+    </button>
+  );
+};`
    }
  ];

  for (const c of cases) {
    console.log('\n==================================================');
    console.log(`Running pipeline check for: ${c.name}`);
    console.log('==================================================');

    const reviewRecord = await Review.create({
      userId: testUser._id,
      repositoryId: testRepo._id,
      prNumber: c.number,
      prTitle: c.title,
      commitSha: `commit_sha_${c.number}_xyz`,
      status: 'pending'
    });

    try {
      const reviewResult = await compiledReviewWorkflow.invoke({
        prTitle: c.title,
        prNumber: c.number,
        repositoryName: testRepo.fullName,
        prDescription: c.description,
        diff: c.diff,
        filePaths: c.filePaths,
        triageCategory: 'general',
        securityFindings: [],
        logicFindings: [],
        finalReviewMarkdown: ''
      });

      console.log(`Pipeline completed successfully for: ${c.name}`);
      console.log(`Resolved Category: ${reviewResult.triageCategory}`);
      console.log(`Security Findings Count: ${reviewResult.securityFindings?.length || 0}`);
      console.log(`Logic Findings Count: ${reviewResult.logicFindings?.length || 0}`);
      console.log('Final Review Markdown Snippet:');
      console.log(reviewResult.finalReviewMarkdown.substring(0, 500) + '\n...');

      await Review.findByIdAndUpdate(reviewRecord._id, {
        status: 'completed',
        triageCategory: reviewResult.triageCategory,
        securityFindings: reviewResult.securityFindings || [],
        logicFindings: reviewResult.logicFindings || [],
        markdownReport: reviewResult.finalReviewMarkdown || ''
      });
      console.log('Persisted completed review to database.');
    } catch (err: any) {
      console.error(`Pipeline execution failed for: ${c.name}`, err);
      await Review.findByIdAndUpdate(reviewRecord._id, {
        status: 'failed'
      });
    }
  }

  console.log('\nE2E Validation Pipeline runs complete. Disconnecting from database...');
  await mongoose.disconnect();
  console.log('Database disconnected.');
};

runVerification().catch(err => {
  console.error('Validation script crash:', err);
  process.exit(1);
});

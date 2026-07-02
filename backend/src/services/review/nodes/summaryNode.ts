import type { ReviewState } from "../reviewState.js";
import { getModelForUser } from "../llm.js";

export const summaryNode = async (
  state: ReviewState
): Promise<Partial<ReviewState>> => {
  const {
    prTitle,
    prNumber,
    repositoryName,
    filePaths,
    diff,
    triageCategory,
    securityFindings,
    logicFindings,
  } = state;

  const filesList = filePaths && filePaths.length > 0 ? filePaths.join(", ") : "None";
  const diffSample = diff ? diff.slice(0, 4000) : "No diff payload provided.";

  const prompt = `
You are a Principal Software Engineer and Open Source Maintainer.
Your task is to produce a high-quality, professional GitHub Pull Request review report based on the provided PR details, code diff, and identified analysis findings.

PR Details:
- Repository Name: ${repositoryName}
- Pull Request Number: #${prNumber}
- PR Title: ${prTitle}
- PR Triage Category: ${triageCategory}
- Changed Files: ${filesList}

Identified Security Findings:
${securityFindings.length > 0 ? securityFindings.map((f, i) => `${i + 1}. ${f}`).join("\n") : "None"}

Identified Logic & Code Quality Findings:
${logicFindings.length > 0 ? logicFindings.map((f, i) => `${i + 1}. ${f}`).join("\n") : "None"}

PR Code Diff Sample:
\`\`\`diff
${diffSample}
\`\`\`

CRITICAL GENERATION RULES:
1. Do not use generic filler sentences. Every sentence must be custom-tailored to this PR.
2. Under "Summary", provide a brief 2-3 sentence overview explaining what this PR specifically does based on the changed files and diff.
3. Under "🛡️ Security Findings", summarize each identified security vulnerability. If there are none, explicitly state "No security vulnerabilities were identified in the reviewed diff."
4. Under "🧠 Logic & Code Quality Findings", describe the logical, performance, or code quality issues found. If there are none, explicitly state "No correctness or maintainability issues were identified."
5. Provide a dynamic "Final Recommendation" based on the severity of the findings:
   - If there are critical or high-severity findings: Recommendation is "Request Changes".
   - If there are only medium or low findings: Recommendation is "Approve with Minor Changes".
   - If there are no findings: Recommendation is "Approve".
6. Provide a "Confidence Score" (a rating from 1 to 5, where 5 is maximum certainty) with a brief 1-sentence explanation of why you selected that score.
7. Return ONLY valid, clean GitHub-ready Markdown. Do not wrap the whole response in markdown code fences (\`\`\`).

Generate the report using the following structure:

# Pull Request Review Report

## Metadata
- **Repository:** ${repositoryName}
- **Pull Request:** #${prNumber} - ${prTitle}
- **Category:** ${triageCategory}
- **Changed Files:** ${filesList}

## Summary
[Provide 2-3 customized sentences summarizing what this PR does and its impact.]

## 🛡️ Security Findings
[Detail each security finding here with its Title, Severity, and Recommended Fix. Or write "No security vulnerabilities were identified in the reviewed diff."]

## 🧠 Logic & Code Quality Findings
[Detail each logic finding here with its Title, and Recommended Fix. Or write "No correctness or maintainability issues were identified."]

## Final Recommendation
**Outcome:** [Approve | Approve with Minor Changes | Request Changes]

## Confidence Score
**Score:** [1-5]/5
*Reason:* [1-sentence explanation]
`;

  const model = await getModelForUser(state.userId);
  const response = await model.invoke(prompt);

  return {
    finalReviewMarkdown: response.content.toString(),
  };
};

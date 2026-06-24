import type { ReviewState } from "../reviewState.js";
import { geminiModel } from "../llm.js";
export const summaryNode = async (
  state: ReviewState
): Promise<Partial<ReviewState>> => {
  const {
    prTitle,
    triageCategory,
    securityFindings,
    logicFindings,
  } = state;

  const hasIssues =
    securityFindings.length > 0 || logicFindings.length > 0;
  const prompt = hasIssues
    ? `
You are a Staff Software Engineer and Open Source Maintainer.

Your task is to produce a professional GitHub Pull Request review based ONLY on the findings provided below.

PR Title:
${prTitle}

PR Category:
${triageCategory}

Security Findings:
${securityFindings.length > 0
      ? securityFindings.map((f) => `- ${f}`).join("\n")
      : "None"
    }

Logic Findings:
${logicFindings.length > 0
      ? logicFindings.map((f) => `- ${f}`).join("\n")
      : "None"
    }

IMPORTANT RULES:

1. Do not invent new findings.
2. Do not speculate about code that was not reviewed.
3. Only summarize the findings provided.
4. Keep the review actionable and concise.
5. Prioritize issues by severity and impact.
6. Maintain a professional and collaborative tone.
7. Assume the author is an experienced engineer.

Generate GitHub-ready Markdown using the following structure:

# Pull Request Review Report

## Summary

Provide a brief 2-3 sentence overview of the review.

## 🛡️ Security Findings

For each security finding:

### Finding Title

**Severity:** Low | Medium | High | Critical

**Why it matters**
Explain the risk.

**Recommended Fix**
Provide a specific action the developer can take.

If there are no security findings, write:

"No security vulnerabilities were identified in the reviewed diff."

## 🧠 Logic & Code Quality Findings

For each logic finding:

### Finding Title

**Why it matters**
Explain the impact.

**Recommended Fix**
Provide a specific improvement.

If there are no logic findings, write:

"No correctness or maintainability issues were identified."

## Final Recommendation

Provide one of:

* Approve
* Approve with Minor Changes
* Request Changes

Base the recommendation only on the findings above.

Return only valid GitHub Markdown.
`  : `
You are a Staff Software Engineer reviewing a Pull Request.

PR Title:
${prTitle}

PR Category:
${triageCategory}

The review process did not identify any security, correctness, reliability, performance, or maintainability concerns.

Generate a concise GitHub-ready Markdown review.

Requirements:

# Pull Request Review Report

## Summary

Briefly summarize the change.

## Review Outcome

State that no significant issues were detected in the reviewed diff.

Mention that:

* No security vulnerabilities were identified.
* No correctness issues were identified.
* No maintainability concerns were identified.

## Recommendation

Approve

## Note

Encourage normal human review and testing before merge.

Tone:

* Professional
* Positive
* Supportive

Return only valid GitHub Markdown.
`;

  const response = await geminiModel.invoke(prompt);

  return {
    finalReviewMarkdown: response.content.toString(),
  };

};

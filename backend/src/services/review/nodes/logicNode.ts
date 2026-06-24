import { z } from "zod";
import type { ReviewState } from "../reviewState.js";
import { geminiModel } from "../llm.js";

const schema = z.object({
    findings: z
        .array(z.string())
        .describe(
            "A list of logic, correctness, and architecture issues found in the code. Empty array if none."
        ),
});

const structuredLlm = geminiModel.withStructuredOutput(schema);

export const logicNode = async (
    state: ReviewState
): Promise<Partial<ReviewState>> => {
    const diffSample = state.diff.slice(0, 8000);

    const prompt = `
You are a Staff Software Engineer performing a pull request review.

Your job is to review ONLY the code that appears in the provided diff.

CRITICAL RULES:

1. Do NOT speculate about code that is not visible in the diff.
2. Do NOT assume the existence of databases, APIs, secrets, authentication systems, or infrastructure unless they explicitly appear in the diff.
3. Every finding must be directly supported by evidence from the diff.
4. If a finding cannot be tied to a specific changed line, do NOT report it.
5. If the diff introduces no correctness, maintainability, architecture, or performance concerns, return an empty findings array.
6. Prefer precision over coverage. False positives are worse than missing a minor issue.
7. Do not provide generic best practices.
8. Do not suggest improvements unrelated to the changed code.

Review for:

CORRECTNESS

* Off-by-one errors
* Incorrect conditions
* Broken logic
* Invalid assumptions
* State management issues
* Race conditions
* Concurrency problems

RELIABILITY

* Missing error handling
* Unhandled promise rejections
* Null/undefined risks
* Resource leaks
* Failure scenarios

PERFORMANCE

* Unnecessary re-renders
* Expensive computations
* Memory leaks
* Inefficient loops
* Network inefficiencies

MAINTAINABILITY

* Fragile design
* Code duplication
* Poor abstractions
* Hard-to-maintain implementations

ARCHITECTURE

* Violations of existing patterns
* Tight coupling
* Incorrect layering
* Dependency misuse

For every finding include:

* title
* severity (low | medium | high)
* evidence (exact code snippet from the diff)
* explanation
* recommended fix

If no legitimate issues are found, return:

{
"findings": []
}

Pull Request Category:
${state.triageCategory}

Code Diff:
${diffSample}

`;

    const response = await structuredLlm.invoke(prompt);

    return {
        logicFindings: response.findings,
    };
};
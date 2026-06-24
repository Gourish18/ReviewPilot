import { z } from "zod"
import type { ReviewState } from "../reviewState.js"
import { geminiModel } from "../llm.js"
const schema = z.object({
    findings: z.array(z.string()).describe("A list of security vulnerabilities found in the code. Empty array if none."),
});
const structuredLlm = geminiModel.withStructuredOutput(schema);
export const securityNode = async (state: ReviewState): Promise<Partial<ReviewState>> => {
    const diffSample = state.diff.slice(0, 8000);

    const prompt = `
You are a Senior Application Security Engineer performing a pull request security review.

Your responsibility is to identify REAL security vulnerabilities introduced or exposed by the code changes in the provided diff.

CRITICAL RULES:

1. Review ONLY the code visible in the diff.
2. Do NOT speculate about files, systems, APIs, databases, infrastructure, or authentication flows that are not shown.
3. Every finding must be supported by direct evidence from the diff.
4. If evidence is not present in the diff, do NOT report the issue.
5. False positives are worse than missing a minor issue.
6. Do NOT provide generic security advice.
7. Do NOT report theoretical vulnerabilities without proof.
8. If no legitimate security issues are found, return an empty findings array.

Analyze the diff for:

INPUT VALIDATION

* SQL Injection
* NoSQL Injection
* Command Injection
* LDAP Injection
* Path Traversal
* SSRF

AUTHENTICATION & AUTHORIZATION

* Missing authorization checks
* Privilege escalation
* Broken access control
* IDOR vulnerabilities
* Authentication bypasses

SECRETS & SENSITIVE DATA

* Hardcoded credentials
* API keys
* Tokens
* Secrets committed to source control
* Sensitive information leakage

WEB SECURITY

* Cross-Site Scripting (XSS)
* CSRF vulnerabilities
* Open Redirects
* Unsafe HTML rendering

CRYPTOGRAPHY

* Weak hashing
* Weak encryption
* Insecure token handling
* Hardcoded cryptographic keys

APPLICATION SECURITY

* Unsafe deserialization
* Prototype pollution
* Security misconfigurations
* Dangerous dependency usage
* Insecure file handling

For EACH finding return:

{
"title": "Short vulnerability title",
"severity": "low | medium | high | critical",
"evidence": "Exact code snippet from the diff",
"explanation": "Why this is a vulnerability",
"impact": "Potential security impact",
"recommendation": "Concrete fix"
}

IMPORTANT:

If the diff only contains:

* logging statements
* comments
* formatting changes
* refactoring without security impact
* variable renames
* UI text changes

then return:

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
        securityFindings: response.findings,
    };
};   

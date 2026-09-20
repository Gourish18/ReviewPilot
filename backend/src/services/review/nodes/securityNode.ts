import { z } from "zod"
import type { ReviewState } from "../reviewState.js"
import { getModelForUser } from "../llm.js"
import { UserSettings } from "../../../models/UserSettings.js"
const securityFindingSchema = z.object({
    title: z.string().describe("Short vulnerability title"),
    severity: z.string().describe("Severity: low, medium, high, or critical"),
    evidence: z.string().describe("Exact code snippet from the diff"),
    explanation: z.string().describe("Explanation of why this is a vulnerability"),
    impact: z.string().optional().describe("Potential security impact"),
    recommendation: z.string().describe("Concrete fix"),
});

const schema = z.object({
    findings: z.array(securityFindingSchema).describe("A list of security vulnerabilities found in the code. Empty array if none."),
});

export const securityNode = async (state: ReviewState): Promise<Partial<ReviewState>> => {
    console.log(`[Security] START ${new Date().toISOString()}`);
    if (state.userId) {
        const settings = await UserSettings.findOne({ userId: state.userId });
        if (settings && settings.enableSecurityReview === false) {
            console.log('Skipping security review: disabled in user settings.');
            console.log(`[Security] END ${new Date().toISOString()}`);
            return { securityFindings: [] };
        }
    }

    const model = await getModelForUser(state.userId);
    const diffSample = state.diff ? state.diff.slice(0, 8000) : "";

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

INPUT VALIDATION:
* SQL Injection
* NoSQL Injection
* Command Injection
* LDAP Injection
* Path Traversal
* SSRF

AUTHENTICATION & AUTHORIZATION:
* Missing authorization checks
* Privilege escalation
* Broken access control
* IDOR vulnerabilities
* Authentication bypasses

SECRETS & SENSITIVE DATA:
* Hardcoded credentials
* API keys
* Tokens
* Secrets committed to source control
* Sensitive information leakage

WEB SECURITY:
* Cross-Site Scripting (XSS)
* CSRF vulnerabilities
* Open Redirects
* Unsafe HTML rendering

CRYPTOGRAPHY:
* Weak hashing
* Weak encryption
* Insecure token handling
* Hardcoded cryptographic keys

APPLICATION SECURITY:
* Unsafe deserialization
* Prototype pollution
* Security misconfigurations
* Dangerous dependency usage
* Insecure file handling

Pull Request Category:
${state.triageCategory}

Code Diff:
${diffSample}
`;

    let findings: string[] = [];
    try {
        const structuredLlm = model.withStructuredOutput(schema);
        const response = await structuredLlm.invoke(prompt);
        if (response && Array.isArray(response.findings)) {
            findings = response.findings.map((f: any) => typeof f === 'string' ? f : JSON.stringify(f));
        }
    } catch (err: any) {
        console.warn('[Security Node] Structured output parsing fallback:', err.message);
        try {
            const textResponse = await model.invoke(prompt + "\n\nRespond with security findings or indicate none.");
            const text = textResponse.content.toString();
            if (text && !text.toLowerCase().includes("no issues found") && !text.toLowerCase().includes("no vulnerabilities")) {
                findings = [text.slice(0, 1000)];
            }
        } catch (fallbackErr) {
            console.error('[Security Node] Fallback failed:', fallbackErr);
        }
    }

    console.log(`[Security] END ${new Date().toISOString()}`);
    return {
        securityFindings: findings,
    };
};   

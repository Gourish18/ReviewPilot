// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { env } from "../../config/env.js";

// const isMockKey = 
//   !env.geminiApiKey || 
//   env.geminiApiKey.startsWith("mock_") || 
//   !env.geminiApiKey.startsWith("AIzaSy");

// // High-fidelity Mock LLM for offline testing and local sandbox environments
// class MockGoogleGenerativeAI {
//   async invoke(prompt: string) {
//     const trimmedPrompt = prompt.trim();

//     if (trimmedPrompt.includes("classify the pull request into exactly ONE category") || trimmedPrompt.includes("triage")) {
//       return {
//         content: "backend",
//         toString() {
//           return "backend";
//         }
//       };
//     }

//     if (trimmedPrompt.includes("No security or logic issues") || trimmedPrompt.includes("congratulate")) {
//       return {
//         content: `# Pull Request Review Summary\n\n🎉 **Congratulations!** No significant security, correctness, or maintainability issues were detected in this pull request. The code looks clean and well-structured.\n\n### Next Steps\n- Please ensure a human reviewer does a sanity check before merging.`,
//         toString() {
//           return this.content;
//         }
//       };
//     }

//     // Default to summary markdown with findings
//     return {
//       content: `# Pull Request Review Report

// Thank you for the contribution. Here is a summary of the automated review findings for this pull request.

// ## 🛡️ Security Vulnerabilities
// - **Issue**: Inline fallback credentials.
//   - **Why it matters**: Defining inline fallback credentials poses a risk of accidental commits of test secrets.
//   - **Actionable fix**: Fetch the credentials from configuration settings or environment variables.
// - **Issue**: Parameterization of database queries.
//   - **Why it matters**: Unvalidated query inputs can lead to injection risks.
//   - **Actionable fix**: Ensure all database query inputs are parameterized and sanitized.

// ## 🧠 Logic & Code Quality Improvements
// - **Issue**: Untyped API response contracts.
//   - **Why it matters**: Returning unstructured objects makes the API less predictable and harder to maintain.
//   - **Actionable fix**: Define typed response contracts for all API endpoints.
// - **Issue**: Error handling for async operations.
//   - **Why it matters**: Missing error handlers in asynchronous flows can result in unhandled promise rejections.
//   - **Actionable fix**: Wrap asynchronous blocks in robust try/catch blocks.`,
//       toString() {
//         return this.content;
//       }
//     };
//   }

//   withStructuredOutput(schema: any) {
//     return {
//       invoke: async (prompt: string) => {
//         if (prompt.includes("security") || prompt.includes("Security")) {
//           return {
//             findings: [
//               "Avoid defining inline fallback strings for credentials. Even if it is a local key, it should be fetched from configuration settings or standard environment loaders.",
//               "Ensure NoSQL and database queries are fully parameterized and validated to prevent injection vulnerabilities."
//             ]
//           };
//         } else {
//           return {
//             findings: [
//               "Consider defining typed response contracts for API endpoints rather than returning unstructured objects.",
//               "Ensure all asynchronous operations are wrapped in try/catch blocks with proper error handling and logging to prevent unhandled rejections."
//             ]
//           };
//         }
//       }
//     };
//   }
// }

// export const geminiModel = isMockKey
//   ? (new MockGoogleGenerativeAI() as unknown as ChatGoogleGenerativeAI)
//   : new ChatGoogleGenerativeAI({
//       apiKey: env.geminiApiKey,
//       model: "gemini-2.5-flash",
//       temperature: 0.1
//     });

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../../config/env.js";

const isMockKey =
  !env.geminiApiKey ||
  env.geminiApiKey.startsWith("mock_") ||
  !env.geminiApiKey.startsWith("AIzaSy");

/**
 * High-fidelity mock model for local development.
 * Simulates realistic triage, security analysis,
 * logic analysis, and markdown review generation.
 */
class MockGoogleGenerativeAI {
  async invoke(prompt: string) {
    const lowerPrompt = prompt.toLowerCase();

    // =========================
    // TRIAGE NODE
    // =========================
    if (
      lowerPrompt.includes("classify the pull request") ||
      lowerPrompt.includes("valid categories")
    ) {
      if (
        lowerPrompt.includes(".tsx") ||
        lowerPrompt.includes(".jsx") ||
        lowerPrompt.includes("react") ||
        lowerPrompt.includes("next.js") ||
        lowerPrompt.includes("tailwind")
      ) {
        return {
          content: "frontend",
          toString() {
            return "frontend";
          },
        };
      }

      if (
        lowerPrompt.includes("express") ||
        lowerPrompt.includes("mongoose") ||
        lowerPrompt.includes("controller") ||
        lowerPrompt.includes("service") ||
        lowerPrompt.includes("mongodb") ||
        lowerPrompt.includes("jwt")
      ) {
        return {
          content: "backend",
          toString() {
            return "backend";
          },
        };
      }

      if (
        lowerPrompt.includes("docker") ||
        lowerPrompt.includes("terraform") ||
        lowerPrompt.includes("github/workflows") ||
        lowerPrompt.includes("kubernetes")
      ) {
        return {
          content: "infrastructure",
          toString() {
            return "infrastructure";
          },
        };
      }

      if (
        lowerPrompt.includes("readme") ||
        lowerPrompt.includes(".md") ||
        lowerPrompt.includes("documentation")
      ) {
        return {
          content: "docs",
          toString() {
            return "docs";
          },
        };
      }

      return {
        content: "general",
        toString() {
          return "general";
        },
      };
    }

    // =========================
    // AGGREGATION NODE
    // =========================
    if (
      lowerPrompt.includes("generate github-ready markdown review") ||
      lowerPrompt.includes("pull request review report")
    ) {
      const hasFindings =
        lowerPrompt.includes("security findings:") &&
        !lowerPrompt.includes("security findings:\nnone");

      if (!hasFindings) {
        return {
          content: `# Pull Request Review Report

## Summary

The reviewed changes appear focused and well-scoped.

## 🛡️ Security Findings

No security vulnerabilities were identified in the reviewed diff.

## 🧠 Logic & Code Quality Findings

No correctness or maintainability concerns were identified.

## Recommendation

✅ Approve

## Note

Normal testing and human review are still recommended before merge.`,
          toString() {
            return this.content;
          },
        };
      }

      return {
        content: `# Pull Request Review Report

## Summary

Several findings were identified during automated review.

## 🛡️ Security Findings

Please review the reported security observations and verify they are addressed before merging.

## 🧠 Logic & Code Quality Findings

The reviewed changes contain areas that could benefit from additional validation and maintainability improvements.

## Recommendation

⚠️ Approve with Minor Changes`,
        toString() {
          return this.content;
        },
      };
    }

    return {
      content: "No findings.",
      toString() {
        return "No findings.";
      },
    };
  }

  withStructuredOutput(_schema: any) {
    return {
      invoke: async (prompt: string) => {
        const lowerPrompt = prompt.toLowerCase();

        // =========================
        // SECURITY NODE
        // =========================
        if (
          lowerPrompt.includes("security engineer") ||
          lowerPrompt.includes("security vulnerabilities")
        ) {
          const findings: string[] = [];

          if (
            lowerPrompt.includes("apikey") ||
            lowerPrompt.includes("api_key") ||
            lowerPrompt.includes("secret") ||
            lowerPrompt.includes("password") ||
            lowerPrompt.includes("token =")
          ) {
            findings.push(
              "Potential hardcoded credential detected. Verify that secrets are loaded from environment variables or a secure secret manager."
            );
          }

          if (
            lowerPrompt.includes("innerhtml") ||
            lowerPrompt.includes("dangerouslysetinnerhtml")
          ) {
            findings.push(
              "Potential XSS risk detected through unsafe HTML rendering."
            );
          }

          if (
            lowerPrompt.includes("eval(") ||
            lowerPrompt.includes("exec(")
          ) {
            findings.push(
              "Potential command execution risk detected. Avoid executing dynamic input."
            );
          }

          return { findings };
        }

        // =========================
        // LOGIC NODE
        // =========================
        const findings: string[] = [];

        if (
          lowerPrompt.includes("while(true)") ||
          lowerPrompt.includes("for(;;)")
        ) {
          findings.push(
            "Potential infinite loop detected. Ensure loop termination conditions are guaranteed."
          );
        }

        if (
          lowerPrompt.includes(".then(") &&
          !lowerPrompt.includes(".catch(")
        ) {
          findings.push(
            "Asynchronous operation may be missing explicit error handling."
          );
        }

        if (
          lowerPrompt.includes("console.log(")
        ) {
          findings.push(
            "Debug logging detected. Consider removing temporary console statements before merging."
          );
        }

        return { findings };
      },
    };
  }
}

export const geminiModel = isMockKey
  ? (new MockGoogleGenerativeAI() as unknown as ChatGoogleGenerativeAI)
  : new ChatGoogleGenerativeAI({
    apiKey: env.geminiApiKey,
    model: "gemini-2.5-flash",
    temperature: 0.1,
  });



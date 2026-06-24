import type { ReviewState } from "../reviewState.js";
import { geminiModel } from "../llm.js";
const VALID_CATEGORIES = [
    "frontend",
    "backend",
    "infrastructure",
    "docs",
    "general",
];
export const triageNode = async (state: ReviewState): Promise<Partial<ReviewState>> => {
    const { prTitle, prDescription, diff, filePaths } = state;
    const diffSample = diff.slice(0, 2000);
    const filesList = filePaths && filePaths.length > 0 ? filePaths.join("\n") : "No file paths provided.";
    const prompt = `
You are a Senior Engineering Manager responsible for triaging pull requests.

Your task is to classify the pull request into EXACTLY ONE category.

Available categories:

* frontend
* backend
* infrastructure
* docs
* general

Classification Guidelines:

frontend:

* React, Next.js, Vue, Angular
* HTML, CSS, Tailwind, UI components
* Client-side JavaScript or TypeScript
* User experience, styling, rendering
* Browser APIs

backend:

* Node.js, Express, NestJS
* Java, Spring Boot
* Python APIs
* Authentication
* Authorization
* Business logic
* Databases
* REST APIs
* GraphQL
* Server-side TypeScript

infrastructure:

* Docker
* Kubernetes
* Terraform
* CI/CD
* GitHub Actions
* Deployment
* Monitoring
* Logging
* Cloud configuration
* Environment configuration
* Build pipelines

docs:

* README changes
* Documentation
* Comments only
* Markdown files
* API documentation

general:

* Mixed changes spanning multiple categories
* Refactoring with no dominant category
* Small utility changes
* Unable to confidently classify

IMPORTANT RULES:

1. Prioritize the changed files list above the raw diff and PR title/description.
2. Prioritize the actual diff over the title.
3. Prioritize changed files over the PR description.
4. Classify based on where the majority of the changed code lives.
5. Ignore commit messages and branch names.
6. If multiple categories appear, choose the dominant one.
7. If confidence is low, return "general".
8. Return exactly one category.
9. Do not explain your reasoning.
10. Do not output markdown.
11. Do not output punctuation.

PR Title:
${prTitle}

PR Description:
${prDescription}

Changed Files List:
${filesList}

Diff Sample:
${diffSample}

Respond with exactly one of:

frontend
backend
infrastructure
docs
general

`;
    const response = await geminiModel.invoke(prompt);
    const category = response.content.toString().trim().toLowerCase();

    return {
        triageCategory: VALID_CATEGORIES.includes(
            category as (typeof VALID_CATEGORIES)[number]
        ) ? category : "general",
    };

};
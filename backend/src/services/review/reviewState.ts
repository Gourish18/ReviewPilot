import { Annotation } from "@langchain/langgraph"

export const ReviewStateAnnotation = Annotation.Root({
    prTitle: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => ""
    }),
    prNumber: Annotation<number>({
        reducer: (x, y) => y ?? x,
        default: () => 0
    }),
    repositoryName: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => ""
    }),
    prDescription: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),

    diff: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),

    filePaths: Annotation<string[]>({
        reducer: (x, y) => y ?? x,
        default: () => [],
    }),

    triageCategory: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "general",
    }),

    securityFindings: Annotation<string[]>({
        reducer: (a, b) => a.concat(b),
        default: () => [],
    }),

    logicFindings: Annotation<string[]>({
        reducer: (a, b) => a.concat(b),
        default: () => [],
    }),

    finalReviewMarkdown: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),


})
export type ReviewState = typeof ReviewStateAnnotation.State;
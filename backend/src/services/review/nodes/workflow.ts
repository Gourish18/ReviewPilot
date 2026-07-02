import { StateGraph, START, END } from "@langchain/langgraph";
import { ReviewStateAnnotation } from "../reviewState.js";

import { triageNode } from "../nodes/triageNode.js";
import { securityNode } from "../nodes/securityNode.js";
import { logicNode } from "../nodes/logicNode.js";
import { summaryNode } from "../nodes/summaryNode.js";

const workflow = new StateGraph(ReviewStateAnnotation)
    .addNode("triage", triageNode)
    .addNode("security", securityNode)
    .addNode("logic", logicNode)
    .addNode("summary", summaryNode)
    .addEdge(START, "triage")
    .addEdge("triage", "security")
    .addEdge("security", "logic")
    .addEdge("logic", "summary")
    .addEdge("summary", END);

export const compiledReviewWorkflow = workflow.compile();

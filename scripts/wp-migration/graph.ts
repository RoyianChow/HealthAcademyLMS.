import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { authenticateNode } from "./nodes/authenticate";
import { createStripePlaceholdersNode } from "./nodes/create-stripe-placeholders";
import { fetchContentNode } from "./nodes/fetch-content";
import { fetchCoursesNode } from "./nodes/fetch-courses";
import { fetchQuizzesNode } from "./nodes/fetch-quizzes";
import {
  humanGate1Node,
  routeAfterGate1,
} from "./nodes/human-gate-1";
import { humanGate2Node } from "./nodes/human-gate-2";
import { uploadMediaNode } from "./nodes/upload-media";
import { writeCurriculumNode } from "./nodes/write-curriculum";
import { writeQuizzesNode } from "./nodes/write-quizzes";
import { MigrationAnnotation } from "./state";

const workflow = new StateGraph(MigrationAnnotation)
  .addNode("authenticate", authenticateNode)
  .addNode("fetchCourses", fetchCoursesNode)
  .addNode("fetchContent", fetchContentNode)
  .addNode("fetchQuizzes", fetchQuizzesNode)
  .addNode("humanGate1", humanGate1Node)
  .addNode("uploadMedia", uploadMediaNode)
  .addNode("createStripePlaceholders", createStripePlaceholdersNode)
  .addNode("writeCurriculum", writeCurriculumNode)
  .addNode("writeQuizzes", writeQuizzesNode)
  .addNode("humanGate2", humanGate2Node)
  .addEdge(START, "authenticate")
  .addEdge("authenticate", "fetchCourses")
  .addEdge("fetchCourses", "fetchContent")
  .addEdge("fetchContent", "fetchQuizzes")
  .addEdge("fetchQuizzes", "humanGate1")
  .addConditionalEdges("humanGate1", routeAfterGate1, {
    uploadMedia: "uploadMedia",
    __end__: END,
  })
  .addEdge("uploadMedia", "createStripePlaceholders")
  .addEdge("createStripePlaceholders", "writeCurriculum")
  .addEdge("writeCurriculum", "writeQuizzes")
  .addEdge("writeQuizzes", "humanGate2")
  .addEdge("humanGate2", END);

export const checkpointer = new MemorySaver();

export const compiledGraph = workflow.compile({ checkpointer });
